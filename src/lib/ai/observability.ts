/**
 * AI Observability — structured logging for every AI request.
 * ----------------------------------------------------------------------------
 * One record per model call: which agent, which task, which provider/model,
 * timing, retries, fallbacks, cost, and error classification. Writes are
 * best-effort and never block or throw into the generation pipeline.
 */

import { supabase } from '@/lib/supabase'
import { getModelMetadata, getRoutingMode } from './agents/modelRegistry'
import type { AgentRole } from './agents/types'

// `ai_usage_log` carries columns added by a migration not yet in the generated
// DB types — table access is deliberately untyped here.
const db = supabase as unknown as { from: (t: string) => any }

export type AIErrorType =
  | 'rate_limit'
  | 'timeout'
  | 'empty_response'
  | 'auth'
  | 'invalid_model'
  | 'provider_error'
  | 'parse_error'
  | 'quota_exhausted'
  | 'unknown'

export interface AIRequestLog {
  generationId?: string
  pipelineRunId?: string
  courseId?: string
  lessonId?: string
  agentRole: AgentRole | string
  taskType: string
  provider: string
  modelUsed: string
  startedAt: number
  durationMs: number
  promptChars: number
  completionChars: number
  success: boolean
  retryCount?: number
  fallbackCount?: number
  errorMessage?: string
  errorType?: AIErrorType
  metadata?: Record<string, unknown>
}

/** Cheap heuristic token estimate (~4 chars/token for mixed EN/AR). */
export function estimateTokens(text: string | undefined | null): number {
  if (!text) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

/** Classify a raw error message into a stable bucket for dashboards. */
export function classifyError(message: string | undefined): AIErrorType {
  const m = (message || '').toLowerCase()
  if (/402|depleted|used up your (daily|monthly)|out of credits|insufficient_quota/.test(m)) return 'quota_exhausted'
  if (/429|rate.?limit|quota|resource.?exhausted/.test(m)) return 'rate_limit'
  if (/timeout|timed out|deadline|abort/.test(m)) return 'timeout'
  if (/empty response|no content|returned nothing/.test(m)) return 'empty_response'
  if (/401|403|unauthor|forbidden|api key|invalid.*key/.test(m)) return 'auth'
  if (/invalid model|model not found|unknown model|no such model/.test(m)) return 'invalid_model'
  if (/json|parse|unexpected token/.test(m)) return 'parse_error'
  if (/5\d\d|provider|upstream|gateway/.test(m)) return 'provider_error'
  return 'unknown'
}

interface PipelineTelemetry {
  pipelineRunId: string
  requests: number
  successes: number
  failures: number
  totalRetries: number
  totalFallbacks: number
  totalPromptTokens: number
  totalCompletionTokens: number
  estimatedCostUSD: number
  byProvider: Record<string, number>
  byModel: Record<string, number>
  freeRequests: number
  paidRequests: number
  startedAt: number
}

const telemetryByRun = new Map<string, PipelineTelemetry>()

function ensureTelemetry(runId: string): PipelineTelemetry {
  let t = telemetryByRun.get(runId)
  if (!t) {
    t = {
      pipelineRunId: runId,
      requests: 0, successes: 0, failures: 0,
      totalRetries: 0, totalFallbacks: 0,
      totalPromptTokens: 0, totalCompletionTokens: 0,
      estimatedCostUSD: 0,
      byProvider: {}, byModel: {},
      freeRequests: 0, paidRequests: 0,
      startedAt: Date.now(),
    }
    telemetryByRun.set(runId, t)
  }
  return t
}

function estimateCostUSD(log: AIRequestLog, promptTokens: number, completionTokens: number): number {
  const meta = getModelMetadata(log.modelUsed)
  if (meta?.modality === 'image' || /image|imagen|flux|recraft|sdxl|diffusion/i.test(log.modelUsed)) {
    return meta?.pricingPerImageUSD ?? 0
  }
  if (meta?.pricingPerMillionTokensUSD) {
    return (
      (promptTokens / 1_000_000) * meta.pricingPerMillionTokensUSD.prompt +
      (completionTokens / 1_000_000) * meta.pricingPerMillionTokensUSD.completion
    )
  }
  if (meta?.costTier === 'free') return 0
  // Unknown paid model — coarse blended estimate.
  return ((promptTokens + completionTokens) / 1_000_000) * 1.5
}

/**
 * Record one AI model call. Fire-and-forget: updates in-memory telemetry
 * synchronously and persists to `ai_usage_log` asynchronously.
 */
export function logAIRequest(log: AIRequestLog): void {
  const promptTokens = Math.max(1, Math.ceil(log.promptChars / 4))
  const completionTokens = Math.max(0, Math.ceil(log.completionChars / 4))
  const cost = estimateCostUSD(log, promptTokens, completionTokens)
  const meta = getModelMetadata(log.modelUsed)
  const isFree = (meta?.costTier ?? 'free') === 'free' && cost === 0

  if (log.pipelineRunId) {
    const t = ensureTelemetry(log.pipelineRunId)
    t.requests += 1
    t.successes += log.success ? 1 : 0
    t.failures += log.success ? 0 : 1
    t.totalRetries += log.retryCount ?? 0
    t.totalFallbacks += log.fallbackCount ?? 0
    t.totalPromptTokens += promptTokens
    t.totalCompletionTokens += completionTokens
    t.estimatedCostUSD += cost
    t.byProvider[log.provider] = (t.byProvider[log.provider] ?? 0) + 1
    t.byModel[log.modelUsed] = (t.byModel[log.modelUsed] ?? 0) + 1
    if (isFree) t.freeRequests += 1
    else t.paidRequests += 1
  }

  // Async persistence — swallow every error.
  void (async () => {
    try {
      const { data: auth } = await supabase.auth.getUser()
      await db.from('ai_usage_log').insert({
        user_id: auth?.user?.id ?? null,
        generation_id: log.generationId ?? null,
        pipeline_run_id: log.pipelineRunId ?? null,
        course_id: log.courseId && /^[0-9a-f-]{36}$/i.test(log.courseId) ? log.courseId : null,
        lesson_id: log.lessonId ?? null,
        agent_role: log.agentRole,
        task_type: log.taskType,
        model_used: log.modelUsed,
        provider: log.provider,
        cost_tier: isFree ? 'free' : (meta?.costTier ?? 'paid'),
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost_usd: Number(cost.toFixed(6)),
        latency_ms: Math.round(log.durationMs),
        success: log.success,
        error_message: log.errorMessage ?? null,
        error_type: log.errorType ?? (log.errorMessage ? classifyError(log.errorMessage) : null),
        retry_count: log.retryCount ?? 0,
        fallback_count: log.fallbackCount ?? 0,
        routing_mode: getRoutingMode(),
        started_at: new Date(log.startedAt).toISOString(),
        metadata: log.metadata ?? {},
      })
    } catch {
      /* observability must never break generation */
    }
  })()
}

export function getPipelineTelemetry(pipelineRunId: string): PipelineTelemetry | undefined {
  return telemetryByRun.get(pipelineRunId)
}

export function resetPipelineTelemetry(pipelineRunId: string): void {
  telemetryByRun.delete(pipelineRunId)
}
