export const AI_TASKS = ['chat', 'summarization'] as const

export type AiTask = (typeof AI_TASKS)[number]

export interface ProcessAiRequest {
  model?: string
  prompt: string
  task?: AiTask
  temperature?: number
  max_tokens?: number
  maxOutputTokens?: number
}

export interface ProcessAiSuccessResponse {
  success: true
  response: string
  result: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  meta?: {
    modelUsed?: string
    usedBackupToken?: boolean
    forcedMinimax?: boolean
    internalServiceCall?: boolean
  }
}

export interface ProcessAiErrorResponse {
  success: false
  error: string
}

export type ProcessAiResponse = ProcessAiSuccessResponse | ProcessAiErrorResponse

export function isProcessAiErrorResponse(response: ProcessAiResponse | null | undefined): response is ProcessAiErrorResponse {
  return Boolean(response && response.success === false)
}

