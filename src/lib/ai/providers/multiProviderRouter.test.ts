import { describe, it, expect, vi, beforeEach } from 'vitest'
import { multiProviderRouter } from './multiProviderRouter'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

describe('MultiProviderRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return correct candidate chain based on task type', () => {
    // Groq LPU leads every text cascade (measured 2-5x faster on this deployment).
    const fastCandidates = multiProviderRouter.getCandidateChain('fast')
    expect(fastCandidates.length).toBeGreaterThan(2)
    expect(fastCandidates[0].model).toBe('openai/gpt-oss-20b')
    expect(fastCandidates[0].provider).toBe('groq')

    const complianceCandidates = multiProviderRouter.getCandidateChain('compliance')
    expect(complianceCandidates[0].model).toBe('allam-2-7b')

    const reasoningCandidates = multiProviderRouter.getCandidateChain('reasoning')
    expect(reasoningCandidates[0].model).toBe('openai/gpt-oss-120b')
    expect(reasoningCandidates[0].provider).toBe('groq')
    // pathologically slow models must never be in a text cascade
    expect(reasoningCandidates.every((c) => c.model !== 'deepseek/deepseek-r1' && c.model !== 'openai/gpt-4o')).toBe(true)
  })

  it('should prioritize preferred model if provided', () => {
    const customCandidates = multiProviderRouter.getCandidateChain('general', 'allam-2-7b')
    expect(customCandidates[0].model).toBe('allam-2-7b')
    expect(customCandidates[0].provider).toBe('groq')
  })

  it('MUST NOT prepend an image model to a text cascade (regression #1)', () => {
    const chain = multiProviderRouter.getCandidateChain('reasoning', 'recraft-vector')
    expect(chain.every((c) => c.model !== 'recraft-vector')).toBe(true)
    // falls back to the default reasoning cascade (Groq-first)
    expect(chain[0].model).toBe('openai/gpt-oss-120b')
  })

  it('MUST skip an image model that reaches the cascade and never call the API with it', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, response: 'ok text' },
      error: null,
    } as any)

    // recraft-vector is an image model; the router must ignore it and still succeed
    const res = await multiProviderRouter.execute('write a checklist', {
      task: 'reasoning',
      preferredModel: 'recraft-vector',
    })
    expect(res.modelUsed).not.toBe('recraft-vector')
    const callModels = vi.mocked(supabase.functions.invoke).mock.calls.map(
      (c: any) => c[1]?.body?.model,
    )
    expect(callModels).not.toContain('recraft-vector')
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

  it('every provider (incl. HuggingFace) is served through the edge gateway — no client-side keys', async () => {
    // First attempt fails, gateway then serves a later candidate and reports the real provider via meta.
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({ data: null, error: { message: 'Gateway 504 Timeout' } } as any)
      .mockResolvedValueOnce({
        data: { success: true, response: 'Response from HuggingFace Qwen 2.5 72B', meta: { providerUsed: 'huggingface', modelUsed: 'Qwen/Qwen2.5-72B-Instruct' } },
        error: null,
      } as any)

    const response = await multiProviderRouter.execute('Emergency SOP drill', { task: 'compliance' })
    expect(response.providerUsed).toBe('huggingface')
    expect(response.rawText).toContain('Response from HuggingFace')
    // never a direct provider fetch from the browser
    const calls = vi.mocked(supabase.functions.invoke).mock.calls
    expect(calls.every((c: any) => c[0] === 'process-ai-request')).toBe(true)
  })
})
