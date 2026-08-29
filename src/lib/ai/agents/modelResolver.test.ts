import { describe, it, expect, afterEach } from 'vitest'
import {
  assertImageModel,
  assertTextModel,
  getEnabledModels,
  getModelModality,
  isImageModel,
  isPersistedAssetId,
  isTextModel,
  resolveImageModelChain,
  resolveProvider,
  selectTextModel,
  setModelOverrides,
  setRoutingMode,
} from './modelRegistry'
import { classifyVisual, routeImageModel } from './imageOrchestrator'

afterEach(() => {
  setRoutingMode('free_first')
  setModelOverrides({ disabledModelIds: [], forceEnabledModelIds: [], disabledProviders: [], freeOnly: false })
})

describe('provider resolution (single source of truth)', () => {
  it('resolves registered providers from the registry, not string matching', () => {
    expect(resolveProvider('gemini-2.5-flash')).toBe('gemini')
    expect(resolveProvider('anthropic/claude-3.5-sonnet')).toBe('openrouter')
    expect(resolveProvider('allam-2-7b')).toBe('groq')
    expect(resolveProvider('@cf/black-forest-labs/flux-1-schnell')).toBe('cloudflare')
  })

  it('never routes a Google image model to Cloudflare (regression #2)', () => {
    expect(resolveProvider('google-imagen-3')).toBe('gemini')
    expect(resolveProvider('gemini-2.5-flash-image')).toBe('gemini')
    expect(resolveProvider('nano-banana-pro')).toBe('gemini') // unregistered id → fallback
  })
})

describe('modality classification', () => {
  it('classifies image vs text models', () => {
    expect(getModelModality('recraft-vector')).toBe('image')
    expect(isImageModel('recraft-vector')).toBe(true)
    expect(isImageModel('@cf/bytedance/stable-diffusion-xl-lightning')).toBe(true)
    expect(isTextModel('gemini-2.5-flash')).toBe(true)
    expect(isTextModel('deepseek/deepseek-r1')).toBe(true)
  })

  it('classifies unregistered image ids via the safety-net denylist', () => {
    expect(isImageModel('some-recraft-vector-clone')).toBe(true)
    expect(isImageModel('black-forest-labs/flux.2-pro')).toBe(true)
  })
})

describe('endpoint guards (regression #1 — must reject before API call)', () => {
  it('assertTextModel throws for an image model', () => {
    expect(() => assertTextModel('recraft-vector')).toThrow(/image model/i)
    expect(() => assertTextModel('gemini-2.5-flash')).not.toThrow()
  })
  it('assertImageModel throws for a text model', () => {
    expect(() => assertImageModel('gemini-2.5-flash')).toThrow(/text model/i)
    expect(() => assertImageModel('recraft-vector')).not.toThrow()
  })
})

describe('draft vs persisted id (regression #3)', () => {
  it('only real UUIDs are persisted ids', () => {
    expect(isPersistedAssetId('a3f1c2d4-5b6e-4a7c-8d9e-0f1a2b3c4d5e')).toBe(true)
    expect(isPersistedAssetId('img-1699999999999-ab12cd')).toBe(false)
    expect(isPersistedAssetId('temp_course')).toBe(false)
    expect(isPersistedAssetId(undefined)).toBe(false)
    expect(isPersistedAssetId('kb-doc-123')).toBe(false)
  })
})

describe('registry verification gate', () => {
  it('excludes unverified / fictional models from automatic routing', () => {
    const ids = getEnabledModels().map((m) => m.id)
    expect(ids).toContain('gemini-2.5-flash')
    expect(ids).not.toContain('flux-1-schnell') // registry entry marked unverified
    expect(ids).not.toContain('black-forest-labs/flux.2-pro') // not in the registry at all
  })

  it('admin overrides can force-disable an otherwise-enabled model', () => {
    setModelOverrides({ disabledModelIds: ['gemini-2.5-flash'] })
    expect(getEnabledModels().map((m) => m.id)).not.toContain('gemini-2.5-flash')
  })

  it('free-only mode disables paid models', () => {
    setModelOverrides({ freeOnly: true })
    const tiers = new Set(getEnabledModels().map((m) => m.costTier))
    expect(tiers.has('premium')).toBe(false)
  })
})

describe('capability-based text routing with explanation', () => {
  it('selects a free model first and explains why', () => {
    const d = selectTextModel({ primaryCapability: 'deep_reasoning', requiresJsonMode: true })
    expect(d).not.toBeNull()
    expect(d!.isFree).toBe(true)
    expect(d!.reasons.join(' ')).toMatch(/free|routing mode/i)
    expect(d!.fallbacks.length).toBeGreaterThan(0)
  })

  it('quality_first mode can prefer a premium model', () => {
    setRoutingMode('quality_first')
    const d = selectTextModel({ primaryCapability: 'deep_reasoning', requiresJsonMode: true }, { mode: 'quality_first' })
    expect(d).not.toBeNull()
    expect(d!.reasons.join(' ')).toMatch(/quality/i)
  })
})

describe('image model routing (free-first, never a text model)', () => {
  it('vector/diagram categories route to the SVG engine', () => {
    const chain = resolveImageModelChain({ category: 'vector_svg' })
    expect(isImageModel(chain.modelId)).toBe(true)
    expect(chain.modelId).toBe('recraft-vector')
  })

  it('photorealistic free-first picks a $0 model with fallbacks', () => {
    const chain = resolveImageModelChain({ category: 'photorealistic', freePreferred: true })
    expect(chain.isFree).toBe(true)
    expect(isImageModel(chain.modelId)).toBe(true)
    expect(chain.fallbacks.every((id) => isImageModel(id))).toBe(true)
    expect(chain.reasons.join(' ')).toMatch(/free-first/i)
  })

  it('every model in an image chain is an image model (never a text model)', () => {
    for (const cat of ['photorealistic', 'illustration', 'infographic', 'icon', 'scenario'] as const) {
      const chain = resolveImageModelChain({ category: cat })
      expect(isImageModel(chain.modelId)).toBe(true)
      chain.fallbacks.forEach((id) => expect(isTextModel(id)).toBe(false))
    }
  })
})

describe('imageOrchestrator', () => {
  it('classifies visual strategy into a category', () => {
    expect(classifyVisual('vector_svg_diagram')).toBe('vector_svg')
    expect(classifyVisual('photorealistic_luxury')).toBe('photorealistic')
    expect(classifyVisual('process_flowchart')).toBe('flowchart')
  })

  it('ignores a text model passed as requestedModel and auto-routes', () => {
    const r = routeImageModel({ strategy: 'photorealistic_luxury', prompt: 'hotel lobby' }, { requestedModel: 'gemini-2.5-flash' })
    expect(isImageModel(r.modelId)).toBe(true)
    expect(r.modelId).not.toBe('gemini-2.5-flash')
  })

  it('honours a valid explicit image model choice', () => {
    const r = routeImageModel(
      { strategy: 'photorealistic_luxury', prompt: 'banquet setup' },
      { requestedModel: '@cf/black-forest-labs/flux-1-schnell' },
    )
    expect(r.modelId).toBe('@cf/black-forest-labs/flux-1-schnell')
    expect(r.endpointProvider).toBe('cloudflare')
  })

  it('honours Nano Banana Pro preview as a valid Google image model', () => {
    expect(isImageModel('nano-banana-pro-preview')).toBe(true)
    expect(isTextModel('nano-banana-pro-preview')).toBe(false)
    const r = routeImageModel(
      { strategy: 'photorealistic_luxury', prompt: 'luxury penthouse suite' },
      { requestedModel: 'nano-banana-pro-preview' },
    )
    expect(r.modelId).toBe('nano-banana-pro-preview')
    expect(r.endpointProvider).toBe('google')
  })
})

