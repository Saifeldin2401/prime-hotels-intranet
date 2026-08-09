import type { TrainingContentBlock } from '@/lib/types/training'

export type QuizCompletionResult = {
  score: number
  passed: boolean
  completedAt: string
}

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

const quizIdForBlock = (block: TrainingContentBlock) => {
  const contentData = block.content_data as Record<string, unknown> | null
  return typeof contentData?.quiz_id === 'string' ? contentData.quiz_id : null
}

const requiresQuizPass = (block: TrainingContentBlock) => {
  const contentData = block.content_data as Record<string, unknown> | null
  return contentData?.completion_requirement !== 'submitted' && contentData?.require_passing !== false
}

/**
 * The single source of truth for whether a learner can finish a training module.
 * Progress is stored per content block so the same quiz may safely be embedded more
 * than once without one placement completing another.
 */
export const evaluateTrainingCompletion = ({
  blocks,
  completedBlockIds,
  completedMediaBlockIds,
  quizResultsByBlockId,
}: {
  blocks: TrainingContentBlock[]
  completedBlockIds: Iterable<string>
  completedMediaBlockIds: Iterable<string>
  quizResultsByBlockId: Record<string, QuizCompletionResult | undefined>
}): TrainingCompletionState => {
  const completed = new Set([...completedBlockIds, ...completedMediaBlockIds])
  const blockers: TrainingCompletionBlocker[] = []
  const requiredContent = blocks.filter(block => block.type !== 'quiz' && block.is_mandatory !== false)
  const quizBlocks = blocks.filter(block => block.type === 'quiz' && quizIdForBlock(block))

  for (const block of requiredContent) {
    if (!completed.has(block.id)) {
      blockers.push({
        blockId: block.id,
        label: block.title || 'Required content',
        reason: 'content',
      })
    }
  }

  let completedQuizzes = 0
  for (const block of quizBlocks) {
    const result = quizResultsByBlockId[block.id]
    const required = block.is_mandatory !== false
    const passed = Boolean(result?.passed)
    const submitted = Boolean(result?.completedAt)
    const satisfiesRequirement = submitted && (!requiresQuizPass(block) || passed)

    if (submitted) completedQuizzes += 1
    if (required && !satisfiesRequirement) {
      blockers.push({
        blockId: block.id,
        label: block.title || 'Required quiz',
        reason: submitted ? 'quiz-not-passed' : 'quiz-not-submitted',
      })
    }
  }

  const totalRequiredQuizzes = quizBlocks.filter(block => block.is_mandatory !== false).length
  const completedRequiredContent = requiredContent.length - blockers.filter(blocker => blocker.reason === 'content').length

  return {
    complete: blockers.length === 0,
    totalRequiredContent: requiredContent.length,
    completedRequiredContent,
    totalQuizzes: quizBlocks.length,
    totalRequiredQuizzes,
    completedQuizzes,
    incompleteQuizzes: quizBlocks.length - completedQuizzes,
    blockers,
  }
}

export const getQuizProgressKey = (block: TrainingContentBlock) => block.id
