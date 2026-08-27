/**
 * AI Image Pipeline Debug & Diagnostics Logger
 * ----------------------------------------------------------------------------
 * Provides high-visibility, color-coded, structured console tracing for every
 * phase of AI visual synthesis: parameter pre-flight, strategy analysis, model
 * routing, network requests, HTTP status codes, edge functions, and fallback cascades.
 */

export interface ImageDebugParams {
  title?: string
  prompt?: string
  negativePrompt?: string
  style?: string
  aspectRatio?: string
  requestedModel?: string
  category?: string
  provider?: string
  assetId?: string
}

export interface StageAttemptInfo {
  stage: string
  model: string
  provider: string
  endpoint?: string
  payload?: Record<string, unknown>
}

export interface StageErrorInfo {
  stage: string
  model: string
  provider: string
  statusCode?: number | string
  error: unknown
  rawResponse?: unknown
  rootCause?: string
  actionableHint?: string
}

export class ImageDebugSession {
  private startTime: number = Date.now()
  private stageStartTime: number = Date.now()
  private title: string
  private stagesExecuted: Array<{ stage: string; model: string; success: boolean; latencyMs: number }> = []

  constructor(title: string, params: ImageDebugParams) {
    this.title = title || 'Visual Asset'
    this.startTime = Date.now()

    console.group(
      `%c🖼️ [AI Visual Engine] ─── Visual Synthesis: "${this.title}" ───%c`,
      'background: #8b5cf6; color: #ffffff; font-weight: bold; padding: 3px 8px; border-radius: 4px;',
      ''
    )

    // Check environment credentials status
    const hasGemini = Boolean(
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_AI_API_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY)
    )
    const hasCloudflare = Boolean(
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_ACCOUNT_ID) &&
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDFLARE_API_TOKEN)
    )
    const hasOpenRouter = Boolean(
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENROUTER_API_KEY
    )

    console.log('%c📋 1. Request Parameters & Credential Health:%c', 'color: #a855f7; font-weight: bold;', '')
    console.table({
      'Asset Title': this.title,
      'Requested Model': params.requestedModel || 'auto-route',
      'Visual Style': params.style || 'photorealistic_luxury',
      'Aspect Ratio': params.aspectRatio || '16:9',
      'Category': params.category || 'auto-detect',
      'Prompt': (params.prompt || '').slice(0, 80) + (params.prompt && params.prompt.length > 80 ? '...' : ''),
      'Google AI Studio Key': hasGemini ? '✅ Configured (Direct / Edge)' : '⚠️ Missing (Edge Gateway Fallback)',
      'Cloudflare Workers AI': hasCloudflare ? '✅ Configured (Direct / Edge)' : '⚠️ Missing (Edge / FLUX Fallback)',
      'OpenRouter Key': hasOpenRouter ? '✅ Configured' : '⚠️ Missing (Edge Gateway Fallback)',
    })
  }

  public logStrategyEvaluation(decision: {
    shouldGenerate?: boolean
    strategy?: string
    justification?: string
    educationalObjective?: string
    prompt?: string
  }) {
    console.log('%c🎯 2. Educational Need & Strategy Evaluation:%c', 'color: #3b82f6; font-weight: bold;', '')
    console.info('Strategy:', decision.strategy || 'photorealistic_luxury')
    console.info('Educational Objective:', decision.educationalObjective || 'Reinforces operational procedure')
    console.info('Justification:', decision.justification || 'Visual reinforcement required')
    if (decision.prompt) {
      console.info('Optimized Visual Prompt:', decision.prompt)
    }
  }

  public logRoutingDecision(route: {
    modelId: string
    endpointProvider: string
    category: string
    costTier: string
    isFree: boolean
    reasons: string[]
    fallbacks: string[]
  }) {
    console.log('%c🧭 3. Central Model Routing Decision:%c', 'color: #06b6d4; font-weight: bold;', '')
    console.table({
      'Selected Model': route.modelId,
      'Endpoint Provider': route.endpointProvider,
      'Modality Category': route.category,
      'Cost Tier': route.costTier,
      'Zero Cost ($0.00)': route.isFree ? 'Yes' : 'No',
      'Routing Reasons': route.reasons.join(' · '),
      'Fallback Cascade Order': route.fallbacks.join(' → ') || 'None',
    })
  }

  public logStageAttempt(info: StageAttemptInfo) {
    this.stageStartTime = Date.now()
    console.log(
      `%c⚡ [Stage: ${info.stage}] Attempting synthesis via ${info.provider} (${info.model})%c`,
      'color: #0284c7; font-weight: bold;',
      '',
      {
        model: info.model,
        provider: info.provider,
        endpoint: info.endpoint || 'Internal SDK / Edge Gateway',
        payloadSnapshot: info.payload,
      }
    )
  }

  public logStageSuccess(stage: string, model: string, details: { imageUrl?: string; mimeType?: string; bytes?: number; extra?: unknown }) {
    const latency = Date.now() - this.stageStartTime
    this.stagesExecuted.push({ stage, model, success: true, latencyMs: latency })

    const isDataUri = details.imageUrl?.startsWith('data:')
    const isSvg = details.imageUrl?.includes('image/svg+xml') || details.imageUrl?.startsWith('<svg')

    console.log(
      `%c✅ [Stage: ${stage}] Succeeded in ${latency}ms (%c${model}%c)%c`,
      'color: #10b981; font-weight: bold;',
      'color: #047857; font-weight: bold;',
      'color: #10b981; font-weight: bold;',
      '',
      {
        type: isSvg ? 'Vector SVG' : isDataUri ? 'Base64 Data URI' : 'Public HTTPS URL',
        imagePreview: details.imageUrl ? (details.imageUrl.slice(0, 100) + '...') : 'N/A',
        sizeBytes: details.bytes,
        extra: details.extra,
      }
    )
  }

  public logStageError(info: StageErrorInfo) {
    const latency = Date.now() - this.stageStartTime
    this.stagesExecuted.push({ stage: info.stage, model: info.model, success: false, latencyMs: latency })

    let errorMsg = 'Unknown error'
    if (info.error instanceof Error) {
      errorMsg = info.error.message
    } else if (typeof info.error === 'string') {
      errorMsg = info.error
    } else if (info.error && typeof info.error === 'object') {
      errorMsg = JSON.stringify(info.error)
    }

    // Root cause deduction
    let deducedRootCause = info.rootCause
    if (!deducedRootCause) {
      const lower = errorMsg.toLowerCase()
      if (lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted')) {
        deducedRootCause = 'Rate limit or free quota exceeded on upstream provider API'
      } else if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('api key')) {
        deducedRootCause = 'Invalid or missing API key for target provider'
      } else if (lower.includes('403') || lower.includes('forbidden') || lower.includes('cors')) {
        deducedRootCause = 'Access forbidden or CORS header policy restriction'
      } else if (lower.includes('timeout') || lower.includes('aborted')) {
        deducedRootCause = 'Network timeout / request exceeded maximum latency deadline'
      } else if (lower.includes('not found') || lower.includes('404')) {
        deducedRootCause = 'Model endpoint or Cloudflare AI route not found'
      } else {
        deducedRootCause = 'Upstream gateway execution error'
      }
    }

    console.group(
      `%c❌ [Stage: ${info.stage}] Failed in ${latency}ms — HTTP ${info.statusCode || 'Error'} (${info.model})%c`,
      'color: #ef4444; font-weight: bold;',
      ''
    )
    console.error('Error Details:', info.error)
    console.warn('🔍 Deduced Root Cause:', deducedRootCause)
    if (info.actionableHint) {
      console.info('💡 Diagnostic Hint:', info.actionableHint)
    }
    if (info.rawResponse) {
      console.debug('Raw Upstream Response:', info.rawResponse)
    }
    console.groupEnd()
  }

  public logFallbackTrigger(fromStage: string, toStage: string, reason: string) {
    console.log(
      `%c🔄 [Self-Healing Cascade] %c"${fromStage}" failed → Auto-cascading to "%c${toStage}%c" (Reason: ${reason})%c`,
      'color: #f59e0b; font-weight: bold;',
      'color: #d97706;',
      'color: #b45309; font-weight: bold;',
      'color: #d97706;',
      ''
    )
  }

  public endSession(success: boolean, result?: { modelUsed?: string; providerUsed?: string; imageUrl?: string }) {
    const totalLatency = Date.now() - this.startTime

    console.log('%c🏁 4. Execution Summary & Pipeline Telemetry:%c', 'color: #8b5cf6; font-weight: bold;', '')
    console.table({
      'Overall Result': success ? '✅ SUCCESS' : '❌ FAILED',
      'Final Model Used': result?.modelUsed || 'N/A',
      'Final Provider': result?.providerUsed || 'N/A',
      'Total Latency': `${totalLatency} ms`,
      'Stages Executed': this.stagesExecuted.map((s) => `${s.stage} (${s.success ? 'OK' : 'FAIL'})`).join(' → ') || 'Direct',
    })

    if (result?.imageUrl) {
      console.info(`%c🖼️ Result Visual Asset Ready: %c${result.imageUrl.slice(0, 120)}...`, 'color: #10b981; font-weight: bold;', 'color: #64748b;')
    }

    console.groupEnd()
  }
}

export const imageDebugLogger = {
  startSession(title: string, params: ImageDebugParams): ImageDebugSession {
    return new ImageDebugSession(title, params)
  },
}
