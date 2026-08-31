/**
 * Capability: gapAnalysis  (NEW — STUB inputs, real LLM summary)
 * ---------------------------------------------------------------------------
 * Given quiz attempt data, produce:
 *   - failingObjectives  : objectives with high failure rates
 *   - misleadingQuestions: questions with poor discrimination (high performers
 *                          miss them / distractors chosen evenly)
 *   - summary            : an LLM-written narrative for the training team
 *   - recommendedActions : concrete next steps
 *
 * The interface and the LLM summary call are REAL. The attempt-data INPUT is
 * TODO: this stub takes an already-aggregated `AttemptAggregate` so the
 * aggregation SQL can be built later without changing this contract.
 *
 * Grounding policy: rules-with-llm-narration. Deterministic stats decide what is
 * failing / misleading; the model only writes the human-readable summary from
 * those stats.
 */

import { altusAI, extractJsonFromText } from '@/lib/ai/client'
import type { CapabilityCallContext, GroundingPolicy } from './types'
import { GapAnalysisResultSchema, type GapAnalysisResult } from './schemas'

export const gapAnalysisGroundingPolicy: GroundingPolicy = {
  mode: 'rules-with-llm-narration',
  retrievalSource: 'none',
  rlsEnforcedBy:
    'Attempt aggregation (TODO) must run under the caller session / a report RPC that is already scope-checked.',
  fallbackBehaviour:
    'No attempts => empty objectives/questions and a summary saying there is not enough data.',
  notes: 'Thresholds are fixed here; expose them via ai_platform_config if they need tuning.',
}

export interface ObjectiveStat {
  objective: string
  attempts: number
  failures: number
  questionIds: string[]
}

export interface QuestionStat {
  questionId: string
  questionText: string
  totalAnswers: number
  correctAnswers: number
  /** Correct rate among the top-third scorers minus bottom-third (−1..1). */
  discriminationIndex: number | null
  /** Even spread of wrong answers across distractors is suspicious. */
  distractorEntropy: number | null
}

export interface AttemptAggregate {
  quizId: string
  objectives: ObjectiveStat[]
  questions: QuestionStat[]
}

export interface GapAnalysisInput {
  /**
   * TODO(attempt-data-source): build this from —
   *   quiz_attempts / training_progress + unified_questions.objective_id
   *   grouped to failure rates and a discrimination index per question.
   */
  aggregate: AttemptAggregate
  ctx?: CapabilityCallContext
  failureRateThreshold?: number
  discriminationThreshold?: number
}

export async function analyzeAssessmentGaps(input: GapAnalysisInput): Promise<GapAnalysisResult> {
  const { aggregate } = input
  const failThreshold = input.failureRateThreshold ?? 0.4
  const discThreshold = input.discriminationThreshold ?? 0.1
  const locale = input.ctx?.locale ?? 'en'

  const failingObjectives = aggregate.objectives
    .filter((o) => o.attempts > 0 && o.failures / o.attempts >= failThreshold)
    .map((o) => ({
      objective: o.objective,
      attemptCount: o.attempts,
      failureRate: Number((o.failures / o.attempts).toFixed(3)),
      exampleQuestionIds: o.questionIds.slice(0, 5),
    }))
    .sort((a, b) => b.failureRate - a.failureRate)

  const misleadingQuestions = aggregate.questions
    .filter(
      (q) =>
        q.totalAnswers > 0 &&
        q.discriminationIndex !== null &&
        q.discriminationIndex < discThreshold,
    )
    .map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      reason:
        q.discriminationIndex !== null && q.discriminationIndex < 0
          ? 'Negative discrimination — stronger learners get it wrong more often.'
          : 'Low discrimination — does not separate strong from weak learners.',
      discriminationIndex: q.discriminationIndex,
    }))

  const hasData = aggregate.objectives.length > 0 || aggregate.questions.length > 0
  let summary = hasData
    ? ''
    : locale === 'ar'
      ? 'لا توجد بيانات محاولات كافية لتحليل الفجوات.'
      : 'Not enough attempt data to analyse gaps.'
  const recommendedActions: string[] = []

  if (hasData) {
    const prompt = `You are a hospitality training analyst. Given these quiz statistics, write a short summary (3-5 sentences) for the training team, then list 2-4 concrete recommended actions. Answer in ${
      locale === 'ar' ? 'Arabic' : 'English'
    }. Respond as JSON: { "summary": string, "recommendedActions": string[] }.

FAILING OBJECTIVES: ${JSON.stringify(failingObjectives)}
MISLEADING QUESTIONS: ${JSON.stringify(misleadingQuestions)}`

    try {
      const res = await altusAI.executePrompt(prompt, {
        systemPrompt: 'Return only valid JSON.',
        temperature: 0.3,
        jsonMode: true,
        signal: input.ctx?.signal,
      })
      const parsed = extractJsonFromText<{ summary?: string; recommendedActions?: string[] }>(res.data)
      summary = parsed?.summary?.trim() || fallbackSummary(failingObjectives.length, misleadingQuestions.length, locale)
      if (Array.isArray(parsed?.recommendedActions)) {
        recommendedActions.push(...parsed.recommendedActions.filter((s) => typeof s === 'string'))
      }
    } catch {
      summary = fallbackSummary(failingObjectives.length, misleadingQuestions.length, locale)
    }

    if (recommendedActions.length === 0) {
      if (failingObjectives.length) recommendedActions.push('Reinforce the lessons behind the top failing objectives.')
      if (misleadingQuestions.length) recommendedActions.push('Review or rewrite the flagged low-discrimination questions.')
    }
  }

  return GapAnalysisResultSchema.parse({
    quizId: aggregate.quizId,
    summary,
    failingObjectives,
    misleadingQuestions,
    recommendedActions,
  })
}

function fallbackSummary(objCount: number, qCount: number, locale: 'en' | 'ar'): string {
  if (locale === 'ar') {
    return `تم رصد ${objCount} هدفًا تعليميًا بمعدل رسوب مرتفع و${qCount} سؤالًا قد يكون مضللًا.`
  }
  return `Detected ${objCount} objective(s) with a high failure rate and ${qCount} potentially misleading question(s).`
}
