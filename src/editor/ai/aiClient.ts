import { buildAIPrompt } from '@/editor/ai/promptBuilder'
import type { AIConfig, AIRequestPayload } from '@/editor/types'
import { extractTextFromAiResponse } from '@/lib/aiResponse'
import { multiProviderRouter } from '@/lib/ai/providers/multiProviderRouter'

export interface OpenAIResult {
  html: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

const DEFAULT_MAX_TOKENS = 1200
const DEFAULT_TEMPERATURE = 0.4

export async function requestAISuggestion(
  payload: AIRequestPayload,
  aiConfig?: AIConfig,
  _signal?: AbortSignal,
): Promise<OpenAIResult> {
  const temperature = aiConfig?.temperature ?? DEFAULT_TEMPERATURE
  const maxOutputTokens = aiConfig?.maxOutputTokens ?? DEFAULT_MAX_TOKENS

  const prompt = buildAIPrompt({
    ...payload,
    temperature,
    maxOutputTokens,
  })

  try {
    const res = await multiProviderRouter.execute(prompt.user, {
      task: 'reasoning',
      systemPrompt: prompt.system,
      temperature,
      maxTokens: maxOutputTokens,
    })

    const rawContent = res.rawText || ''
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
    }
  } catch (err) {
    console.error('Editor AI Failure:', err)
    throw err
  }
}
