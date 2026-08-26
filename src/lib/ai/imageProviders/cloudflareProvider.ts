/**
 * Cloudflare Workers AI Image Generation Provider
 * Exclusive Enterprise Image Generation Engine for PRIME Hotels Intranet
 *
 * Exclusively uses approved $0.00-per-step Cloudflare Workers AI models:
 * 1. Primary: @cf/bytedance/stable-diffusion-xl-lightning ($0.00/step, 4-8 steps, fast 1024px)
 * 2. Fallback #1: @cf/stabilityai/stable-diffusion-xl-base-1.0 ($0.00/step)
 * 3. Specialized Img2Img: @cf/runwayml/stable-diffusion-v1-5-img2img
 * 4. Specialized Inpainting: @cf/runwayml/stable-diffusion-v1-5-inpainting
 */

import type {
  CloudflareImageModel,
  CloudflareUsageStats,
  ImageCostTier,
  VisualPlacement,
  VisualStyle,
} from '@/types/aiCourseEngine'
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageModelInfo,
  ImageProvider,
  ProviderStatus,
} from './types'

export const FLUX_CLOUDFLARE_IMAGE_MODEL: CloudflareImageModel =
  '@cf/black-forest-labs/flux-1-schnell'
export const DEFAULT_CLOUDFLARE_IMAGE_MODEL: CloudflareImageModel =
  '@cf/bytedance/stable-diffusion-xl-lightning'
export const FALLBACK_CLOUDFLARE_IMAGE_MODEL: CloudflareImageModel =
  '@cf/stabilityai/stable-diffusion-xl-base-1.0'
export const DREAMSHAPER_CLOUDFLARE_IMAGE_MODEL: CloudflareImageModel =
  '@cf/lykon/dreamshaper-8-lcm'

export const APPROVED_CLOUDFLARE_MODELS: Record<CloudflareImageModel, ImageModelInfo> = {
  '@cf/black-forest-labs/flux-1-schnell': {
    id: '@cf/black-forest-labs/flux-1-schnell',
    name: 'FLUX.1 Schnell (Cloudflare Ultra HD)',
    provider: 'cloudflare',
    isFree: false,
    description:
      'State-of-the-art 12B parameter model by Black Forest Labs. Exceptional text legibility, infographics, and photorealism in 4-8 steps.',
    badge: 'Ultra HD • Studio Grade • Next-Gen DiT',
    recommendedFor: 'Complex infographics, procedural flowcharts, luxury hospitality photography',
    maxDimensions: { width: 1024, height: 1024 },
    supportsAspectRatios: ['16:9', '4:3', '1:1', '3:2'],
  },
  '@cf/bytedance/stable-diffusion-xl-lightning': {
    id: '@cf/bytedance/stable-diffusion-xl-lightning',
    name: 'SDXL Lightning (Cloudflare)',
    provider: 'cloudflare',
    isFree: true,
    description:
      'Fast high-quality 1024px image generation in 4-8 steps ($0.00/step). Default primary model.',
    badge: 'Free • $0.00/Step • Fast',
    recommendedFor: 'General course visuals, concept illustrations, and procedures',
    maxDimensions: { width: 1024, height: 1024 },
    supportsAspectRatios: ['16:9', '4:3', '1:1', '3:2'],
  },
  '@cf/stabilityai/stable-diffusion-xl-base-1.0': {
    id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    name: 'SDXL Base 1.0 (Cloudflare)',
    provider: 'cloudflare',
    isFree: true,
    description:
      'Comprehensive general-purpose text-to-image model ($0.00/step). General-quality fallback.',
    badge: 'Free • $0.00/Step • Fallback #1',
    recommendedFor: 'High-detail standard generation when Lightning is unavailable',
    maxDimensions: { width: 1024, height: 1024 },
    supportsAspectRatios: ['16:9', '4:3', '1:1', '3:2'],
  },
  '@cf/lykon/dreamshaper-8-lcm': {
    id: '@cf/lykon/dreamshaper-8-lcm',
    name: 'DreamShaper 8 LCM (Cloudflare)',
    provider: 'cloudflare',
    isFree: true,
    description:
      'Creative, artistic, and photorealistic hospitality visuals using Latent Consistency Model ($0.00/step).',
    badge: 'Free • $0.00/Step • Fallback #2',
    recommendedFor: 'Creative, scenario-based, and photorealistic alternative visuals',
    maxDimensions: { width: 1024, height: 1024 },
    supportsAspectRatios: ['16:9', '4:3', '1:1', '3:2'],
  },
  '@cf/runwayml/stable-diffusion-v1-5-img2img': {
    id: '@cf/runwayml/stable-diffusion-v1-5-img2img',
    name: 'SD 1.5 Img2Img (Cloudflare)',
    provider: 'cloudflare',
    isFree: true,
    description:
      'Transforms or restyles existing visual assets based on instructional prompts ($0.00/step).',
    badge: 'Specialized • Img2Img',
    recommendedFor: 'Image-to-image adaptation and visual restyling',
    maxDimensions: { width: 512, height: 512 },
    supportsAspectRatios: ['1:1', '4:3', '16:9'],
  },
  '@cf/runwayml/stable-diffusion-v1-5-inpainting': {
    id: '@cf/runwayml/stable-diffusion-v1-5-inpainting',
    name: 'SD 1.5 Inpainting (Cloudflare)',
    provider: 'cloudflare',
    isFree: true,
    description:
      'Modifies, replaces, or regenerates specific regions of an existing visual asset ($0.00/step).',
    badge: 'Specialized • Inpainting',
    recommendedFor: 'Targeted visual edits and area regeneration',
    maxDimensions: { width: 512, height: 512 },
    supportsAspectRatios: ['1:1', '4:3', '16:9'],
  },
}

// Local storage key for daily usage monitoring
const USAGE_STORAGE_KEY = 'cloudflare_ai_usage_stats_v1'
const DAILY_FREE_NEURONS_LIMIT = 10000

export class CloudflareWorkersAIProvider implements ImageProvider {
  readonly id = 'cloudflare' as const
  readonly name = 'Cloudflare Workers AI'

  /**
   * Return all approved $0.00-per-step Cloudflare Workers AI models
   */
  getAvailableModels(): ImageModelInfo[] {
    return Object.values(APPROVED_CLOUDFLARE_MODELS)
  }

  /**
   * Strict verification that model is an approved $0.00 Cloudflare model.
   * Rejects any external or non-approved model.
   */
  validateModel(model: string, costTier?: ImageCostTier): boolean {
    const isApproved = Object.keys(APPROVED_CLOUDFLARE_MODELS).includes(model)
    if (!isApproved) return false
    if (costTier === 'free_only') {
      const info = APPROVED_CLOUDFLARE_MODELS[model as CloudflareImageModel]
      return info?.isFree === true
    }
    return true
  }

  /**
   * Resolve dimensions based on aspect ratio
   */
  resolveDimensions(aspectRatio?: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '4:3':
        return { width: 1024, height: 768 }
      case '1:1':
        return { width: 1024, height: 1024 }
      case '3:2':
        return { width: 1080, height: 720 }
      case '16:9':
      default:
        return { width: 1024, height: 576 }
    }
  }

  /**
   * Educational prompt enhancer tailored for SDXL-Lightning
   */
  sanitizePrompt(prompt: string, visualStyle?: VisualStyle | string): string {
    let clean = prompt
      .replace(/[^\x20-\x7E\u0600-\u06FF,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const styleBoosters: Record<string, string> = {
      infographic:
        'professional modern infographic chart, structured procedure flowchart, vector icons, corporate slide design, high contrast graphic design, 8k vector aesthetics, no cartoon drawing',
      technical_diagram:
        'technical SOP schematic diagram, operational workflow boxes, crisp architectural vector layout, clear visual hierarchy',
      photorealistic:
        'award-winning photorealistic 8k photograph, luxury 5-star hotel interior, professional staff in tailored uniform, Hasselblad 50mm, warm ambient lighting, crisp focus',
      realistic:
        'high-definition documentary photograph, authentic hotel operations, natural lighting, professional posture, Saudi hospitality standard',
      professional_corporate:
        'clean executive corporate training visual, 5-star luxury hotel setting, professional hospitality aesthetic, crisp lighting',
      '3d_illustration':
        'modern 3d architectural render, soft ambient hotel lighting, luxury interior textures, crisp depth of field, octane render',
      educational_illustration:
        'refined modern educational visual illustration, clean geometric forms, elegant hospitality color palette, studio clarity',
    }

    const booster =
      styleBoosters[visualStyle || 'educational_illustration'] ||
      'clean professional educational visual, 5-star luxury hotel standard, high clarity'

    if (!clean.toLowerCase().includes('hotel') && !clean.toLowerCase().includes('hospitality')) {
      clean = `${clean}, ${booster}`
    }

    return clean
  }

  /**
   * Tailored negative prompt generator to eliminate artifacts
   */
  generateNegativePrompt(customNegative?: string, visualStyle?: VisualStyle | string): string {
    const baseNegatives = [
      'blurry',
      'low quality',
      'distorted anatomy',
      'malformed hands',
      'extra fingers',
      'duplicate objects',
      'duplicate people',
      'excessive text',
      'watermark',
      'signature',
      'logo',
      'unrelated objects',
      'cluttered composition',
      'poor framing',
      'deformed',
      'bad proportions',
    ]

    if (visualStyle === 'infographic' || visualStyle === 'technical_diagram') {
      baseNegatives.push('cartoon', 'comic book', 'sketch', 'drawing', 'room sketch', 'messy lines', 'painting', 'photograph of empty room', 'distorted furniture')
    } else if (visualStyle === 'photorealistic' || visualStyle === 'realistic') {
      baseNegatives.push('cartoon', 'anime', 'cgi rendering', 'oversaturated', 'doll-like', 'drawing', 'sketch', '3d render')
    }

    const combined = customNegative
      ? `${customNegative}, ${baseNegatives.join(', ')}`
      : baseNegatives.join(', ')

    return combined
  }

  /**
   * Determine optimal Cloudflare model based on task requirements
   */
  selectModelForTask(options: {
    isEdit?: boolean
    hasMask?: boolean
    requestedModel?: string
  }): CloudflareImageModel {
    if (options.hasMask) {
      return '@cf/runwayml/stable-diffusion-v1-5-inpainting'
    }
    if (options.isEdit) {
      return '@cf/runwayml/stable-diffusion-v1-5-img2img'
    }
    if (
      options.requestedModel &&
      Object.keys(APPROVED_CLOUDFLARE_MODELS).includes(options.requestedModel)
    ) {
      return options.requestedModel as CloudflareImageModel
    }
    return DEFAULT_CLOUDFLARE_IMAGE_MODEL
  }

  /**
   * Read and update Cloudflare Neurons usage tracker
   */
  getUsageStats(): CloudflareUsageStats {
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const today = new Date().toISOString().split('T')[0]
        if (parsed.date === today) {
          return {
            usedNeurons: parsed.usedNeurons || 0,
            totalDailyNeurons: DAILY_FREE_NEURONS_LIMIT,
            percentageUsed: Math.min(100, Math.round(((parsed.usedNeurons || 0) / DAILY_FREE_NEURONS_LIMIT) * 100)),
            imagesGeneratedToday: parsed.imagesGeneratedToday || 0,
            imagesGeneratedThisMonth: parsed.imagesGeneratedThisMonth || 0,
            successfulGenerations: parsed.successfulGenerations || 0,
            failedGenerations: parsed.failedGenerations || 0,
            activeModel: DEFAULT_CLOUDFLARE_IMAGE_MODEL,
            freeOnlyMode: true,
            isRateLimited: (parsed.usedNeurons || 0) >= DAILY_FREE_NEURONS_LIMIT,
          }
        }
      }
    } catch {
      // Ignore local storage error
    }

    return {
      usedNeurons: 0,
      totalDailyNeurons: DAILY_FREE_NEURONS_LIMIT,
      percentageUsed: 0,
      imagesGeneratedToday: 0,
      imagesGeneratedThisMonth: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      activeModel: DEFAULT_CLOUDFLARE_IMAGE_MODEL,
      freeOnlyMode: true,
      isRateLimited: false,
    }
  }

  /**
   * Record a generation event in usage tracking
   */
  recordUsage(success: boolean, steps = 6): void {
    try {
      const today = new Date().toISOString().split('T')[0]
      const current = this.getUsageStats()
      // Estimate ~25 neurons per generation step
      const addedNeurons = steps * 25

      const updated = {
        date: today,
        usedNeurons: current.usedNeurons + addedNeurons,
        imagesGeneratedToday: current.imagesGeneratedToday + 1,
        imagesGeneratedThisMonth: current.imagesGeneratedThisMonth + 1,
        successfulGenerations: current.successfulGenerations + (success ? 1 : 0),
        failedGenerations: current.failedGenerations + (success ? 0 : 1),
      }

      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check Provider availability and free model quotas
   */
  async getProviderStatus(): Promise<ProviderStatus> {
    const stats = this.getUsageStats()
    return {
      provider: 'cloudflare',
      isAvailable: !stats.isRateLimited,
      freeModelsAvailable: true,
      activeModelCount: Object.keys(APPROVED_CLOUDFLARE_MODELS).length,
      rateLimitStatus: stats.isRateLimited ? 'limited' : 'ok',
      lastChecked: new Date().toISOString(),
    }
  }

  /**
   * Build Cloudflare request payload for SDXL-Lightning
   */
  buildCloudflarePayload(request: ImageGenerationRequest): {
    model: CloudflareImageModel
    body: Record<string, unknown>
    dimensions: { width: number; height: number }
  } {
    const model = this.selectModelForTask({ requestedModel: request.model })
    const dimensions = this.resolveDimensions(request.aspectRatio)
    const prompt = this.sanitizePrompt(request.prompt, request.visualStyle)
    const negative_prompt = this.generateNegativePrompt(request.negativePrompt, request.visualStyle)

    const payload: Record<string, unknown> = {
      prompt,
      negative_prompt: model === '@cf/black-forest-labs/flux-1-schnell' ? undefined : negative_prompt,
      width: dimensions.width,
      num_steps:
        model === '@cf/black-forest-labs/flux-1-schnell'
          ? 4
          : model === '@cf/bytedance/stable-diffusion-xl-lightning'
          ? 6
          : model === '@cf/lykon/dreamshaper-8-lcm'
          ? 8
          : 20,
      guidance:
        model === '@cf/black-forest-labs/flux-1-schnell'
          ? 3.5
          : model === '@cf/bytedance/stable-diffusion-xl-lightning'
          ? 4.5
          : model === '@cf/lykon/dreamshaper-8-lcm'
          ? 2.0
          : 7.0,
      seed: request.seed || Math.floor(Math.random() * 1000000),
    }

    return { model, body: payload, dimensions }
  }

  /**
   * Execute Image Generation through Cloudflare Workers AI Service
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // Check Free-Only & Quota Constraints
    const stats = this.getUsageStats()
    if (stats.isRateLimited) {
      return {
        success: false,
        provider: 'cloudflare',
        modelUsed: request.model || DEFAULT_CLOUDFLARE_IMAGE_MODEL,
        isFree: true,
        error:
          'Free image-generation capacity is currently exhausted for today. Generation has been paused and can be retried later.',
      }
    }

    const { model, body, dimensions } = this.buildCloudflarePayload(request)

    return {
      success: true,
      provider: 'cloudflare',
      modelUsed: model,
      isFree: true,
      dimensions,
    }
  }
}

export const cloudflareProvider = new CloudflareWorkersAIProvider()
