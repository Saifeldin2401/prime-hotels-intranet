import { supabase } from '@/lib/supabase'
import { multiProviderRouter } from './providers/multiProviderRouter'
import type { z } from 'zod'
import type {
  AIExecutionResult,
  AIRequestOptions,
  AIStreamEvent,
} from './types'

/**
 * Sanitize unescaped newlines and tabs inside JSON string values
 */
function sanitizeJsonStringLiterals(input: string): string {
  let inString = false
  let escaped = false
  let result = ''

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"' && !escaped) {
      inString = !inString
      result += ch
    } else if (inString && (ch === '\n' || ch === '\r')) {
      result += '\\n'
    } else if (inString && ch === '\t') {
      result += '\\t'
    } else {
      result += ch
    }
    escaped = ch === '\\' && !escaped
  }

  return result
}

/**
 * Robust JSON extraction from LLM text responses
 */
export function extractJsonFromText<T = unknown>(rawText: string): T | null {
  if (!rawText || typeof rawText !== 'string') return null

  // 1. Direct parse attempt
  const trimmed = rawText.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {}

  // 1b. Direct parse with string sanitization
  try {
    return JSON.parse(sanitizeJsonStringLiterals(trimmed)) as T
  } catch {}

  // 2. Strip markdown code blocks
  let clean = rawText
    .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
    .trim()

  try {
    return JSON.parse(clean) as T
  } catch {}

  try {
    return JSON.parse(sanitizeJsonStringLiterals(clean)) as T
  } catch {}

  // 3. Locate JSON start
  const jsonStart = clean.search(/[[{]/)
  if (jsonStart === -1) return null

  clean = clean.slice(jsonStart)
  const isArray = clean.startsWith('[')

  // 4. Try stripping trailing commas and balancing
  let candidate = clean.replace(/,\s*([}\]])/g, '$1')

  const lastClose = isArray ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}')
  if (lastClose !== -1) {
    const bounded = candidate.slice(0, lastClose + 1)
    try {
      return JSON.parse(bounded) as T
    } catch {}

    try {
      return JSON.parse(sanitizeJsonStringLiterals(bounded)) as T
    } catch {}
  }

  // 5. Array-specific recovery: extract all complete JSON objects within the array
  if (isArray) {
    const objectMatches = clean.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
    if (objectMatches && objectMatches.length > 0) {
      const recoveredObjects: unknown[] = []
      for (const objStr of objectMatches) {
        try {
          const sanitizedObj = sanitizeJsonStringLiterals(objStr.replace(/,\s*}/g, '}'))
          const parsedObj = JSON.parse(sanitizedObj)
          if (parsedObj && typeof parsedObj === 'object') {
            recoveredObjects.push(parsedObj)
          }
        } catch {}
      }

      if (recoveredObjects.length > 0) {
        return recoveredObjects as unknown as T
      }
    }
  }

  // 6. Object-specific recovery
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try {
      const sanitized = sanitizeJsonStringLiterals(objMatch[0].replace(/,\s*}/g, '}'))
      return JSON.parse(sanitized) as T
    } catch (err) {
      console.warn('[extractJsonFromText] Failed all recovery attempts:', err)
    }
  }

  return null
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
   * Execute prompt with standard JSON response and automatic 5-tier multi-provider fallback
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

    const routerTask =
      task === 'code'
        ? 'reasoning'
        : task === 'translation'
        ? 'compliance'
        : task === 'summary'
        ? 'fast'
        : 'general'

    const res = await multiProviderRouter.execute<string>(prompt, {
      task: routerTask,
      preferredModel: model,
      systemPrompt,
      temperature,
      maxTokens,
      jsonMode,
    })

    return {
      data: res.rawText,
      rawResponse: res.rawText,
      meta: {
        providerUsed: res.providerUsed,
        modelUsed: res.modelUsed,
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

  /**
   * High-accuracy multilingual translation for hotel SOPs, courses, and UI text
   */
  async translateText(
    text: string,
    targetLang: string,
    targetLangName: string = targetLang
  ): Promise<string> {
    if (!text || !text.trim()) return text

    const systemPrompt = `You are the master multilingual hospitality translation engine for ALTUS Hospitality & Hotels (Saudi Arabia / KSA).
Translate the provided hotel operational content, Standard Operating Procedures (SOP), training course, or guest service guideline into ${targetLangName} (${targetLang}).

RULES:
1. Translate accurately into 5-star luxury hospitality phrasing suitable for Saudi Arabia and international hospitality.
2. PRESERVE all HTML tags (<p>, <h3>, <ul>, <li>, <strong>, <table>, etc.) and markdown formatting intact.
3. PRESERVE variables, placeholders, and technical IDs unchanged.
4. Output ONLY the translated content without any commentary.`

    const result = await this.executePrompt(text, {
      systemPrompt,
      temperature: 0.2,
      task: 'chat',
    })

    return (result.data || text).trim()
  }

  /**
   * Batch translation for multiple strings or training blocks
   */
  async translateBatch(
    texts: string[],
    targetLang: string,
    targetLangName: string = targetLang
  ): Promise<string[]> {
    if (!Array.isArray(texts) || texts.length === 0) return []

    const nonEmpties = texts.map((t, idx) => ({ t, idx })).filter(item => item.t && item.t.trim().length > 0)
    if (nonEmpties.length === 0) return [...texts]

    const systemPrompt = `You are the master multilingual hospitality translation engine for ALTUS Hospitality & Hotels.
Translate each text item in the "items" array into ${targetLangName} (${targetLang}).
PRESERVE all HTML and Markdown formatting.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "translations": ["translated string 1", "translated string 2"]
}`

    try {
      const result = await this.executePrompt(
        JSON.stringify({ items: nonEmpties.map(item => item.t) }),
        {
          systemPrompt,
          temperature: 0.1,
          jsonMode: true,
        }
      )

      const parsed = extractJsonFromText<{ translations?: string[] } | string[]>(result.data)
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { translations?: string[] }).translations))
        ? (parsed as { translations?: string[] }).translations
        : null

      if (list && list.length === nonEmpties.length) {
        const out = [...texts]
        nonEmpties.forEach((item, i) => {
          out[item.idx] = list[i] || item.t
        })
        return out
      }
    } catch (err) {
      console.warn('Batch AI translation failed, falling back to sequential:', err)
    }

    // Sequential fallback
    const out = [...texts]
    for (const item of nonEmpties) {
      out[item.idx] = await this.translateText(item.t, targetLang, targetLangName)
    }
    return out
  }
}

export const altusAI = new AltusAIClient()
export const primeAI = altusAI
export const aiClient = altusAI
