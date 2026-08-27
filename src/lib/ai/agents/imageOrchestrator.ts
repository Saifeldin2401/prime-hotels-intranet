/**
 * Image Generation Orchestrator
 * ----------------------------------------------------------------------------
 * Owns the decision layer that sits between the Course Orchestrator and the
 * Image Agent:
 *
 *   Course Orchestrator
 *     → planVisualRequirement()   "does this lesson benefit from a visual?"
 *     → classifyVisual()          photorealistic / diagram / infographic / …
 *     → routeImageModel()         registry-driven, free-first, with fallbacks
 *     → Image Agent (executes)
 *
 * It NEVER string-matches model ids and it can only ever return image models
 * (a text model can never leak out of here).
 */

import type { LessonBlueprint } from '@/types/aiCourseEngine'
import type { VisualAssetDecision, VisualStrategyType } from './types'
import {
  getModelMetadata,
  isImageModel,
  resolveImageModelChain,
  resolveProvider,
  type ImageRequirement,
  type ModelDecision,
} from './modelRegistry'

export type VisualCategory = ImageRequirement['category']

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

export interface VisualPlan {
  /** Whether a generated visual is actually worthwhile for this lesson. */
  recommended: boolean
  reason: string
  category: VisualCategory
}

/**
 * Lightweight heuristic pre-filter. The Image Agent still runs its own LLM
 * "should generate" check — this just avoids obviously-pointless generations
 * (pure reflection / discussion lessons) before spending a model call.
 */
export function planVisualRequirement(
  lesson: Pick<LessonBlueprint, 'title' | 'templateType' | 'description'> & { renderedHtml?: string },
): VisualPlan {
  const text = `${lesson.title} ${lesson.description || ''} ${lesson.renderedHtml || ''}`
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
  const tmpl = (lesson.templateType || '').toLowerCase()

  const reflective = /reflect|discuss|journal|self[- ]assessment|debrief/.test(tmpl)
  const proceduralOrVisual =
    /procedure|checklist|setup|layout|standard|diagram|equipment|uniform|table setting|room|floor plan/.test(text)

  if (reflective && !proceduralOrVisual) {
    return {
      recommended: false,
      reason: 'Reflective/discussion lesson — a decorative image would not reinforce a benchmark.',
      category: 'illustration',
    }
  }

  return {
    recommended: true,
    reason: proceduralOrVisual
      ? 'Lesson describes a concrete procedure/layout that a visual reinforces.'
      : 'Lesson can be supported by a conceptual visual.',
    category: classifyVisual(undefined, { prompt: text }),
  }
}

export interface ImageRouteResult extends ModelDecision {
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
