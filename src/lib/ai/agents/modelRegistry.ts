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
  ModelCostTier,
  ModelMetadata,
  ModelProvider,
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
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    provider: 'gemini',
    costTier: 'free',
    capabilities: ['structured_json', 'high_speed', 'long_context'],
    contextWindowTokens: 524288,
    qualityScore: 88,
    speedScore: 98,
    supportsJsonMode: true,
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
    name: 'Llama 3.3 70B Instruct (Groq)',
    provider: 'groq',
    costTier: 'free',
    capabilities: ['deep_reasoning', 'structured_json', 'creative_narrative', 'arabic_native'],
    contextWindowTokens: 128000,
    qualityScore: 93,
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

  // ── 4. CLOUDFLARE WORKERS AI (Free Text & Image) ──
  {
    id: '@cf/bytedance/stable-diffusion-xl-lightning',
    name: 'SDXL Lightning (Cloudflare Free)',
    provider: 'cloudflare',
    costTier: 'free',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 86,
    speedScore: 95,
    supportsJsonMode: false,
  },
  {
    id: '@cf/black-forest-labs/flux-1-schnell',
    name: 'FLUX.1 Schnell (Cloudflare Free)',
    provider: 'cloudflare',
    costTier: 'free',
    capabilities: ['photorealistic_image'],
    contextWindowTokens: 0,
    qualityScore: 91,
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

  // ── 5. RECRAFT SOTA VECTOR & ILLUSTRATIONS (Free Recraft First) ──
  {
    id: 'recraft-vector',
    name: 'Recraft Vector (Free Vector/SVG)',
    provider: 'recraft',
    costTier: 'free',
    capabilities: ['vector_svg', 'structured_json'],
    contextWindowTokens: 0,
    qualityScore: 98,
    speedScore: 88,
    supportsJsonMode: false,
  },
  {
    id: 'recraft-v3',
    name: 'Recraft v3 (Free Educational Illustration)',
    provider: 'recraft',
    costTier: 'free',
    capabilities: ['photorealistic_image', 'vector_svg'],
    contextWindowTokens: 0,
    qualityScore: 96,
    speedScore: 85,
    supportsJsonMode: false,
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
    primaryCapability: 'photorealistic_image',
    secondaryCapabilities: ['vector_svg'],
    requiresJsonMode: false,
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
    return MODEL_REGISTRY.filter((m) => {
      if (m.isDeprecated) return false
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
    // If user explicitly picked a non-auto model, place it at index 0
    if (userPreferredModel && userPreferredModel !== 'auto') {
      const remaining = this.resolveDefaultCascadeForRole(role, customReq).filter((m) => m !== userPreferredModel)
      return [userPreferredModel, ...remaining]
    }

    return this.resolveDefaultCascadeForRole(role, customReq)
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

      case 'image_ai':
        return [
          'recraft-vector',
          'recraft-v3',
          '@cf/bytedance/stable-diffusion-xl-lightning',
          '@cf/black-forest-labs/flux-1-schnell',
        ]

      default:
        // Dynamic algorithm matching
        const candidates = MODEL_REGISTRY.slice()
          .filter((m) => !m.isDeprecated)
          .sort((a, b) => this.scoreModel(b, combinedReq) - this.scoreModel(a, combinedReq))

        return candidates.map((c) => c.id)
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
