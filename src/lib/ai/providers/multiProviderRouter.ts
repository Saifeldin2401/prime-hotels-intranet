/**
 * Universal Multi-Provider AI Gateway & Cascading Router
 * 
 * Orchestrates zero-downtime AI requests with 5-tier autonomous fallback:
 * Tier 1: Google Gemini (2.5 Flash, 2.0 Flash, 3.1 Flash-Lite)
 * Tier 2: Groq LPU Cloud (Qwen 3.6 27B, ALLaM 2 7B, Llama 3.3 70B)
 * Tier 3: OpenRouter Enterprise (Claude 3.5 Sonnet, DeepSeek R1, GPT-4o-mini)
 * Tier 4: HuggingFace Serverless Inference (Qwen 2.5 72B, Mistral Large)
 * Tier 5: Cloudflare Workers AI / Local Heuristic Failover
 */

import { supabase } from '@/lib/supabase'
import { huggingFaceProvider } from './huggingFaceProvider'

export type AITaskCategory = 'fast' | 'reasoning' | 'compliance' | 'roleplay' | 'general'

export interface MultiProviderRequestOptions {
  task?: AITaskCategory
  preferredModel?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  jsonMode?: boolean
  timeoutMs?: number
  onFailover?: (fromProvider: string, toProvider: string, reason: string) => void
}

export interface MultiProviderResponse<T = string> {
  data: T
  rawText: string
  providerUsed: string
  modelUsed: string
  latencyMs: number
  failoverCount: number
  tier: number
}

interface ProviderCandidate {
  tier: number
  provider: 'gemini' | 'groq' | 'openrouter' | 'huggingface' | 'cloudflare'
  model: string
  supportsJson: boolean
}

export class MultiProviderRouter {
  private static instance: MultiProviderRouter

  private constructor() {}

  public static getInstance(): MultiProviderRouter {
    if (!MultiProviderRouter.instance) {
      MultiProviderRouter.instance = new MultiProviderRouter()
    }
    return MultiProviderRouter.instance
  }

  /**
   * Determine prioritized provider candidate chain based on task type
   */
  public getCandidateChain(task: AITaskCategory = 'general', preferredModel?: string): ProviderCandidate[] {
    if (preferredModel && preferredModel !== 'auto') {
      return [
        { tier: 1, provider: this.inferProvider(preferredModel), model: preferredModel, supportsJson: true },
        ...this.getDefaultCascade(task).filter(c => c.model !== preferredModel),
      ]
    }

    return this.getDefaultCascade(task)
  }

  private inferProvider(modelId: string): 'gemini' | 'groq' | 'openrouter' | 'huggingface' | 'cloudflare' {
    if (modelId.startsWith('gemini')) return 'gemini'
    if (modelId.startsWith('groq') || modelId === 'allam-2-7b') return 'groq'
    if (modelId.startsWith('huggingface') || modelId.startsWith('Qwen/')) return 'huggingface'
    if (modelId.startsWith('@cf/')) return 'cloudflare'
    return 'openrouter'
  }

  private getDefaultCascade(task: AITaskCategory): ProviderCandidate[] {
    switch (task) {
      case 'reasoning':
      case 'roleplay':
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-3.7-sonnet', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'deepseek/deepseek-r1', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'openai/gpt-4o', supportsJson: true },
          { tier: 3, provider: 'groq', model: 'qwen/qwen3.6-27b', supportsJson: true },
          { tier: 4, provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', supportsJson: false },
          { tier: 5, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
        ]

      case 'compliance':
        return [
          { tier: 1, provider: 'groq', model: 'allam-2-7b', supportsJson: true },
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct', supportsJson: true },
          { tier: 3, provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', supportsJson: false },
          { tier: 4, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
        ]

      case 'fast':
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-3.1-flash-lite', supportsJson: true },
          { tier: 1, provider: 'groq', model: 'qwen/qwen3.6-27b', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'deepseek/deepseek-chat', supportsJson: true },
          { tier: 3, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
          { tier: 4, provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.3', supportsJson: false },
        ]

      case 'general':
      default:
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
          { tier: 3, provider: 'groq', model: 'qwen/qwen3.6-27b', supportsJson: true },
          { tier: 4, provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', supportsJson: false },
          { tier: 5, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
        ]
    }
  }

  /**
   * Execute prompt with automatic cascading failover across all candidate providers
   */
  public async execute<T = string>(
    prompt: string,
    options: MultiProviderRequestOptions = {}
  ): Promise<MultiProviderResponse<T>> {
    const startTime = Date.now()
    const task = options.task || 'general'
    const candidates = this.getCandidateChain(task, options.preferredModel)
    let lastError: Error | null = null
    let failoverCount = 0

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const candidateStartTime = Date.now()

      try {
        let resultText = ''

        if (candidate.provider === 'huggingface') {
          // Direct HuggingFace Inference API execution
          const hfRes = await huggingFaceProvider.generateText(prompt, {
            model: candidate.model,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            timeoutMs: options.timeoutMs || 20000,
          })
          resultText = hfRes.text
        } else {
          // Supabase Edge Function AI Gateway for Gemini / Groq / OpenRouter / Cloudflare
          const { data, error } = await supabase.functions.invoke<{
            success: boolean
            response?: string
            result?: string
            error?: string
            meta?: {
              providerUsed?: string
              modelUsed?: string
            }
          }>('process-ai-request', {
            body: {
              model: candidate.model,
              prompt,
              systemPrompt: options.systemPrompt,
              task: options.task || 'chat',
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2048,
              jsonMode: options.jsonMode ?? false,
              stream: false,
            },
          })

          if (error) {
            throw new Error(`Edge Gateway error: ${error.message}`)
          }

          if (data?.success === false || data?.error) {
            throw new Error(data?.error || 'Provider generation failed')
          }

          resultText = (data?.response || data?.result || '') as string
        }

        if (!resultText || resultText.trim().length === 0) {
          throw new Error(`Empty response returned from ${candidate.provider} (${candidate.model})`)
        }

        let parsedData = resultText as unknown as T
        if (options.jsonMode) {
          try {
            const cleaned = resultText.replace(/```json\n?|\n?```/g, '').trim()
            parsedData = JSON.parse(cleaned) as T
          } catch {
            // Keep raw if JSON parse fails
          }
        }

        return {
          data: parsedData,
          rawText: resultText,
          providerUsed: candidate.provider,
          modelUsed: candidate.model,
          latencyMs: Date.now() - candidateStartTime,
          failoverCount,
          tier: candidate.tier,
        }
      } catch (err: unknown) {
        failoverCount++
        lastError = err instanceof Error ? err : new Error(String(err))
        const nextCandidate = candidates[i + 1]

        console.warn(
          `[MultiProviderRouter] ${candidate.provider} (${candidate.model}) failed: ${lastError.message}.` +
            (nextCandidate
              ? ` Cascading to Tier ${nextCandidate.tier} ${nextCandidate.provider} (${nextCandidate.model})...`
              : ' No more fallback candidates.')
        )

        if (options.onFailover && nextCandidate) {
          options.onFailover(
            `${candidate.provider} (${candidate.model})`,
            `${nextCandidate.provider} (${nextCandidate.model})`,
            lastError.message
          )
        }
      }
    }

    throw new Error(
      `All ${candidates.length} AI providers failed in cascade chain. Last error: ${lastError?.message || 'Unknown failure'}`
    )
  }
}

export const multiProviderRouter = MultiProviderRouter.getInstance()
