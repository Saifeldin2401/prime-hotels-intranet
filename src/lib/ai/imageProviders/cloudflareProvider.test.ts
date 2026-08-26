import { describe, expect, it } from 'vitest'
import {
  APPROVED_CLOUDFLARE_MODELS,
  CloudflareWorkersAIProvider,
  DEFAULT_CLOUDFLARE_IMAGE_MODEL,
  FALLBACK_CLOUDFLARE_IMAGE_MODEL,
  cloudflareProvider,
} from './cloudflareProvider'

describe('CloudflareWorkersAIProvider', () => {
  it('should list all approved Cloudflare models including FLUX.1 Schnell', () => {
    const models = cloudflareProvider.getAvailableModels()
    expect(models.length).toBe(6)

    const modelIds = models.map((m) => m.id)
    expect(modelIds).toContain('@cf/black-forest-labs/flux-1-schnell')
    expect(modelIds).toContain('@cf/bytedance/stable-diffusion-xl-lightning')
    expect(modelIds).toContain('@cf/stabilityai/stable-diffusion-xl-base-1.0')
    expect(modelIds).toContain('@cf/lykon/dreamshaper-8-lcm')
    expect(modelIds).toContain('@cf/runwayml/stable-diffusion-v1-5-img2img')
    expect(modelIds).toContain('@cf/runwayml/stable-diffusion-v1-5-inpainting')
  })

  it('should strictly validate approved Cloudflare models and reject all third party models', () => {
    expect(cloudflareProvider.validateModel('@cf/black-forest-labs/flux-1-schnell')).toBe(true)
    expect(cloudflareProvider.validateModel('@cf/bytedance/stable-diffusion-xl-lightning', 'free_only')).toBe(true)
    expect(cloudflareProvider.validateModel('@cf/stabilityai/stable-diffusion-xl-base-1.0', 'free_only')).toBe(true)
    expect(cloudflareProvider.validateModel('@cf/lykon/dreamshaper-8-lcm', 'free_only')).toBe(true)
    expect(cloudflareProvider.validateModel('@cf/runwayml/stable-diffusion-v1-5-img2img', 'free_only')).toBe(true)
    expect(cloudflareProvider.validateModel('@cf/runwayml/stable-diffusion-v1-5-inpainting', 'free_only')).toBe(true)

    // Third-party models MUST be strictly rejected
    expect(cloudflareProvider.validateModel('dall-e-3', 'free_only')).toBe(false)
    expect(cloudflareProvider.validateModel('recraft/recraft-v3:free', 'free_only')).toBe(false)
    expect(cloudflareProvider.validateModel('flux', 'free_only')).toBe(false)
    expect(cloudflareProvider.validateModel('midjourney-v6', 'free_only')).toBe(false)
  })

  it('should correctly resolve aspect ratios to Cloudflare image dimensions', () => {
    expect(cloudflareProvider.resolveDimensions('16:9')).toEqual({ width: 1024, height: 576 })
    expect(cloudflareProvider.resolveDimensions('4:3')).toEqual({ width: 1024, height: 768 })
    expect(cloudflareProvider.resolveDimensions('1:1')).toEqual({ width: 1024, height: 1024 })
    expect(cloudflareProvider.resolveDimensions('3:2')).toEqual({ width: 1080, height: 720 })
  })

  it('should sanitize prompt and inject 5-star Saudi hospitality visual boosters', () => {
    const sanitized = cloudflareProvider.sanitizePrompt('Front desk luggage check-in', 'educational_illustration')
    expect(sanitized).toContain('Front desk luggage check-in')
    expect(sanitized).toContain('elegant hospitality color palette')
  })

  it('should generate tailored negative prompts removing artifacts and watermarks', () => {
    const negative = cloudflareProvider.generateNegativePrompt(undefined, 'photorealistic')
    expect(negative).toContain('blurry')
    expect(negative).toContain('distorted anatomy')
    expect(negative).toContain('malformed hands')
    expect(negative).toContain('watermark')
    expect(negative).toContain('cartoon')
  })

  it('should select specialized models for Img2Img and Inpainting tasks', () => {
    expect(cloudflareProvider.selectModelForTask({})).toBe(DEFAULT_CLOUDFLARE_IMAGE_MODEL)
    expect(cloudflareProvider.selectModelForTask({ isEdit: true })).toBe('@cf/runwayml/stable-diffusion-v1-5-img2img')
    expect(cloudflareProvider.selectModelForTask({ hasMask: true })).toBe('@cf/runwayml/stable-diffusion-v1-5-inpainting')
  })

  it('should build valid Cloudflare Workers AI execution payload', () => {
    const { model, body, dimensions } = cloudflareProvider.buildCloudflarePayload({
      prompt: 'Concierge welcoming VIP guest at grand lobby',
      model: '@cf/bytedance/stable-diffusion-xl-lightning',
      aspectRatio: '16:9',
      courseId: 'c1',
      moduleId: 'm1',
      lessonId: 'l1',
      title: 'Concierge Greeting',
      altText: 'Concierge Greeting VIP',
    })

    expect(model).toBe(DEFAULT_CLOUDFLARE_IMAGE_MODEL)
    expect(body.prompt).toContain('Concierge welcoming VIP guest')
    expect(body.negative_prompt).toContain('blurry')
    expect(body.num_steps).toBe(6)
    expect(body.guidance).toBe(4.5)
    expect(dimensions).toEqual({ width: 1024, height: 576 })
  })

  it('should track daily Neurons usage accurately', () => {
    const stats = cloudflareProvider.getUsageStats()
    expect(stats.totalDailyNeurons).toBe(10000)
    expect(stats.freeOnlyMode).toBe(true)
    expect(typeof stats.usedNeurons).toBe('number')
  })
})
