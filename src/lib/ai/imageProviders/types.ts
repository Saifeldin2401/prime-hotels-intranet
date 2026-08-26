/**
 * Image Provider Abstraction Types
 * Decouples image-generation providers from the core AI Course Engine orchestrator.
 */

import { ImageCostTier, ImageProviderType, VisualPlacement, VisualStyle } from '@/types/aiCourseEngine'

export interface ImageModelInfo {
  id: string
  name: string
  provider: ImageProviderType
  isFree: boolean
  description: string
  badge?: string
  recommendedFor?: string
  maxDimensions?: { width: number; height: number }
  supportsAspectRatios: string[]
}

export interface ImageGenerationRequest {
  prompt: string
  negativePrompt?: string
  model: string
  provider?: ImageProviderType
  costTier?: ImageCostTier
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:2' | string
  visualStyle?: VisualStyle | string
  placement?: VisualPlacement | string
  seed?: number
  courseId: string
  moduleId: string
  lessonId: string
  title: string
  title_ar?: string
  altText: string
  altText_ar?: string
  caption?: string
  caption_ar?: string
  educationalPurpose?: string
  visualConcept?: string
  timeoutMs?: number
}

export interface ImageGenerationResult {
  success: boolean
  imageUrl?: string
  storagePath?: string
  rawBuffer?: ArrayBuffer
  provider: ImageProviderType | string
  modelUsed: string
  isFree: boolean
  dimensions?: { width: number; height: number }
  error?: string
  diagnostics?: string[]
}

export interface ProviderStatus {
  provider: ImageProviderType
  isAvailable: boolean
  freeModelsAvailable: boolean
  activeModelCount: number
  rateLimitStatus?: 'ok' | 'limited' | 'blocked'
  lastChecked: string
}

export interface ImageProvider {
  readonly id: ImageProviderType
  readonly name: string
  getAvailableModels(): ImageModelInfo[]
  validateModel(model: string, costTier?: ImageCostTier): boolean
  getProviderStatus(): Promise<ProviderStatus>
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>
}
