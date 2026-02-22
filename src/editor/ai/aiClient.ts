import { supabase } from '@/lib/supabase'
import type { AIConfig, AIRequestPayload } from '@/editor/types'
import { buildAIPrompt } from '@/editor/ai/promptBuilder'
import { extractTextFromAiResponse } from '@/lib/aiResponse'

export interface OpenAIResult {
  html: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
const DEFAULT_MAX_TOKENS = 1200
const DEFAULT_TEMPERATURE = 0.4

export async function requestAISuggestion(
  payload: AIRequestPayload,
  aiConfig?: AIConfig,
  _signal?: AbortSignal, // Supabase invoke doesn't easily support external signal in all versions
): Promise<OpenAIResult> {
  const model = aiConfig?.model || DEFAULT_MODEL
  const temperature = aiConfig?.temperature ?? DEFAULT_TEMPERATURE
  const maxOutputTokens = aiConfig?.maxOutputTokens ?? DEFAULT_MAX_TOKENS

  const prompt = buildAIPrompt({
    ...payload,
    model,
    temperature,
    maxOutputTokens,
  })

  try {
    const { data, error } = await supabase.functions.invoke('process-ai-request', {
      body: {
        model,
        prompt: prompt.system + '\n\n' + prompt.user,
        temperature,
        max_tokens: maxOutputTokens
      }
    })

    if (error) {
      throw new Error(`AI Gateway Error: ${error.message}`)
    }

    if (data && data.success === false) {
      throw new Error(data.error || 'AI request failed')
    }

    // Extract content using the shared utility which handles multiple possible response fields
    const rawContent = data?.response ?? data?.generated_text ?? data?.result ?? ''
    const html = extractTextFromAiResponse(rawContent, [
      'contentHtml',
      'content_html',
      'html',
      'content',
      'text',
      'result',
      'response',
      'output',
    ])

    if (!html) {
      throw new Error('AI response did not include editable content.')
    }

    return {
      html,
      usage: data?.usage,
    }
  } catch (err) {
    console.error('AI Edge Function Failure:', err)
    throw err
  }
}

