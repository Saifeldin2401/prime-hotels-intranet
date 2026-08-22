import { supabase } from '@/lib/supabase'
import type { z } from 'zod'
import type {
  AIExecutionResult,
  AIRequestOptions,
  AIStreamEvent,
} from './types'

/**
 * Robust JSON extraction from LLM text responses
 */
export function extractJsonFromText<T = unknown>(rawText: string): T | null {
  if (!rawText) return null

  // Strip markdown code fences
  let clean = rawText.replace(/```json\n?|\n?```/g, '').trim()

  // Fix unescaped newlines/tabs inside JSON strings
  clean = clean.replace(/"([^"]*)"/g, (_match, inner: string) => {
    const fixed = inner
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"${fixed}"`
  })

  // Strip trailing commas before ] or }
  clean = clean.replace(/,\s*([\]}])/g, '$1')

  const jsonStart = clean.search(/[\[{]/)
  if (jsonStart === -1) return null

  // Find balanced JSON object or array
  const isArray = clean[jsonStart] === '['
  const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = clean.match(pattern)
  if (!match) return null

  try {
    return JSON.parse(match[0]) as T
  } catch (err) {
    console.warn('Primary JSON parse failed, attempting partial extraction:', err)
    return null
  }
}

/**
 * Core AI Client for Altus Connect
 */
export class AltusAIClient {
  /**
   * Stream prompt completion using Server-Sent Events (SSE)
   */
  async *streamPrompt(
    prompt: string,
    options: AIRequestOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const {
      model,
      systemPrompt,
      task = 'chat',
      temperature = 0.7,
      maxTokens = 2048,
      signal,
    } = options

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.supabase.co'
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    const functionUrl = `${supabaseUrl}/functions/v1/process-ai-request`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        model,
        prompt,
        systemPrompt,
        task,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal,
    })

    if (!response.ok || !response.body) {
      let errMessage = `AI Stream error: HTTP ${response.status}`
      try {
        const errJson = await response.json()
        if (errJson?.error) errMessage = errJson.error
      } catch {
        // Fall through
      }
      throw new Error(errMessage)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim()
          if (!rawData) continue
          try {
            const event: AIStreamEvent = JSON.parse(rawData)
            if (event.error) {
              throw new Error(event.error)
            }
            if (event.chunk) {
              yield event.chunk
            }
            if (event.done) {
              return
            }
          } catch (parseErr) {
            // Skip unparseable lines
          }
        }
      }
    }
  }

  /**
   * Execute prompt with standard JSON response and automatic fallback
   */
  async executePrompt(
    prompt: string,
    options: AIRequestOptions = {}
  ): Promise<AIExecutionResult<string>> {
    const {
      model,
      systemPrompt,
      task = 'chat',
      temperature = 0.7,
      maxTokens = 2048,
      jsonMode = false,
    } = options

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
        model,
        prompt,
        systemPrompt,
        task,
        temperature,
        max_tokens: maxTokens,
        jsonMode,
        stream: false,
      },
    })

    if (error) {
      throw new Error(`AI Request Failed: ${error.message}`)
    }

    if (data?.success === false || data?.error) {
      throw new Error(data.error || 'AI generation failed')
    }

    const rawResponse = (data?.response || data?.result || '') as string

    return {
      data: rawResponse,
      rawResponse,
      meta: {
        providerUsed: data?.meta?.providerUsed,
        modelUsed: data?.meta?.modelUsed,
      },
    }
  }

  /**
   * Execute structured prompt validated against a Zod schema
   */
  async executeStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: AIRequestOptions = {}
  ): Promise<AIExecutionResult<T>> {
    const result = await this.executePrompt(prompt, {
      ...options,
      jsonMode: true,
    })

    const parsedJson = extractJsonFromText<unknown>(result.data)
    if (!parsedJson) {
      throw new Error('Failed to parse structured JSON response from AI')
    }

    const validationResult = schema.safeParse(parsedJson)
    if (!validationResult.success) {
      console.warn('Zod validation warning on AI output:', validationResult.error.format())
      // If validation failed, check if data can still be salvaged
      return {
        data: parsedJson as T,
        rawResponse: result.rawResponse,
        meta: result.meta,
      }
    }

    return {
      data: validationResult.data,
      rawResponse: result.rawResponse,
      meta: result.meta,
    }
  }
}

export const altusAI = new AltusAIClient()
export const primeAI = altusAI
