/**
 * Altus AI Enterprise SDK Type Definitions
 */

export type AIModelTier = 'fast' | 'balanced' | 'reasoning' | 'embedding'

export type AITask = 'chat' | 'summarization' | 'generation' | 'translation' | 'triage'

export interface AIRequestOptions {
  model?: string
  tier?: AIModelTier
  task?: AITask
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  signal?: AbortSignal
  propertyId?: string
  department?: string
  role?: string
}

export interface AIStreamEvent {
  chunk?: string
  done: boolean
  error?: string
  meta?: {
    provider?: string
    model?: string
  }
}

export interface AIExecutionResult<T = string> {
  data: T
  rawResponse: string
  meta?: {
    providerUsed?: string
    modelUsed?: string
    tokensUsed?: {
      input?: number
      output?: number
    }
  }
}

export interface AIMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    id: string
    title: string
    url?: string
    snippet?: string
  }>
}

export interface ModuleOutlineSection {
  heading: string
  suggestedBlockType: 'text' | 'video' | 'document_link' | 'scenario'
  summary: string
  rich_content?: string
}

export interface ModuleOutline {
  title: string
  description: string
  sections: ModuleOutlineSection[]
  suggestedQuizCheckpoints?: string[]
}

export interface AIQuizQuestion {
  question_text: string
  question_type: 'mcq' | 'true_false' | 'multi_select' | 'open_ended'
  options?: string[]
  correct_answer: string
  points: number
  explanation?: string
  hint?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  source_snippet?: string
}
