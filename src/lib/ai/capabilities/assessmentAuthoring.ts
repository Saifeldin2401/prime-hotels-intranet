/**
 * Capability: assessmentAuthoring
 * ---------------------------------------------------------------------------
 * Thin wrapper over the existing psychometric assessment agent
 * (src/lib/ai/agents/assessmentAgent.ts). Generates quiz questions from a
 * title + context passage.
 *
 * Grounding policy: grounded-generative. Questions are written against the
 * supplied `contextContent` (a lesson / SOP passage). The agent may invent
 * plausible distractors but the correct answer must be supported by the context.
 */

import { assessmentAgent, type AssessmentAgentInput } from '@/lib/ai/agents/assessmentAgent'
import type { GeneratedUnifiedQuestion } from '@/types/aiCourseEngine'
import type { AgentExecutionResult } from '@/lib/ai/agents/types'
import type { GroundingPolicy } from './types'
import { AIQuizGenerationSchema } from './schemas'

export const assessmentAuthoringGroundingPolicy: GroundingPolicy = {
  mode: 'grounded-generative',
  retrievalSource: 'none',
  rlsEnforcedBy:
    'Caller supplies the context passage; no direct DB read in this capability. Persisting questions is the caller\'s responsibility and RLS-checked there.',
  fallbackBehaviour:
    'If context is empty the agent returns fewer / generic questions; callers should reject a zero-length result.',
  notes:
    'Output validated against AIQuizGenerationSchema (best-effort — the agent already returns typed GeneratedUnifiedQuestion[]).',
}

export type AssessmentAuthoringInput = AssessmentAgentInput

export interface AssessmentAuthoringResult {
  questions: GeneratedUnifiedQuestion[]
  modelUsed: string
  warnings?: string[]
}

export async function authorAssessment(
  input: AssessmentAuthoringInput,
): Promise<AssessmentAuthoringResult> {
  const result: AgentExecutionResult<GeneratedUnifiedQuestion[]> = await assessmentAgent.process(input)

  // Loose shape check — mirror the course schema surface without rejecting the
  // agent's richer per-question fields.
  const parsed = AIQuizGenerationSchema.safeParse(
    (result.data ?? []).map((q) => ({
      question_text: q.question_text ?? '',
      question_type: 'mcq' as const,
      correct_answer: String(q.correct_answer ?? ''),
    })),
  )

  return {
    questions: result.data ?? [],
    modelUsed: result.modelUsed,
    warnings: [
      ...(result.warnings ?? []),
      ...(parsed.success ? [] : ['assessment output failed loose schema check']),
    ],
  }
}

export { assessmentAgent }
