import type { TrainingContentBlock } from '@/lib/types/training'
import {
  evaluateModuleProgression,
  type LearningItemState,
  type ProgressionBlocker,
  type QuizCompletionResult as EngineQuizResult,
  type LearnerProgressState
} from './trainingProgressionEngine'

export type QuizCompletionResult = EngineQuizResult

export type TrainingCompletionBlocker = {
  blockId: string
  label: string
  reason: 'content' | 'quiz-not-submitted' | 'quiz-not-passed'
}

export type TrainingCompletionState = {
  complete: boolean
  totalRequiredContent: number
  completedRequiredContent: number
  totalQuizzes: number
  totalRequiredQuizzes: number
  completedQuizzes: number
  incompleteQuizzes: number
  blockers: TrainingCompletionBlocker[]
}

export const getQuizProgressKey = (block: TrainingContentBlock) => block.id

/**
 * The single source of truth for whether a learner can finish a training module.
 * Evaluates completion via the TrainingProgressionEngine.
 */
export const evaluateTrainingCompletion = ({
  blocks,
  completedBlockIds,
  completedMediaBlockIds,
  quizResultsByBlockId,
}: {
  blocks: TrainingContentBlock[]
  completedBlockIds: Iterable<string>
  completedMediaBlockIds?: Iterable<string>
  quizResultsByBlockId: Record<string, QuizCompletionResult | undefined>
}): TrainingCompletionState => {
  const learnerState: LearnerProgressState = {
    completedBlockIds,
    completedMediaBlockIds,
    quizResultsByBlockId
  }

  const progression = evaluateModuleProgression({
    blocks,
    learnerState,
    mode: 'sequential'
  })

  const legacyBlockers: TrainingCompletionBlocker[] = progression.blockers.map((b) => {
    let legacyReason: TrainingCompletionBlocker['reason'] = 'content'
    if (b.reason === 'quiz_not_attempted') legacyReason = 'quiz-not-submitted'
    else if (b.reason === 'quiz_failed' || b.reason === 'max_attempts_reached') legacyReason = 'quiz-not-passed'
    return {
      blockId: b.blockId,
      label: b.title,
      reason: legacyReason
    }
  })

  const requiredContentCount = blocks.filter((b) => b.type !== 'quiz' && b.is_mandatory !== false).length
  const completedContentCount = blocks.filter(
    (b) =>
      b.type !== 'quiz' &&
      b.is_mandatory !== false &&
      (progression.blockStates[b.id] === 'COMPLETED' ||
        progression.blockStates[b.id] === 'EXEMPTED' ||
        progression.blockStates[b.id] === 'SKIPPED')
  ).length

  return {
    complete: progression.isModuleComplete,
    totalRequiredContent: requiredContentCount,
    completedRequiredContent: completedContentCount,
    totalQuizzes: progression.quizzesSummary.total,
    totalRequiredQuizzes: progression.quizzesSummary.required,
    completedQuizzes: progression.quizzesSummary.passed,
    incompleteQuizzes: progression.quizzesSummary.incomplete + progression.quizzesSummary.failed,
    blockers: legacyBlockers
  }
}
