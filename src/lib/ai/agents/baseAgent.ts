/**
 * Base AI Agent Class
 * 
 * Provides unified execution, dynamic model resolution, streaming progress events,
 * schema validation, and autonomous escalation across all specialized course engine agents.
 */

import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'
import { extractJsonFromText } from '@/lib/ai/client'
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

    // Resolve dynamic candidate models
    const cascade = modelRegistry.resolveModelCascade(
      this.role,
      customRequirements,
      options.preferredModel
    )

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

    for (let i = 0; i < cascade.length; i++) {
      const modelId = cascade[i]
      const modelMeta = modelRegistry.getModelMetadata(modelId)
      const provider = (modelMeta?.provider || 'openrouter') as ModelProvider
      const costTier = (modelMeta?.costTier || 'free') as ModelCostTier

      try {
        const response = await multiProviderRouter.execute<T>(prompt, {
          task: this.mapRoleToTaskCategory(this.role),
          preferredModel: modelId,
          systemPrompt,
          temperature: options.temperature ?? 0.5,
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

        const latencyMs = Date.now() - startTime

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
        console.warn(`[${this.name}] Candidate model ${modelId} failed: ${lastError.message}`)
      }
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
