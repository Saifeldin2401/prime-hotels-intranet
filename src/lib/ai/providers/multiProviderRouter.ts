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
import { isImageModel, resolveProvider } from '@/lib/ai/agents/modelRegistry'

export type AITaskCategory = 'fast' | 'reasoning' | 'compliance' | 'roleplay' | 'general'

/**
 * Gateway capability class. When supplied, the edge gateway consults its
 * DB-backed router (get_ai_routing_plan) to pick the best currently-available
 * model for this capability under the active policy — the client-side cascade
 * below becomes a fallback rather than the primary route.
 */
export type AICapabilityClass =
  | 'structured_json'
  | 'reasoning'
  | 'fast'
  | 'compliance'
  | 'long_form'
  | 'image'

export interface MultiProviderRequestOptions {
  task?: AITaskCategory
  capability?: AICapabilityClass
  /** Agent role — forwarded to the gateway so get_ai_routing_plan can apply the
   *  matching ai_agent_policies row (disabled_model_ids / force_model_id). */
  agentRole?: string
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
    // Central registry decides modality — an image model is NEVER prepended to
    // a text cascade. This is the structural guarantee against the
    // "openrouter (recraft-vector) failed: Empty response" class of bug.
    const preferredIsImage = Boolean(preferredModel && preferredModel !== 'auto' && isImageModel(preferredModel))
    if (preferredIsImage) {
      console.warn(
        `[MultiProviderRouter] Ignoring image model "${preferredModel}" for text task "${task}" — ` +
          `image models are handled by the image pipeline.`,
      )
    }

    if (preferredModel && preferredModel !== 'auto' && !preferredIsImage) {
      return [
        { tier: 1, provider: this.inferProvider(preferredModel), model: preferredModel, supportsJson: true },
        ...this.getDefaultCascade(task).filter(c => c.model !== preferredModel),
      ]
    }

    return this.getDefaultCascade(task)
  }

  private inferProvider(modelId: string): 'gemini' | 'groq' | 'openrouter' | 'huggingface' | 'cloudflare' {
    const p = resolveProvider(modelId)
    // The text router has no dedicated 'recraft' path; recraft ids are image
    // models and are filtered out before this point.
    return p === 'recraft' ? 'openrouter' : p
  }

  private getDefaultCascade(task: AITaskCategory): ProviderCandidate[] {
    switch (task) {
      case 'reasoning':
      case 'roleplay':
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'groq', model: 'openai/gpt-oss-120b', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'deepseek/deepseek-r1', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-haiku-4.5', supportsJson: true },
          { tier: 3, provider: 'openrouter', model: 'anthropic/claude-opus-4.5', supportsJson: true },
          { tier: 3, provider: 'openrouter', model: 'openai/gpt-4o', supportsJson: true },
          { tier: 4, provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', supportsJson: false },
          { tier: 5, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
        ]

      case 'compliance':
        return [
          { tier: 1, provider: 'groq', model: 'allam-2-7b', supportsJson: true },
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'anthropic/claude-haiku-4.5', supportsJson: true },
          { tier: 3, provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', supportsJson: false },
          { tier: 4, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
          { tier: 5, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
        ]

      case 'fast':
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash-lite', supportsJson: true },
          { tier: 1, provider: 'groq', model: 'openai/gpt-oss-20b', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'google/gemini-2.5-flash-lite', supportsJson: true },
          { tier: 3, provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct', supportsJson: true },
          { tier: 4, provider: 'huggingface', model: 'mistralai/Mistral-7B-Instruct-v0.3', supportsJson: false },
        ]

      case 'general':
      default:
        return [
          { tier: 1, provider: 'gemini', model: 'gemini-2.5-flash', supportsJson: true },
          { tier: 2, provider: 'groq', model: 'openai/gpt-oss-120b', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'openai/gpt-4o-mini', supportsJson: true },
          { tier: 2, provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324', supportsJson: true },
          { tier: 3, provider: 'openrouter', model: 'anthropic/claude-haiku-4.5', supportsJson: true },
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

      // Defense-in-depth: never dispatch an image model to a chat endpoint.
      if (isImageModel(candidate.model)) {
        console.warn(`[MultiProviderRouter] Skipping image model "${candidate.model}" in text cascade.`)
        continue
      }

      try {
        let resultText = ''
        let actualProvider: ProviderCandidate['provider'] = candidate.provider
        let actualModel = candidate.model

        {
          // Every provider (incl. HuggingFace) is served by the edge gateway, which
          // holds the keys server-side. No provider key ever reaches the browser.
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
              provider: candidate.provider,
              prompt,
              systemPrompt: options.systemPrompt,
              task: options.task || 'chat',
              capability: options.capability,
              agentRole: options.agentRole,
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
          if (data?.meta?.providerUsed) actualProvider = data.meta.providerUsed as ProviderCandidate['provider']
          if (data?.meta?.modelUsed) actualModel = data.meta.modelUsed
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
          providerUsed: actualProvider,
          modelUsed: actualModel,
          latencyMs: Date.now() - candidateStartTime,
          failoverCount,
          tier: candidate.tier,
        }
      } catch (err: unknown) {
        failoverCount++
        lastError = err instanceof Error ? err : new Error(String(err))
        const nextCandidate = candidates[i + 1]

        console.error(
          `%c[MultiProviderRouter] ❌ ${candidate.provider} (${candidate.model}) Failed:%c`,
          'color: #ef4444; font-weight: bold;',
          '',
          {
            error: lastError.message,
            provider: candidate.provider,
            model: candidate.model,
            tier: candidate.tier,
            latencyMs: Date.now() - candidateStartTime,
          }
        )

        if (nextCandidate) {
          console.warn(
            `%c[MultiProviderRouter] 🔄 Cascading to Tier ${nextCandidate.tier} ${nextCandidate.provider} (${nextCandidate.model})...%c`,
            'color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.1); padding: 2px 4px; border-radius: 4px;',
            ''
          )
        } else {
          console.error(
            `%c[MultiProviderRouter] 🛑 Exhausted all ${candidates.length} candidates in cascade chain.%c`,
            'color: #ef4444; font-weight: bold;',
            ''
          )
        }

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
