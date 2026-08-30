/**
 * Base AI Agent Class
 * 
 * Provides unified execution, dynamic model resolution, streaming progress events,
 * schema validation, and autonomous escalation across all specialized course engine agents.
 */

import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'
import { extractJsonFromText } from '@/lib/ai/client'
import { classifyError, logAIRequest } from '@/lib/ai/observability'
import { validateBySchema, type SchemaName } from '@/lib/ai/schemaValidator'
import { recordSuccess, recordFailure, type RecordableErrorType, type AIProvider } from '@/lib/ai/providerHealth'
import { aiPlatformConfigService } from '@/services/aiPlatformConfigService'
import { aiAgentPolicyService } from '@/services/aiAgentPolicyService'
import { modelRegistry } from './modelRegistry'
import type {
  AgentExecutionResult,
  AgentRole,
  ModelCostTier,
  ModelProvider,
  PipelineEventListener,
  PipelinePhase,
  PipelineProgressEvent,
  TaskCapabilityRequirement,
} from './types'

export interface AgentExecutionOptions {
  pipelineRunId?: string
  phase?: PipelinePhase
  systemPromptOverride?: string
  preferredModel?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  /**
   * When set, the parsed JSON is structurally validated against this schema
   * (see schemaValidator). A shape mismatch is treated as a model failure so
   * the cascade falls through to the next model instead of returning
   * well-formed-but-wrong-shape data to the caller.
   */
  schema?: SchemaName
  requiresArabic?: boolean
  timeoutMs?: number
  silent?: boolean
  onProgress?: PipelineEventListener
}

export abstract class BaseAIAgent<TInput = unknown, TOutput = unknown> {
  public abstract readonly role: AgentRole
  public abstract readonly name: string
  public abstract readonly nameAr: string
  public abstract readonly defaultSystemPrompt: string

  /**
   * Primary abstract entrypoint for domain-specific agent logic
   */
  public abstract process(
    input: TInput,
    options?: AgentExecutionOptions
  ): Promise<AgentExecutionResult<TOutput>>

  /**
   * Protected helper to execute LLM prompt through dynamic multi-provider router
   */
  protected async executePrompt<T = TOutput>(
    prompt: string,
    options: AgentExecutionOptions = {},
    customRequirements?: Partial<TaskCapabilityRequirement>
  ): Promise<AgentExecutionResult<T>> {
    const startTime = Date.now()
    const pipelineRunId = options.pipelineRunId || crypto.randomUUID()
    const phase = options.phase || 'content_synthesis'
    const systemPrompt = options.systemPromptOverride || this.defaultSystemPrompt

    // Per-agent admin policy (Gap D). Cached rows are loaded by the orchestrator;
    // trigger a best-effort background load for standalone agent calls.
    if (!aiAgentPolicyService.isLoaded()) void aiAgentPolicyService.load()
    const agentPolicy = aiAgentPolicyService.getAgentPolicy(this.role)
    if (agentPolicy.enabled === false) {
      throw new Error(`[${this.name}] Agent "${this.role}" is disabled by admin policy (ai_agent_policies).`)
    }

    // force_model_id wins over an ad-hoc preferredModel; excluded models are
    // stripped from the resolved cascade.
    const effectivePreferredModel = agentPolicy.forceModelId || options.preferredModel

    // Resolve dynamic candidate models
    let cascade = modelRegistry.resolveModelCascade(
      this.role,
      customRequirements,
      effectivePreferredModel
    )
    if (agentPolicy.disabledModelIds.length > 0) {
      const excluded = new Set(agentPolicy.disabledModelIds)
      const filtered = cascade.filter((id) => !excluded.has(id))
      if (filtered.length > 0) cascade = filtered
    }

    if (!options.silent) {
      this.emitEvent(options.onProgress, {
        pipelineRunId,
        phase,
        agentRole: this.role,
        status: 'running',
        progressPercentage: 10,
        title: this.name,
        titleAr: this.nameAr,
        detail: `Initializing ${this.name} using prioritized free cascade (${cascade[0] || 'auto'})...`,
        detailAr: `بدء تشغيل ${this.nameAr}...`,
        timestamp: new Date().toISOString(),
      })
    }

    let lastError: Error | null = null
    let failoverCount = 0

    // Admin "Spend & QA Caps" tab → per-candidate transient-error retries.
    // A per-agent max_retries_override (Agent Policies tab) takes precedence.
    const maxRetries = Math.max(0, Math.min(5,
      agentPolicy.maxRetriesOverride ?? aiPlatformConfigService.getCached().maxRetries ?? 2))
    const TRANSIENT: ReadonlySet<string> = new Set(['rate_limit', 'timeout', 'provider_error', 'empty_response'])

    for (let i = 0; i < cascade.length; i++) {
      const modelId = cascade[i]
      const modelMeta = modelRegistry.getModelMetadata(modelId)
      const provider = (modelMeta?.provider || 'openrouter') as ModelProvider
      const costTier = (modelMeta?.costTier || 'free') as ModelCostTier
      const attemptStart = Date.now()

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await multiProviderRouter.execute<T>(prompt, {
          task: this.mapRoleToTaskCategory(this.role),
          capability: agentPolicy.capabilityOverride ?? this.mapRoleToCapability(this.role, options),
          agentRole: this.role,
          preferredModel: modelId,
          systemPrompt,
          temperature: options.temperature ?? agentPolicy.temperatureOverride ?? 0.5,
          maxTokens: options.maxTokens ?? 3000,
          jsonMode: options.jsonMode ?? false,
          timeoutMs: options.timeoutMs ?? 30000,
          onFailover: (fromP, toP, reason) => {
            if (!options.silent) {
              this.emitEvent(options.onProgress, {
                pipelineRunId,
                phase,
                agentRole: this.role,
                status: 'retrying',
                progressPercentage: 40,
                title: this.name,
                titleAr: this.nameAr,
                detail: `Failover from ${fromP} to ${toP}: ${reason}`,
                detailAr: `التحويل التلقائي للنموذج البديل: ${reason}`,
                timestamp: new Date().toISOString(),
              })
            }
          },
        })

        let finalData = response.data as T
        if (options.jsonMode && typeof response.data === 'string') {
          const parsed = extractJsonFromText<T>(response.data)
          if (parsed !== null) {
            finalData = parsed
          }
        }

        // In JSON mode, a response that still isn't an object means the model
        // returned truncated / malformed JSON. Treat it as a failure so the
        // cascade retries on the next model instead of handing a raw string
        // back to the caller (which then crashes on `.modules`, `.questions`, …).
        if (options.jsonMode && (finalData === null || finalData === undefined || typeof finalData !== 'object')) {
          throw new Error('Unparseable JSON: model returned truncated or malformed output in JSON mode')
        }

        // Structural schema check — a well-formed-but-wrong-shape response is a
        // model failure, not a success. Cascade to the next model.
        if (options.schema) {
          const check = validateBySchema(options.schema, finalData)
          if (!check.valid) {
            throw new Error(`Schema "${options.schema}" validation failed: ${check.errors.slice(0, 3).join('; ')}`)
          }
        }

        recordSuccess(response.providerUsed as AIProvider)

        const latencyMs = Date.now() - startTime

        logAIRequest({
          pipelineRunId,
          agentRole: this.role,
          taskType: this.mapRoleToTaskCategory(this.role),
          provider: response.providerUsed,
          modelUsed: response.modelUsed,
          startedAt: attemptStart,
          durationMs: Date.now() - attemptStart,
          promptChars: prompt.length + (systemPrompt?.length ?? 0),
          completionChars: (response.rawText || '').length,
          success: true,
          retryCount: i,
          fallbackCount: response.failoverCount ?? 0,
          metadata: { requestedModel: modelId },
        })

        if (!options.silent) {
          this.emitEvent(options.onProgress, {
            pipelineRunId,
            phase,
            agentRole: this.role,
            status: 'completed',
            progressPercentage: 100,
            title: this.name,
            titleAr: this.nameAr,
            detail: `Completed successfully via ${response.providerUsed} (${response.modelUsed}) in ${latencyMs}ms.`,
            detailAr: `تم الإنجاز بنجاح عبر ${response.modelUsed}.`,
            modelUsed: response.modelUsed,
            providerUsed: response.providerUsed as ModelProvider,
            latencyMs,
            timestamp: new Date().toISOString(),
          })
        }

        return {
          agentRole: this.role,
          success: true,
          data: finalData,
          rawOutput: response.rawText,
          modelUsed: response.modelUsed,
          providerUsed: response.providerUsed as ModelProvider,
          costTier,
          estimatedCostUSD: costTier === 'free' ? 0 : 0.002,
          latencyMs,
        }
      } catch (err: unknown) {
        failoverCount++
        lastError = err instanceof Error ? err : new Error(String(err))
        const errType = classifyError(lastError.message)
        recordFailure(provider as AIProvider, errType as RecordableErrorType, { errorMessage: lastError.message })
        logAIRequest({
          pipelineRunId,
          agentRole: this.role,
          taskType: this.mapRoleToTaskCategory(this.role),
          provider,
          modelUsed: modelId,
          startedAt: attemptStart,
          durationMs: Date.now() - attemptStart,
          promptChars: prompt.length + (systemPrompt?.length ?? 0),
          completionChars: 0,
          success: false,
          retryCount: attempt,
          fallbackCount: failoverCount,
          errorMessage: lastError.message,
          errorType: errType,
        })

        // Retry the SAME model only for transient errors, then cascade.
        if (attempt < maxRetries && TRANSIENT.has(errType)) {
          const backoffMs = 400 * Math.pow(2, attempt)
          console.warn(`[${this.name}] ${modelId} ${errType} — retry ${attempt + 1}/${maxRetries} in ${backoffMs}ms`)
          await new Promise((r) => setTimeout(r, backoffMs))
          continue
        }
        console.warn(`[${this.name}] Candidate model ${modelId} failed: ${lastError.message}`)
        break
      }
      } // end retry loop
    }

    this.emitEvent(options.onProgress, {
      pipelineRunId,
      phase,
      agentRole: this.role,
      status: 'failed',
      progressPercentage: 100,
      title: this.name,
      titleAr: this.nameAr,
      detail: `All candidate models failed. Last error: ${lastError?.message}`,
      detailAr: `تعذر إكمال العملية: ${lastError?.message}`,
      timestamp: new Date().toISOString(),
    })

    throw new Error(
      `[${this.name}] Failed across all ${cascade.length} candidate models. Error: ${lastError?.message}`
    )
  }

  protected emitEvent(listener?: PipelineEventListener, event?: PipelineProgressEvent): void {
    if (listener && event) {
      try {
        listener(event)
      } catch {
        // Suppress listener callback errors
      }
    }
  }

  /**
   * Map an agent role (+ request options) to a gateway capability class so the
   * edge gateway can consult its DB-backed router for the best available model.
   * JSON-mode requests are always 'structured_json' regardless of role.
   */
  private mapRoleToCapability(
    role: AgentRole,
    options: AgentExecutionOptions
  ): 'structured_json' | 'reasoning' | 'fast' | 'compliance' | 'long_form' {
    if (options.jsonMode || options.schema) return 'structured_json'
    switch (role) {
      case 'research':
      case 'curriculum':
      case 'qa_critic':
      case 'assessments':
        return 'reasoning'
      case 'compliance':
      case 'translator':
        return 'compliance'
      case 'revision':
      case 'knowledge':
        return 'fast'
      case 'scenarios':
      case 'activities':
        return 'long_form'
      default:
        return 'reasoning'
    }
  }

  private mapRoleToTaskCategory(role: AgentRole): 'fast' | 'reasoning' | 'compliance' | 'roleplay' | 'general' {
    switch (role) {
      case 'research':
      case 'curriculum':
      case 'qa_critic':
      case 'assessments':
        return 'reasoning'
      case 'scenarios':
      case 'activities':
        return 'roleplay'
      case 'compliance':
      case 'translator':
        return 'compliance'
      case 'revision':
      case 'knowledge':
        return 'fast'
      default:
        return 'general'
    }
  }
}
