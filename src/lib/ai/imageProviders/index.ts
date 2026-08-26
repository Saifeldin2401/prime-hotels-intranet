/**
 * Image Generation Service Registry
 * Exclusive Cloudflare Workers AI Engine for PRIME Hotels Intranet
 */

import { ImageCostTier, ImageProviderType } from '@/types/aiCourseEngine'
import {
  APPROVED_CLOUDFLARE_MODELS,
  CloudflareWorkersAIProvider,
  DEFAULT_CLOUDFLARE_IMAGE_MODEL,
  FALLBACK_CLOUDFLARE_IMAGE_MODEL,
  cloudflareProvider,
} from './cloudflareProvider'
import { ImageGenerationRequest, ImageGenerationResult, ImageModelInfo, ImageProvider, ProviderStatus } from './types'

export * from './cloudflareProvider'
export * from './types'

export class ImageGenerationService {
  private providers: Map<ImageProviderType, ImageProvider> = new Map()
  private defaultProvider: ImageProviderType = 'cloudflare'
  private defaultCostTier: ImageCostTier = 'free_only'

  constructor() {
    this.registerProvider(cloudflareProvider)
  }

  registerProvider(provider: ImageProvider) {
    this.providers.set(provider.id, provider)
  }

  getProvider(id: ImageProviderType = this.defaultProvider): ImageProvider {
    const provider = this.providers.get(id)
    if (!provider) {
      return cloudflareProvider
    }
    return provider
  }

  /**
   * Retrieves all approved $0.00 Cloudflare Workers AI image models
   */
  getAllAvailableModels(costTier: ImageCostTier = this.defaultCostTier): ImageModelInfo[] {
    const models: ImageModelInfo[] = []
    this.providers.forEach((provider) => {
      const providerModels = provider.getAvailableModels()
      if (costTier === 'free_only') {
        models.push(...providerModels.filter((m) => m.isFree))
      } else {
        models.push(...providerModels)
      }
    })
    return models
  }

  /**
   * Dispatches an image generation request with strict Free-Only Cloudflare protection
   */
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const providerId = 'cloudflare'
    const costTier = 'free_only'
    const provider = this.getProvider(providerId)

    // Strict Free-Only guard for approved Cloudflare models
    if (!provider.validateModel(request.model, 'free_only')) {
      request.model = DEFAULT_CLOUDFLARE_IMAGE_MODEL
    }

    return await provider.generateImage(request)
  }

  /**
   * Checks status of Cloudflare Workers AI provider and Neurons quota
   */
  async getSystemStatus(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = []
    for (const [, provider] of this.providers) {
      try {
        const status = await provider.getProviderStatus()
        statuses.push(status)
      } catch {
        statuses.push({
          provider: provider.id,
          isAvailable: false,
          freeModelsAvailable: false,
          activeModelCount: 0,
          rateLimitStatus: 'blocked',
          lastChecked: new Date().toISOString(),
        })
      }
    }
    return statuses
  }
}

export const imageGenerationService = new ImageGenerationService()

