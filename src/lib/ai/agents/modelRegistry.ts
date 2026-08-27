/**
 * AI Model Intelligence Layer & Dynamic Model Registry
 * 
 * Dynamic Capability-Based Model Router for Enterprise Training Operations
 * Prioritizes High-Performance FREE models (Gemini Flash, Groq LPU, Recraft Vector, HuggingFace, Cloudflare)
 * and escalates to OpenRouter Premium models (Claude 3.7, GPT-4o, DeepSeek R1) when strictly necessary.
 */

import type {
  AgentRole,
  AIModelCapability,
  LatencyTier,
  ModelCostTier,
  ModelMetadata,
  ModelModality,
  ModelProvider,
  QualityTier,
  RoutingMode,
  TaskCapabilityRequirement,
} from './types'

// ============================================================================
// COMPREHENSIVE MULTI-PROVIDER MODEL CATALOG
// ============================================================================

export const MODEL_REGISTRY: ModelMetadata[] = [
  // ── 1. GOOGLE GEMINI AI STUDIO (Free Tier / High Quota & Reasoning) ──
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'long_context', 'arabic_native', 'high_speed'],
    contextWindowTokens: 1048576,
    qualityScore: 94,
    speedScore: 92,
    supportsJsonMode: true,
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    provider: 'gemini',
    costTier: 'free',
    capabilities: ['structured_json', 'high_speed', 'long_context', 'arabic_native'],
    contextWindowTokens: 1048576,
    qualityScore: 86,
    speedScore: 98,
    supportsJsonMode: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'long_context', 'arabic_native', 'high_speed'],
    contextWindowTokens: 1048576,
    qualityScore: 90,
    speedScore: 94,
    supportsJsonMode: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite (unverified / future)',
    provider: 'gemini',
    costTier: 'free',
    capabilities: ['structured_json', 'high_speed', 'long_context'],
    contextWindowTokens: 524288,
    qualityScore: 88,
    speedScore: 98,
    supportsJsonMode: true,
    unverified: true,
  },

  // ── 2. GROQ LPU CLOUD (Zero-Latency Inference & Native Arabic) ──
  {
    id: 'qwen/qwen3.6-27b',
    name: 'Qwen 3.6 27B (Groq LPU)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['high_speed', 'structured_json', 'deep_reasoning', 'arabic_native'],
    contextWindowTokens: 32768,
    qualityScore: 92,
    speedScore: 99,
    supportsJsonMode: true,
  },
  {
    id: 'allam-2-7b',
    name: 'ALLaM-2 7B Arabic Sovereign (Groq)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['arabic_native', 'high_speed', 'structured_json'],
    contextWindowTokens: 8192,
    qualityScore: 91,
    speedScore: 98,
    supportsJsonMode: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct (OpenRouter)',
    provider: 'openrouter',
    costTier: 'low_cost',
    capabilities: ['deep_reasoning', 'structured_json', 'creative_narrative', 'arabic_native'],
    contextWindowTokens: 128000,
    qualityScore: 93,
    speedScore: 88,
    supportsJsonMode: true,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile (Groq LPU)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'creative_narrative', 'arabic_native'],
    contextWindowTokens: 128000,
    qualityScore: 92,
    speedScore: 97,
    supportsJsonMode: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant (Groq LPU)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['high_speed', 'structured_json'],
    contextWindowTokens: 128000,
    qualityScore: 80,
    speedScore: 99,
    supportsJsonMode: true,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Groq LPU)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'high_speed'],
    contextWindowTokens: 131072,
    qualityScore: 86,
    speedScore: 96,
    supportsJsonMode: true,
  },

  // ── 3. HUGGING FACE SERVERLESS (Open Foundations) ──
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    name: 'Qwen 2.5 72B Instruct (HuggingFace)',
    provider: 'huggingface',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'arabic_native'],
    contextWindowTokens: 32768,
    qualityScore: 91,
    speedScore: 78,
    supportsJsonMode: true,
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct (HuggingFace)',
    provider: 'huggingface',
    costTier: 'free',
    capabilities: ['high_speed', 'structured_json'],
    contextWindowTokens: 32768,
    qualityScore: 82,
    speedScore: 85,
    supportsJsonMode: false,
  },

  // ── 4. CLOUDFLARE WORKERS AI (Ranked Image Models) ──
  {
    id: '@cf/leonardo/lucid-origin',
    name: 'Leonardo Lucid Origin (Flagship Creative Director)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography', 'vector_svg'],
    contextWindowTokens: 0,
    qualityScore: 98,
    speedScore: 90,
    supportsJsonMode: false,
  },
  {
    id: '@cf/black-forest-labs/flux-1-schnell',
    name: 'FLUX.1 Schnell (12B Flow Transformer • SOTA Photorealism)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 97,
    speedScore: 94,
    supportsJsonMode: false,
  },
  {
    id: '@cf/leonardo/phoenix-1.0',
    name: 'Leonardo Phoenix 1.0 (Text & Prompt Adherence)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 96,
    speedScore: 89,
    supportsJsonMode: false,
  },
  {
    id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    name: 'SDXL Base 1.0 (Detailed Diffusion)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 93,
    speedScore: 87,
    supportsJsonMode: false,
  },
  {
    id: '@cf/lykon/dreamshaper-8-lcm',
    name: 'DreamShaper 8 LCM (Photorealism & Hospitality Ambiance)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 91,
    speedScore: 96,
    supportsJsonMode: false,
  },
  {
    id: '@cf/bytedance/stable-diffusion-xl-lightning',
    name: 'SDXL Lightning (Fast 4-Step 1024px Generation)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'fast_generation'],
    contextWindowTokens: 0,
    qualityScore: 89,
    speedScore: 98,
    supportsJsonMode: false,
  },
  {
    id: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    name: 'SD 1.5 Image-to-Image (Photo Modification)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 87,
    speedScore: 91,
    supportsJsonMode: false,
  },
  {
    id: '@cf/runwayml/stable-diffusion-v1-5-inpainting',
    name: 'SD 1.5 Inpainting (Regional Mask Editing)',
    provider: 'cloudflare',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 86,
    speedScore: 90,
    supportsJsonMode: false,
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B (Cloudflare Free)',
    provider: 'cloudflare',
    costTier: 'free',
    capabilities: ['high_speed', 'structured_json'],
    contextWindowTokens: 8192,
    qualityScore: 83,
    speedScore: 91,
    supportsJsonMode: true,
  },

  // ── 5. GOOGLE AI STUDIO (Gemini Key • Ranked Multimodal & Image Generation) ──
  {
    id: 'google-imagen-3',
    name: 'Google Imagen 3 (Nano Banana Pro • 4K Luxury Photorealism)',
    provider: 'gemini',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 99,
    speedScore: 92,
    supportsJsonMode: false,
  },
  {
    id: 'google-imagen-3-fast',
    name: 'Google Imagen 3 Fast (Nano Banana 2 • Ultra-Speed)',
    provider: 'gemini',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'fast_generation'],
    contextWindowTokens: 0,
    qualityScore: 95,
    speedScore: 97,
    supportsJsonMode: false,
  },
  {
    id: 'nano-banana-pro-preview',
    name: 'Nano Banana Pro (Gemini 3 Pro Vision & Creative Director)',
    provider: 'gemini',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 98,
    speedScore: 91,
    supportsJsonMode: false,
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Nano Banana 2 (Gemini 3.1 Flash Multimodal Synthesis)',
    provider: 'gemini',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'fast_generation'],
    contextWindowTokens: 0,
    qualityScore: 94,
    speedScore: 98,
    supportsJsonMode: false,
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana (Gemini 2.5 Flash Visual Analysis)',
    provider: 'gemini',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 90,
    speedScore: 96,
    supportsJsonMode: false,
  },

  // ── 6. OPENROUTER UNIFIED IMAGE GENERATION (Ranked SOTA Image Engines) ──
  {
    id: 'recraft/recraft-v4',
    name: 'Recraft V4 (Forbes 5-Star Textures, Vector SVG & Photorealism)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography', 'vector_svg'],
    contextWindowTokens: 0,
    qualityScore: 99,
    speedScore: 92,
    supportsJsonMode: false,
  },
  {
    id: 'recraft/recraft-v3',
    name: 'Recraft V3 (Forbes 5-Star Hotel Visuals & High Texture Realism)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography', 'vector_svg'],
    contextWindowTokens: 0,
    qualityScore: 99,
    speedScore: 90,
    supportsJsonMode: false,
  },
  {
    id: 'black-forest-labs/flux.2-pro',
    name: 'FLUX.2 Pro (Next-Gen 8K Photorealism & Precision Architecture)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 99,
    speedScore: 88,
    supportsJsonMode: false,
  },
  {
    id: 'bytedance-seed/seedream-4.5',
    name: 'ByteDance Seedream 4.5 (High Precision Cinematic Realism)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 98,
    speedScore: 92,
    supportsJsonMode: false,
  },
  {
    id: 'black-forest-labs/flux.2-flex',
    name: 'FLUX.2 Flex (Flexible Aspect Ratios & Typography)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 96,
    speedScore: 92,
    supportsJsonMode: false,
  },
  {
    id: 'black-forest-labs/flux.2-max',
    name: 'FLUX.2 Max (High-Resolution Frontier Composition)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 98,
    speedScore: 87,
    supportsJsonMode: false,
  },
  {
    id: 'openai/gpt-5.4-image-2',
    name: 'OpenAI GPT-5.4 Image 2 (Multimodal Studio Reasoning & Realism)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 97,
    speedScore: 91,
    supportsJsonMode: false,
  },
  {
    id: 'sourceful/riverflow-v2-pro',
    name: 'Sourceful Riverflow V2 Pro (Precise Text & Hospitality Schematics)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'vector_svg'],
    contextWindowTokens: 0,
    qualityScore: 96,
    speedScore: 93,
    supportsJsonMode: false,
  },
  {
    id: 'krea/krea-2-large',
    name: 'Krea 2 Large (Artistic & Interior Architectural Design)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 96,
    speedScore: 90,
    supportsJsonMode: false,
  },
  {
    id: 'bytedance-seed/seedream-4.5',
    name: 'ByteDance Seedream 4.5 (Balanced Quality & Latency)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 95,
    speedScore: 96,
    supportsJsonMode: false,
  },
  {
    id: 'black-forest-labs/flux.2-klein-4b',
    name: 'FLUX.2 Klein 4B (Real-Time Ultra-Fast Inference)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'fast_generation'],
    contextWindowTokens: 0,
    qualityScore: 94,
    speedScore: 99,
    supportsJsonMode: false,
  },
  {
    id: 'microsoft/mai-image-2.5-pro',
    name: 'Microsoft MAI-Image 2.5 Pro (Enterprise Schematics & Charts)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['vector_svg', 'photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 94,
    speedScore: 93,
    supportsJsonMode: false,
  },
  {
    id: 'qwen/qwen-image-3-pro',
    name: 'Qwen Image 3 Pro (Multilingual Vision & Detail)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 93,
    speedScore: 94,
    supportsJsonMode: false,
  },

  // ── 7. NATIVE VECTOR & DIRECT ENGINES (100% Free Zero-Cost) ──
  {
    id: 'recraft-vector',
    name: 'Recraft Vector Direct (Zero-Pixel Loss SOP Blueprint & Schematics)',
    provider: 'recraft',
    costTier: 'free',
    modality: 'image',
    capabilities: ['vector_svg', 'structured_json'],
    contextWindowTokens: 0,
    qualityScore: 99,
    speedScore: 98,
    supportsJsonMode: false,
  },
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 Schnell Direct (Zero-Failure 8K Photorealism)',
    provider: 'openrouter',
    costTier: 'free',
    modality: 'image',
    capabilities: ['photorealistic_image', 'luxury_photography'],
    contextWindowTokens: 0,
    qualityScore: 97,
    speedScore: 95,
    supportsJsonMode: false,
    unverified: true,
  },

  // ── 6. OPENROUTER ENTERPRISE (Premium Escalation Tier) ──
  {
    id: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
    provider: 'openrouter',
    costTier: 'premium',
    capabilities: ['deep_reasoning', 'structured_json', 'creative_narrative', 'arabic_native', 'long_context'],
    contextWindowTokens: 200000,
    qualityScore: 99,
    speedScore: 84,
    supportsJsonMode: true,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    costTier: 'premium',
    capabilities: ['deep_reasoning', 'structured_json', 'creative_narrative', 'arabic_native', 'long_context'],
    contextWindowTokens: 200000,
    qualityScore: 98,
    speedScore: 87,
    supportsJsonMode: true,
  },
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI GPT-4o Omni',
    provider: 'openrouter',
    costTier: 'premium',
    capabilities: ['deep_reasoning', 'structured_json', 'high_speed', 'arabic_native', 'long_context'],
    contextWindowTokens: 128000,
    qualityScore: 97,
    speedScore: 92,
    supportsJsonMode: true,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openrouter',
    costTier: 'low_cost',
    capabilities: ['structured_json', 'high_speed', 'arabic_native'],
    contextWindowTokens: 128000,
    qualityScore: 90,
    speedScore: 96,
    supportsJsonMode: true,
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 Chain-of-Thought',
    provider: 'openrouter',
    costTier: 'low_cost',
    capabilities: ['deep_reasoning', 'structured_json'],
    contextWindowTokens: 65536,
    qualityScore: 98,
    speedScore: 75,
    supportsJsonMode: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'openrouter',
    costTier: 'low_cost',
    capabilities: ['deep_reasoning', 'structured_json', 'high_speed'],
    contextWindowTokens: 65536,
    qualityScore: 94,
    speedScore: 93,
    supportsJsonMode: true,
  },
]

// ============================================================================
// VERIFICATION & NORMALISATION
// ----------------------------------------------------------------------------
// Only models whose id + pricing have been verified against the live provider
// participate in automatic routing. Everything else is `unverified` and must be
// explicitly enabled by an admin. This is the guard against "free by name only".
// ============================================================================

/** Model ids verified to exist on their provider with the stated cost tier. */
const VERIFIED_MODEL_IDS = new Set<string>([
  // Gemini (Google AI Studio)
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  // Groq LPU
  'allam-2-7b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  // OpenRouter open-weight
  'meta-llama/llama-3.3-70b-instruct',
  // Hugging Face serverless
  'Qwen/Qwen2.5-72B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  // Cloudflare Workers AI — text
  '@cf/meta/llama-3.1-8b-instruct',
  // Cloudflare Workers AI — image (genuinely $0 / low-cost per Cloudflare pricing)
  '@cf/black-forest-labs/flux-1-schnell',
  '@cf/bytedance/stable-diffusion-xl-lightning',
  '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  '@cf/lykon/dreamshaper-8-lcm',
  '@cf/leonardo/lucid-origin',
  '@cf/leonardo/phoenix-1.0',
  '@cf/runwayml/stable-diffusion-v1-5-img2img',
  '@cf/runwayml/stable-diffusion-v1-5-inpainting',
  // Google Imagen & Nano Banana (aliases mapped by the edge function)
  'google-imagen-3',
  'google-imagen-3-fast',
  'nano-banana-pro-preview',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
  // Local deterministic SVG schematic engine (zero cost, always available)
  'recraft-vector',
  // OpenRouter text (paid account available)
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-r1',
  'deepseek/deepseek-chat',
])

/** Per-image USD cost for verified image models (0 = genuinely free). */
const IMAGE_PRICING_USD: Record<string, number> = {
  '@cf/black-forest-labs/flux-1-schnell': 0,
  '@cf/bytedance/stable-diffusion-xl-lightning': 0,
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': 0,
  '@cf/lykon/dreamshaper-8-lcm': 0,
  '@cf/leonardo/lucid-origin': 0,
  '@cf/leonardo/phoenix-1.0': 0,
  '@cf/runwayml/stable-diffusion-v1-5-img2img': 0,
  '@cf/runwayml/stable-diffusion-v1-5-inpainting': 0,
  'google-imagen-3': 0.03,
  'google-imagen-3-fast': 0.02,
  'nano-banana-pro-preview': 0.03,
  'gemini-3.1-flash-image': 0.02,
  'gemini-2.5-flash-image': 0.03,
  'recraft-vector': 0,
}

// Admin overrides applied at runtime from ai_platform_config.
let ADMIN_DISABLED_IDS = new Set<string>()
let ADMIN_FORCE_ENABLED_IDS = new Set<string>()
let ADMIN_DISABLED_PROVIDERS = new Set<ModelProvider>()
let ADMIN_FREE_ONLY = false

export function setModelOverrides(opts: {
  disabledModelIds?: string[]
  forceEnabledModelIds?: string[]
  disabledProviders?: ModelProvider[]
  freeOnly?: boolean
}): void {
  if (opts.disabledModelIds) ADMIN_DISABLED_IDS = new Set(opts.disabledModelIds)
  if (opts.forceEnabledModelIds) ADMIN_FORCE_ENABLED_IDS = new Set(opts.forceEnabledModelIds)
  if (opts.disabledProviders) ADMIN_DISABLED_PROVIDERS = new Set(opts.disabledProviders)
  if (typeof opts.freeOnly === 'boolean') ADMIN_FREE_ONLY = opts.freeOnly
}

export function getModelOverrides() {
  return {
    disabledModelIds: [...ADMIN_DISABLED_IDS],
    forceEnabledModelIds: [...ADMIN_FORCE_ENABLED_IDS],
    disabledProviders: [...ADMIN_DISABLED_PROVIDERS],
    freeOnly: ADMIN_FREE_ONLY,
  }
}

function deriveLatencyTier(speedScore: number): LatencyTier {
  if (speedScore >= 96) return 'realtime'
  if (speedScore >= 88) return 'fast'
  if (speedScore >= 78) return 'standard'
  return 'slow'
}

function deriveQualityTier(qualityScore: number): QualityTier {
  if (qualityScore >= 97) return 'flagship'
  if (qualityScore >= 90) return 'high'
  if (qualityScore >= 82) return 'standard'
  return 'basic'
}

/**
 * Fill in the operational metadata that the raw catalog omits, and resolve the
 * effective enabled/pricing state. Pure — never mutates the source entry.
 */
export function normalizeModelMeta(m: ModelMetadata): Required<
  Pick<ModelMetadata, 'enabled' | 'priority' | 'latencyTier' | 'qualityTier' | 'reliabilityScore' | 'fallbackEligible' | 'unverified'>
> & ModelMetadata {
  const verified = VERIFIED_MODEL_IDS.has(m.id)
  const unverified = m.unverified ?? !verified
  const modality = getModelModality(m.id)
  const pricingPerImageUSD =
    m.pricingPerImageUSD ?? (modality === 'image' ? IMAGE_PRICING_USD[m.id] : undefined)

  // A model priced above zero per image is not "free" regardless of catalog tier.
  const costTier: ModelCostTier =
    modality === 'image' && typeof pricingPerImageUSD === 'number' && pricingPerImageUSD > 0
      ? 'low_cost'
      : m.costTier

  const isFreeTier = costTier === 'free' || (modality === 'image' && (pricingPerImageUSD ?? 0) === 0)

  let enabled: boolean
  if (m.adminOverride === 'force_disable' || ADMIN_DISABLED_IDS.has(m.id)) enabled = false
  else if (ADMIN_DISABLED_PROVIDERS.has(m.provider)) enabled = false
  else if (m.adminOverride === 'force_enable' || ADMIN_FORCE_ENABLED_IDS.has(m.id)) enabled = true
  else enabled = (m.enabled ?? true) && !unverified && !m.isDeprecated
  if (enabled && ADMIN_FREE_ONLY && !isFreeTier) enabled = false

  return {
    ...m,
    costTier,
    modality,
    pricingPerImageUSD,
    enabled,
    unverified,
    priority: m.priority ?? Math.round(200 - m.qualityScore - m.speedScore / 2),
    latencyTier: m.latencyTier ?? deriveLatencyTier(m.speedScore),
    qualityTier: m.qualityTier ?? deriveQualityTier(m.qualityScore),
    reliabilityScore: m.reliabilityScore ?? (verified ? 90 : 60),
    fallbackEligible: m.fallbackEligible ?? true,
  }
}

/** All catalog models with operational metadata resolved. */
export function getAllModels(): ModelMetadata[] {
  return MODEL_REGISTRY.map(normalizeModelMeta)
}

/** Only models eligible for automatic routing right now. */
export function getEnabledModels(): ModelMetadata[] {
  return getAllModels().filter((m) => m.enabled)
}

// ============================================================================
// AGENT DEFAULT CAPABILITY REQUIREMENTS MATRIX
// ============================================================================

export const AGENT_TASK_REQUIREMENTS: Record<AgentRole, TaskCapabilityRequirement> = {
  research: {
    primaryCapability: 'deep_reasoning',
    secondaryCapabilities: ['structured_json', 'long_context'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  curriculum: {
    primaryCapability: 'deep_reasoning',
    secondaryCapabilities: ['structured_json', 'arabic_native'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  knowledge: {
    primaryCapability: 'structured_json',
    secondaryCapabilities: ['long_context', 'arabic_native', 'high_speed'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  content_writer: {
    primaryCapability: 'structured_json',
    secondaryCapabilities: ['deep_reasoning', 'arabic_native', 'creative_narrative'],
    requiresJsonMode: false,
    costPreference: 'free_first',
  },
  activities: {
    primaryCapability: 'structured_json',
    secondaryCapabilities: ['creative_narrative', 'arabic_native'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  scenarios: {
    primaryCapability: 'creative_narrative',
    secondaryCapabilities: ['deep_reasoning', 'arabic_native', 'structured_json'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  assessments: {
    primaryCapability: 'structured_json',
    secondaryCapabilities: ['deep_reasoning', 'arabic_native'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  image_ai: {
    primaryCapability: 'structured_json',
    secondaryCapabilities: ['deep_reasoning', 'high_speed'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  video_ai: {
    primaryCapability: 'high_speed',
    requiresJsonMode: false,
    costPreference: 'free_first',
  },
  audio_ai: {
    primaryCapability: 'audio_speech',
    requiresJsonMode: false,
    costPreference: 'free_first',
  },
  qa_critic: {
    primaryCapability: 'deep_reasoning',
    secondaryCapabilities: ['structured_json'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  revision: {
    primaryCapability: 'deep_reasoning',
    secondaryCapabilities: ['structured_json', 'high_speed'],
    requiresJsonMode: false,
    costPreference: 'free_first',
  },
  compliance: {
    primaryCapability: 'arabic_native',
    secondaryCapabilities: ['deep_reasoning', 'structured_json'],
    requiresJsonMode: true,
    costPreference: 'free_first',
  },
  translator: {
    primaryCapability: 'arabic_native',
    secondaryCapabilities: ['structured_json', 'high_speed'],
    requiresJsonMode: false,
    costPreference: 'free_first',
  },
}

// ============================================================================
// DYNAMIC MODEL INTELLIGENCE ROUTER
// ============================================================================

export class AIModelRegistry {
  private static instance: AIModelRegistry

  private constructor() {}

  public static getInstance(): AIModelRegistry {
    if (!AIModelRegistry.instance) {
      AIModelRegistry.instance = new AIModelRegistry()
    }
    return AIModelRegistry.instance
  }

  /**
   * Find all models satisfying specific capability requirements
   */
  public findModelsByCapability(req: TaskCapabilityRequirement): ModelMetadata[] {
    return getEnabledModels().filter((m) => {
      if (req.requiresJsonMode && !m.supportsJsonMode) return false
      if (req.requiresArabic && !m.capabilities.includes('arabic_native')) return false
      if (req.minContextTokens && m.contextWindowTokens < req.minContextTokens) return false
      return m.capabilities.includes(req.primaryCapability)
    })
  }

  /**
   * Score and rank candidate models based on task requirement + cost preference
   */
  public scoreModel(model: ModelMetadata, req: TaskCapabilityRequirement): number {
    let score = 0

    // Capability match bonus
    if (model.capabilities.includes(req.primaryCapability)) score += 40
    if (req.secondaryCapabilities) {
      for (const sec of req.secondaryCapabilities) {
        if (model.capabilities.includes(sec)) score += 10
      }
    }

    // Quality Score (0-30 points)
    score += (model.qualityScore / 100) * 30

    // Cost Preference Weighting
    const costPref = req.costPreference || 'free_first'
    if (costPref === 'free_first') {
      if (model.costTier === 'free') score += 50
      else if (model.costTier === 'low_cost') score += 20
      else score += 0 // Premium tier penalty unless escalated
    } else if (costPref === 'quality_first') {
      if (model.costTier === 'premium') score += 30
      else if (model.costTier === 'free') score += 20
    } else if (costPref === 'speed_first') {
      score += (model.speedScore / 100) * 40
    }

    return score
  }

  /**
   * Resolve an ordered cascade chain of models for a specific agent role
   * Strictly puts best FREE models first, cascading to OpenRouter paid models as fallback
   */
  public resolveModelCascade(
    role: AgentRole,
    customReq?: Partial<TaskCapabilityRequirement>,
    userPreferredModel?: string
  ): string[] {
    const raw = this.resolveDefaultCascadeForRole(role, customReq)

    // Drop any id that is not an enabled/verified model, then guarantee the
    // chain is non-empty by appending the dynamically-ranked enabled models.
    const enabledIds = new Set(getEnabledModels().map((m) => m.id))
    let sanitized = raw.filter((id) => enabledIds.has(id))

    if (sanitized.length < 3) {
      const dynamic = this.resolveDefaultCascadeForRole('__dynamic__' as AgentRole, {
        ...AGENT_TASK_REQUIREMENTS[role],
        ...customReq,
      })
      sanitized = Array.from(new Set([...sanitized, ...dynamic.filter((id) => enabledIds.has(id))]))
    }

    // resolveModelCascade is used by BaseAIAgent.executePrompt exclusively for LLM text prompts.
    // Ensure all models in this cascade are strictly text models.
    sanitized = sanitized.filter((id) => isTextModel(id))

    if (userPreferredModel && userPreferredModel !== 'auto') {
      if (isTextModel(userPreferredModel)) {
        return [userPreferredModel, ...sanitized.filter((m) => m !== userPreferredModel)]
      }
    }

    return sanitized.length > 0 ? sanitized : raw.filter((id) => isTextModel(id))
  }

  private resolveDefaultCascadeForRole(
    role: AgentRole,
    customReq?: Partial<TaskCapabilityRequirement>
  ): string[] {
    const baseReq = AGENT_TASK_REQUIREMENTS[role] || {
      primaryCapability: 'deep_reasoning',
      costPreference: 'free_first',
    }
    const combinedReq: TaskCapabilityRequirement = { ...baseReq, ...customReq }

    // Task-specific tailored cascade chains
    switch (role) {
      case 'research':
        return [
          'gemini-2.5-flash',
          'qwen/qwen3.6-27b',
          'deepseek/deepseek-chat',
          'openai/gpt-4o-mini',
          'anthropic/claude-3.5-sonnet',
        ]

      case 'curriculum':
        return [
          'gemini-2.5-flash',
          'meta-llama/llama-3.3-70b-instruct',
          'deepseek/deepseek-r1',
          'anthropic/claude-3.7-sonnet',
          'anthropic/claude-3.5-sonnet',
        ]

      case 'knowledge':
        return [
          'gemini-2.5-flash',
          'qwen/qwen3.6-27b',
          'openai/gpt-4o-mini',
          'deepseek/deepseek-chat',
        ]

      case 'content_writer':
        return [
          'gemini-2.5-flash',
          'meta-llama/llama-3.3-70b-instruct',
          'openai/gpt-4o',
          'anthropic/claude-3.5-sonnet',
          'openai/gpt-4o-mini',
        ]

      case 'activities':
      case 'scenarios':
        return [
          'gemini-2.5-flash',
          'meta-llama/llama-3.3-70b-instruct',
          'anthropic/claude-3.7-sonnet',
          'anthropic/claude-3.5-sonnet',
          'qwen/qwen3.6-27b',
        ]

      case 'assessments':
        return [
          'gemini-2.5-flash',
          'qwen/qwen3.6-27b',
          'openai/gpt-4o-mini',
          'anthropic/claude-3.5-sonnet',
          'deepseek/deepseek-chat',
        ]

      case 'qa_critic':
        return [
          'deepseek/deepseek-r1',
          'gemini-2.5-flash',
          'anthropic/claude-3.7-sonnet',
          'meta-llama/llama-3.3-70b-instruct',
          'anthropic/claude-3.5-sonnet',
        ]

      case 'revision':
        return [
          'gemini-2.5-flash',
          'openai/gpt-4o-mini',
          'qwen/qwen3.6-27b',
          'anthropic/claude-3.5-sonnet',
        ]

      case 'compliance':
        return [
          'allam-2-7b',
          'gemini-2.5-flash',
          'qwen/qwen3.6-27b',
          'anthropic/claude-3.5-sonnet',
        ]

      case 'translator':
        return [
          'anthropic/claude-3.5-sonnet',
          'gemini-2.5-flash',
          'openai/gpt-4o-mini',
          'deepseek/deepseek-chat',
          'allam-2-7b',
        ]

      case 'image_ai': {
        // ImageAgent's executePrompt evaluates visual requirements via text reasoning.
        // Fast, high-reliability text models with JSON support are used.
        return [
          'gemini-2.5-flash',
          'llama-3.3-70b-versatile',
          'openai/gpt-oss-20b',
          'qwen/qwen3.6-27b',
          'deepseek/deepseek-chat',
        ]
      }

      default: {
        // Dynamic capability-based ranking over enabled models only.
        const candidates = getEnabledModels()
          .filter((m) => m.modality === 'text')
          .map((m) => ({ m, s: scoreModelForMode(m, combinedReq).score }))
          .filter((x) => x.s >= 0)
          .sort((a, b) => b.s - a.s)
        return candidates.map((c) => c.m.id)
      }
    }
  }

  /**
   * Get metadata for a specific model ID
   */
  public getModelMetadata(modelId: string): ModelMetadata | undefined {
    return MODEL_REGISTRY.find((m) => m.id === modelId)
  }
}

export const modelRegistry = AIModelRegistry.getInstance()

// ============================================================================
// CENTRAL MODEL RESOLUTION — SINGLE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
// Application code MUST use these helpers instead of `model.includes('recraft')`
// style string matching to decide provider / modality / endpoint. This is what
// structurally prevents an image model from being routed to a text endpoint
// (and vice-versa), and prevents provider mis-resolution (e.g. Google Imagen
// being sent to Cloudflare).
// ============================================================================

const IMAGE_CAPABILITIES: AIModelCapability[] = [
  'photorealistic_image',
  'vector_svg',
  'luxury_photography',
]

/** Capability-derived modality when a registry entry omits `modality`. */
function inferModalityFromMetadata(meta: ModelMetadata): ModelModality {
  if (meta.modality) return meta.modality
  if (meta.capabilities.some((c) => IMAGE_CAPABILITIES.includes(c)) && !meta.supportsJsonMode) {
    return 'image'
  }
  // A model that both reasons AND lists an image capability (e.g. multimodal
  // Gemini) is treated as text for routing: it can be called on a chat endpoint.
  return 'text'
}

/**
 * Known image-only model id fragments for ids that are NOT in the registry.
 * This list is the ONLY place string heuristics are permitted, and it is a
 * conservative denylist used purely as a safety net for unregistered ids.
 */
const UNREGISTERED_IMAGE_ID_HINTS = [
  'recraft', 'imagen', 'nano-banana', 'seedream', 'dreamshaper', 'sdxl',
  'stable-diffusion', 'flux-1-schnell', 'flux.2', 'flux-schnell', 'lucid-origin',
  'phoenix-1.0', 'sd-1.5', 'img2img', 'inpainting', 'lightning', 'krea',
  'mai-image', 'gpt-image', 'grok-imagine', 'qwen-image', 'flux.1',
  '-image', 'flux-1', 'lykon',
]

export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  if (!modelId) return undefined
  return MODEL_REGISTRY.find((m) => m.id === modelId)
}

/** Resolve modality for any model id — registered or not. */
export function getModelModality(modelId: string): ModelModality {
  const meta = getModelMetadata(modelId)
  if (meta) return inferModalityFromMetadata(meta)
  const lower = (modelId || '').toLowerCase()
  if (UNREGISTERED_IMAGE_ID_HINTS.some((h) => lower.includes(h))) return 'image'
  if (lower.includes('embed')) return 'embedding'
  return 'text'
}

export function isImageModel(modelId: string): boolean {
  return getModelModality(modelId) === 'image'
}

export function isTextModel(modelId: string): boolean {
  return getModelModality(modelId) === 'text'
}

/**
 * Resolve the provider for a model id from the registry. Falls back to a
 * deterministic mapping ONLY for ids missing from the registry.
 */
export function resolveProvider(modelId: string): ModelProvider {
  const meta = getModelMetadata(modelId)
  if (meta) return meta.provider

  const lower = (modelId || '').toLowerCase()
  // Google / Gemini family (text + Imagen/Nano-Banana image) — never Cloudflare.
  if (lower.startsWith('gemini') || lower.includes('imagen') || lower.includes('nano-banana')) {
    return 'gemini'
  }
  if (lower === 'allam-2-7b' || lower.startsWith('groq/') || lower.includes('compound')) return 'groq'
  if (lower.startsWith('@cf/')) return 'cloudflare'
  if (lower.startsWith('recraft-')) return 'recraft'
  if (modelId?.includes('/')) return 'openrouter'
  // Direct HF-style "Org/Model" or bare ids default to huggingface for text,
  // openrouter otherwise.
  return 'huggingface'
}

/**
 * Throws if `modelId` is not a text model. Call this before dispatching any
 * request to a chat/completions endpoint.
 */
export function assertTextModel(modelId: string, context = 'text request'): void {
  if (modelId && isImageModel(modelId)) {
    throw new Error(
      `[modelResolver] Refusing to route image model "${modelId}" to a ${context}. ` +
        `This model must go through the image generation pipeline.`,
    )
  }
}

/**
 * Throws if `modelId` is a text model being sent to an image endpoint.
 */
export function assertImageModel(modelId: string, context = 'image request'): void {
  if (modelId && isTextModel(modelId)) {
    throw new Error(
      `[modelResolver] Refusing to route text model "${modelId}" to a ${context}. ` +
        `Use a registered image model instead.`,
    )
  }
}

// ============================================================================
// ROUTING MODE + CAPABILITY-BASED SELECTION (with decision explanation)
// ============================================================================

let ACTIVE_ROUTING_MODE: RoutingMode = 'free_first'

/** Set the platform-wide routing strategy (admin control). */
export function setRoutingMode(mode: RoutingMode): void {
  ACTIVE_ROUTING_MODE = mode
}
export function getRoutingMode(): RoutingMode {
  return ACTIVE_ROUTING_MODE
}

export interface ImageRequirement {
  /** Visual category from the image requirement planner. */
  category:
    | 'photorealistic'
    | 'illustration'
    | 'diagram'
    | 'flowchart'
    | 'infographic'
    | 'vector_svg'
    | 'icon'
    | 'scenario'
    | 'image_edit'
  style?: string
  quality?: 'draft' | 'standard' | 'high'
  freePreferred?: boolean
  aspectRatio?: string
  allowPremium?: boolean
  routingMode?: RoutingMode
}

export interface ModelDecision {
  modelId: string
  provider: ModelProvider
  costTier: ModelCostTier
  isFree: boolean
  score: number
  reasons: string[]
  fallbacks: string[]
}

function isFreeModel(m: ModelMetadata): boolean {
  if (m.modality === 'image') return (m.pricingPerImageUSD ?? 0) === 0
  return m.costTier === 'free'
}

/**
 * Score a (normalized) model for a capability requirement under a routing mode.
 * Higher is better. Also returns the human-readable reasons behind the score.
 */
export function scoreModelForMode(
  model: ModelMetadata,
  req: TaskCapabilityRequirement,
  mode: RoutingMode = ACTIVE_ROUTING_MODE,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  if (model.capabilities.includes(req.primaryCapability)) {
    score += 40
    reasons.push(`matches required capability "${req.primaryCapability}"`)
  } else {
    return { score: -1, reasons: [`missing required capability "${req.primaryCapability}"`] }
  }
  for (const sec of req.secondaryCapabilities || []) {
    if (model.capabilities.includes(sec)) {
      score += 8
      reasons.push(`supports "${sec}"`)
    }
  }
  if (req.requiresJsonMode && !model.supportsJsonMode) {
    return { score: -1, reasons: ['does not support structured JSON mode'] }
  }
  if (req.requiresArabic && !model.capabilities.includes('arabic_native')) {
    return { score: -1, reasons: ['not Arabic-native'] }
  }
  if (req.minContextTokens && model.contextWindowTokens < req.minContextTokens) {
    return { score: -1, reasons: [`context window ${model.contextWindowTokens} < required ${req.minContextTokens}`] }
  }

  const quality = (model.qualityScore / 100)
  const speed = (model.speedScore / 100)
  const reliability = ((model.reliabilityScore ?? 90) / 100)
  const free = isFreeModel(model)

  switch (mode) {
    case 'free_first':
      score += free ? 50 : model.costTier === 'low_cost' ? 15 : 0
      score += quality * 20 + reliability * 15
      if (free) reasons.push('free tier (preferred)')
      else reasons.push(`paid (${model.costTier}) — penalised under free-first`)
      break
    case 'balanced':
      score += quality * 22 + reliability * 20 + speed * 10 + (free ? 12 : model.costTier === 'low_cost' ? 6 : 0)
      reasons.push(`balanced: q${model.qualityScore}/rel${model.reliabilityScore ?? 90}/spd${model.speedScore}`)
      break
    case 'quality_first':
      score += quality * 45 + reliability * 15
      if (!free) score += 8
      reasons.push(`quality-first: quality score ${model.qualityScore}`)
      break
    case 'premium':
      score += quality * 40 + reliability * 10 + (model.costTier === 'premium' ? 15 : 0)
      reasons.push('premium mode: best model regardless of cost')
      break
  }

  score += Math.max(0, (100 - (model.priority ?? 100)) / 20)
  return { score: Math.round(score * 10) / 10, reasons }
}

/**
 * Pick the best text/reasoning model for a capability requirement, with an
 * ordered fallback chain and an explanation of *why*.
 */
export function selectTextModel(
  req: TaskCapabilityRequirement,
  opts: { mode?: RoutingMode; excludeIds?: string[] } = {},
): ModelDecision | null {
  const mode: RoutingMode =
    opts.mode ?? (req.costPreference === 'quality_first' ? 'quality_first' : ACTIVE_ROUTING_MODE)
  const exclude = new Set(opts.excludeIds || [])
  const ranked = getEnabledModels()
    .filter((m) => m.modality === 'text' && !exclude.has(m.id))
    .map((m) => ({ m, ...scoreModelForMode(m, req, mode) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) return null
  const top = ranked[0]
  return {
    modelId: top.m.id,
    provider: top.m.provider,
    costTier: top.m.costTier,
    isFree: isFreeModel(top.m),
    score: top.score,
    reasons: [
      `Selected ${top.m.name} (${top.m.provider})`,
      ...top.reasons,
      `healthy: ${top.m.lastHealthCheckOk ?? 'assumed'}`,
      `routing mode: ${mode}`,
    ],
    fallbacks: ranked.slice(1, 5).map((x) => x.m.id),
  }
}

const IMAGE_CATEGORY_CAPS: Record<ImageRequirement['category'], AIModelCapability> = {
  photorealistic: 'photorealistic_image',
  illustration: 'photorealistic_image',
  diagram: 'vector_svg',
  flowchart: 'vector_svg',
  infographic: 'vector_svg',
  vector_svg: 'vector_svg',
  icon: 'vector_svg',
  scenario: 'photorealistic_image',
  image_edit: 'photorealistic_image',
}

/**
 * Resolve an ordered chain of IMAGE models for a visual requirement.
 * Free-first by default; premium models only appear when `allowPremium` or a
 * quality/premium routing mode is set. Every returned id is a verified,
 * enabled image model — a text model can never appear here.
 */
export function resolveImageModelChain(req: ImageRequirement): ModelDecision {
  const mode = req.routingMode ?? (req.allowPremium ? 'quality_first' : ACTIVE_ROUTING_MODE)
  const neededCap = IMAGE_CATEGORY_CAPS[req.category]
  const wantsFree = req.freePreferred !== false && mode === 'free_first' && !req.allowPremium

  const candidates = getEnabledModels()
    .filter((m) => m.modality === 'image' && m.capabilities.includes(neededCap))
    .filter((m) => (wantsFree ? isFreeModel(m) : true))

  const scored = candidates
    .map((m) => {
      const capReq: TaskCapabilityRequirement = { primaryCapability: neededCap, costPreference: 'free_first' }
      const base = scoreModelForMode(m, capReq, mode)
      let s = base.score
      const reasons = [...base.reasons]
      if (req.category === 'photorealistic' && m.capabilities.includes('luxury_photography')) {
        s += 10
        reasons.push('luxury photography capable')
      }
      if ((req.quality === 'draft' || req.category === 'icon') && m.capabilities.includes('fast_generation')) {
        s += 8
        reasons.push('fast few-step generation')
      }
      return { m, s, reasons }
    })
    .sort((a, b) => b.s - a.s)

  // Guaranteed safe fallback: deterministic SVG engine (always available, zero cost).
  const HARD_FALLBACK = req.category === 'vector_svg' || req.category === 'diagram' || req.category === 'flowchart'
    ? 'recraft-vector'
    : '@cf/black-forest-labs/flux-1-schnell'

  if (scored.length === 0) {
    return {
      modelId: HARD_FALLBACK,
      provider: resolveProvider(HARD_FALLBACK),
      costTier: 'free',
      isFree: true,
      score: 0,
      reasons: [`No enabled image model matched category "${req.category}" — using safe free fallback ${HARD_FALLBACK}`],
      fallbacks: [],
    }
  }

  const top = scored[0]
  const fallbacks = [...scored.slice(1).map((x) => x.m.id), HARD_FALLBACK].filter(
    (id, i, arr) => id !== top.m.id && arr.indexOf(id) === i,
  )

  return {
    modelId: top.m.id,
    provider: top.m.provider,
    costTier: top.m.costTier,
    isFree: isFreeModel(top.m),
    score: top.s,
    reasons: [
      `Selected ${top.m.name} for a ${req.category} visual`,
      ...top.reasons,
      wantsFree ? 'free-first policy applied' : 'premium models eligible',
      `routing mode: ${mode}`,
    ],
    fallbacks: fallbacks.slice(0, 5),
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * True only when `id` is a real persisted DB primary key (UUID). Client-side
 * draft ids (`img-1699...`, `temp_...`, `kb-doc-...`) return false and must
 * never be used in DB UPDATE/DELETE calls.
 */
export function isPersistedAssetId(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id)
}
