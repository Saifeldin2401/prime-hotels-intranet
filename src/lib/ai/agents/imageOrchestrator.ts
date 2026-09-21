import type { VisualAssetDecision, VisualStrategyType } from './types'
import {
  getModelMetadata,
  isImageModel,
  resolveImageModelChain,
  resolveProvider,
  type ImageRequirement,
  type ModelDecision,
} from './modelRegistry'

type VisualCategory = ImageRequirement['category']

/** Map the agent's high-level strategy to a concrete image category. */
export function classifyVisual(
  strategy: VisualStrategyType | string | undefined,
  hints: { prompt?: string; style?: string } = {},
): VisualCategory {
  const s = (strategy || '').toLowerCase()
  const blob = `${s} ${hints.style || ''} ${hints.prompt || ''}`.toLowerCase()

  if (s === 'vector_svg_diagram' || /\bsvg\b|blueprint|schematic/.test(blob)) return 'vector_svg'
  if (s === 'process_flowchart' || /flowchart|flow chart|decision tree/.test(blob)) return 'flowchart'
  if (/infographic|chart|stat|kpi|dashboard/.test(blob)) return 'infographic'
  if (s === 'workplace_scenario' || /scenario|dilemma|role ?play|guest complaint/.test(blob)) return 'scenario'
  if (/\bicon\b|pictogram/.test(blob)) return 'icon'
  if (/\bdiagram\b|labelled|labeled|cross[- ]section/.test(blob)) return 'diagram'
  if (s === 'educational_illustration' || /illustration|conceptual/.test(blob)) return 'illustration'
  if (s === 'photorealistic_luxury' || /photo|realistic|5-star|banquet|uniform|lobby/.test(blob)) {
    return 'photorealistic'
  }
  return 'illustration'
}

interface ImageRouteResult extends ModelDecision {
  category: VisualCategory
  endpointProvider: 'google' | 'openrouter' | 'cloudflare' | 'recraft'
}

/**
 * Decide WHICH image model to use, WHY, and the fallback order.
 *
 * @param decision  the Image Agent's visual decision (strategy + prompt)
 * @param opts.requestedModel  an explicit user/admin model choice ('auto' = let the router decide)
 * @param opts.allowPremium    permit paid image models
 * @param opts.routingMode     override the platform routing mode
 */
export function routeImageModel(
  decision: Pick<VisualAssetDecision, 'strategy' | 'prompt'> & { style?: string; aspectRatio?: string; quality?: 'draft' | 'standard' | 'high' },
  opts: { requestedModel?: string; allowPremium?: boolean; routingMode?: ImageRequirement['routingMode'] } = {},
): ImageRouteResult {
  const category = classifyVisual(decision.strategy, { prompt: decision.prompt, style: decision.style })

  // Honour an explicit, valid image model choice (but never a text model).
  const requested = opts.requestedModel
  if (requested && requested !== 'auto' && isImageModel(requested)) {
    const meta = getModelMetadata(requested)
    const chain = resolveImageModelChain({
      category,
      style: decision.style,
      quality: decision.quality,
      aspectRatio: decision.aspectRatio,
      allowPremium: opts.allowPremium,
      routingMode: opts.routingMode,
      freePreferred: !opts.allowPremium,
    })
    const provider = resolveProvider(requested)
    return {
      modelId: requested,
      provider,
      costTier: meta?.costTier ?? 'free',
      isFree: (meta?.pricingPerImageUSD ?? 0) === 0,
      score: 100,
      reasons: [`Explicit model choice "${requested}" honoured (valid ${category} image model).`],
      fallbacks: [chain.modelId, ...chain.fallbacks].filter((id) => id !== requested),
      category,
      endpointProvider: toEndpointProvider(provider),
    }
  }

  if (requested && requested !== 'auto' && !isImageModel(requested)) {
    console.warn(
      `[imageOrchestrator] Requested model "${requested}" is not an image model — ignoring and auto-routing.`,
    )
  }

  const chain = resolveImageModelChain({
    category,
    style: decision.style,
    quality: decision.quality,
    aspectRatio: decision.aspectRatio,
    allowPremium: opts.allowPremium,
    routingMode: opts.routingMode,
    freePreferred: !opts.allowPremium,
  })

  return {
    ...chain,
    category,
    endpointProvider: toEndpointProvider(chain.provider),
  }
}

function toEndpointProvider(p: string): ImageRouteResult['endpointProvider'] {
  if (p === 'gemini') return 'google'
  if (p === 'recraft') return 'recraft'
  if (p === 'cloudflare') return 'cloudflare'
  return 'openrouter'
}
