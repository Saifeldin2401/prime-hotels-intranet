import { describe, it, expect, vi, beforeEach } from 'vitest'
import { multiProviderRouter } from './multiProviderRouter'
import { huggingFaceProvider } from './huggingFaceProvider'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

vi.mock('./huggingFaceProvider', () => ({
  huggingFaceProvider: {
    generateText: vi.fn(),
  },
}))

describe('MultiProviderRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return correct candidate chain based on task type', () => {
    const fastCandidates = multiProviderRouter.getCandidateChain('fast')
    expect(fastCandidates.length).toBeGreaterThan(2)
    expect(fastCandidates[0].model).toBe('gemini-3.1-flash-lite')

    const complianceCandidates = multiProviderRouter.getCandidateChain('compliance')
    expect(complianceCandidates[0].model).toBe('allam-2-7b')

    const reasoningCandidates = multiProviderRouter.getCandidateChain('reasoning')
    expect(reasoningCandidates[0].model).toBe('gemini-2.5-flash')
  })

  it('should prioritize preferred model if provided', () => {
    const customCandidates = multiProviderRouter.getCandidateChain('general', 'allam-2-7b')
    expect(customCandidates[0].model).toBe('allam-2-7b')
    expect(customCandidates[0].provider).toBe('groq')
  })

  it('should successfully execute with primary provider when healthy', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        success: true,
        response: 'VIP arrival checklist generated successfully.',
        meta: { providerUsed: 'gemini', modelUsed: 'gemini-2.5-flash' },
      },
      error: null,
    } as any)

    const response = await multiProviderRouter.execute('Generate VIP SOP', { task: 'reasoning' })
    expect(response.rawText).toContain('VIP arrival checklist')
    expect(response.failoverCount).toBe(0)
    expect(response.tier).toBe(1)
  })

  it('should cascade to secondary/tertiary provider if primary fails', async () => {
    // Primary fails
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: 'Gemini rate limit 429' },
    } as any)

    // Secondary succeeds
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        success: true,
        response: 'Fallback response from OpenRouter DeepSeek R1.',
      },
      error: null,
    } as any)

    const failoverHook = vi.fn()
    const response = await multiProviderRouter.execute('Generate Course', {
      task: 'reasoning',
      onFailover: failoverHook,
    })

    expect(response.rawText).toContain('Fallback response')
    expect(response.failoverCount).toBe(1)
    expect(failoverHook).toHaveBeenCalledTimes(1)
  })

  it('should cascade to HuggingFace if earlier edge providers fail', async () => {
    // First two fail
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Gateway 504 Timeout'))

    // Hugging Face mock returns
    vi.mocked(huggingFaceProvider.generateText).mockResolvedValueOnce({
      text: 'Response from HuggingFace Qwen 2.5 72B',
      modelUsed: 'huggingface/Qwen/Qwen2.5-72B-Instruct',
      latencyMs: 340,
    })

    const response = await multiProviderRouter.execute('Emergency SOP drill', { task: 'compliance' })
    expect(response.providerUsed).toBe('huggingface')
    expect(response.rawText).toContain('Response from HuggingFace')
  })
})
