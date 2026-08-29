/**
 * HuggingFace Inference Provider for Altus Connect AI Engine
 * Provides serverless inference fallback using open models:
 * - Qwen/Qwen2.5-72B-Instruct
 * - mistralai/Mistral-7B-Instruct-v0.3
 * - meta-llama/Llama-3.3-70B-Instruct
 * - facebook/mms-tts-ara (Arabic speech)
 */

export interface HuggingFaceRequestOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  timeoutMs?: number
}

export interface HuggingFaceResponse {
  text: string
  modelUsed: string
  latencyMs: number
}

export class HuggingFaceProvider {
  private static instance: HuggingFaceProvider
  private apiKey: string
  private defaultModel = 'Qwen/Qwen2.5-72B-Instruct'

  private constructor() {
    // SECURITY (audit Phase 1): no client-side provider key. The HuggingFace tier
    // is served by the `process-ai-request` edge function, which holds the token
    // server-side. This class is kept only so the router import stays valid.
    this.apiKey = ''
  }

  public static getInstance(): HuggingFaceProvider {
    if (!HuggingFaceProvider.instance) {
      HuggingFaceProvider.instance = new HuggingFaceProvider()
    }
    return HuggingFaceProvider.instance
  }

  /**
   * Execute chat completion via HuggingFace Inference API
   */
  public async generateText(
    prompt: string,
    options: HuggingFaceRequestOptions = {}
  ): Promise<HuggingFaceResponse> {
    const startTime = Date.now()
    const model = options.model || this.defaultModel
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 2048
    const timeoutMs = options.timeoutMs ?? 25000

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const messages: Array<{ role: string; content: string }> = []
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      // Standard Hugging Face OpenAI-compatible or Inference API router
      const endpoint = `https://router.huggingface.co/hf-inference/models/${model}/v1/chat/completions`

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        // Try raw text generation endpoint fallback
        return await this.fallbackRawInference(prompt, model, options, controller.signal)
      }

      const data = await response.json()
      const text =
        data?.choices?.[0]?.message?.content ||
        data?.generated_text ||
        (Array.isArray(data) && data[0]?.generated_text) ||
        ''

      return {
        text: typeof text === 'string' ? text : JSON.stringify(text),
        modelUsed: `huggingface/${model}`,
        latencyMs: Date.now() - startTime,
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      throw new Error(
        `HuggingFace request failed: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Fallback raw text generation endpoint
   */
  private async fallbackRawInference(
    prompt: string,
    model: string,
    options: HuggingFaceRequestOptions,
    signal: AbortSignal
  ): Promise<HuggingFaceResponse> {
    const startTime = Date.now()
    const endpoint = `https://api-inference.huggingface.co/models/${model}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const fullPrompt = options.systemPrompt
      ? `${options.systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
      : prompt

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: options.maxTokens || 1500,
          temperature: options.temperature || 0.7,
          return_full_text: false,
        },
      }),
      signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`HuggingFace HTTP ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data = await response.json()
    let generatedText = ''
    if (Array.isArray(data) && data[0]?.generated_text) {
      generatedText = data[0].generated_text
    } else if (typeof data === 'string') {
      generatedText = data
    } else if (data?.generated_text) {
      generatedText = data.generated_text
    }

    return {
      text: generatedText,
      modelUsed: `huggingface/${model}`,
      latencyMs: Date.now() - startTime,
    }
  }

  /**
   * Check if HuggingFace is reachable
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch('https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-72B-Instruct/v1/models', {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      })
      return res.status < 500
    } catch {
      return false
    }
  }
}

export const huggingFaceProvider = HuggingFaceProvider.getInstance()
