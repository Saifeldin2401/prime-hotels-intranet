/**
 * Advanced Training Progression Engine
 *
 * Core state-driven learning flow engine for the PRIME Connect Training Player.
 * Evaluates training item hierarchies, prerequisites, quiz passing thresholds,
 * retry/remediation logic, multi-quiz checkpoints, smart resume positions,
 * and direct navigation protection.
 */

import type { TrainingContentBlock, TrainingModule } from '@/lib/types/training'

// ----------------------------------------------------------------------
// Types & Enums
// ----------------------------------------------------------------------

export type LearningItemState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRY_REQUIRED'
  | 'PENDING_REVIEW'
  | 'EXEMPTED'
  | 'SKIPPED'

export type ProgressionMode = 'sequential' | 'flexible'

export type QuizCompletionResult = {
  quizId?: string
  quizTitle?: string
  score: number
  passed: boolean
  correctCount?: number
  totalQuestions?: number
  completedAt: string
  attemptsCount?: number
  reviewItems?: Array<{
    questionId: string
    questionText: string
    selectedAnswer: string
    correctAnswer: string
    correct: boolean
    explanation?: string
    timeSpentSeconds: number
  }>
}

export type ProgressionBlockerReason =
  | 'unmet_prerequisite'
  | 'incomplete_content'
  | 'quiz_not_attempted'
  | 'quiz_failed'
  | 'max_attempts_reached'
  | 'locked_by_sequential_mode'

export interface ProgressionBlocker {
  blockId: string
  title: string
  reason: ProgressionBlockerReason
  description: string
  prerequisiteBlockId?: string
  prerequisiteTitle?: string
}

export interface LearnerProgressState {
  completedBlockIds: Iterable<string>
  completedMediaBlockIds?: Iterable<string>
  quizResultsByBlockId: Record<string, QuizCompletionResult | undefined>
  quizAttemptsByBlockId?: Record<string, number | undefined>
  exemptedBlockIds?: Iterable<string>
  skippedBlockIds?: Iterable<string>
  activeBlockId?: string | null
}

export interface ModuleProgressionResult {
  blockStates: Record<string, LearningItemState>
  nextRequiredItem: TrainingContentBlock | null
  nextRequiredIndex: number
  activeItemState: LearningItemState
  canAdvanceCurrent: boolean
  isModuleComplete: boolean
  mandatoryTotal: number
  mandatoryCompleted: number
  realProgressPercentage: number
  blockers: ProgressionBlocker[]
  quizzesSummary: {
    total: number
    required: number
    passed: number
    failed: number
    incomplete: number
  }
}

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

export const getQuizIdForBlock = (block: TrainingContentBlock): string | null => {
  const contentData = block.content_data as Record<string, unknown> | null
  return typeof contentData?.quiz_id === 'string' ? contentData.quiz_id : null
}

export const requiresQuizPassing = (block: TrainingContentBlock): boolean => {
  const contentData = block.content_data as Record<string, unknown> | null
  if (contentData?.completion_requirement === 'submitted') return false
  if (contentData?.require_passing === false) return false
  return true
}

export const getBlockPassingScore = (
  block: TrainingContentBlock,
  modulePassingScore?: number | null
): number => {
  const contentData = block.content_data as Record<string, unknown> | null
  if (typeof contentData?.passing_score_percentage === 'number') {
    return contentData.passing_score_percentage
  }
  if (typeof contentData?.passing_score === 'number') {
    return contentData.passing_score
  }
  if (typeof modulePassingScore === 'number') {
    return modulePassingScore
  }
  return 80 // Standard 5-star hotel benchmark
}

export const getBlockMaxAttempts = (block: TrainingContentBlock): number | null => {
  const contentData = block.content_data as Record<string, unknown> | null
  if (typeof contentData?.max_attempts === 'number' && contentData.max_attempts > 0) {
    return contentData.max_attempts
  }
  return null
}

export const getBlockPrerequisites = (block: TrainingContentBlock): string[] => {
  const contentData = block.content_data as Record<string, unknown> | null
  if (Array.isArray(contentData?.prerequisites)) {
    return contentData.prerequisites.filter((id): id is string => typeof id === 'string' && id.length > 0)
  }
  return []
}

// ----------------------------------------------------------------------
// Progression Engine Logic
// ----------------------------------------------------------------------

/**
 * Evaluates the discrete learning state of a single content block.
 */
export function evaluateSingleBlockState({
  block,
  index,
  learnerState,
  allBlocks,
  blockStatesSoFar,
  mode = 'sequential',
  modulePassingScore = 80
}: {
  block: TrainingContentBlock
  index: number
  learnerState: LearnerProgressState
  allBlocks: TrainingContentBlock[]
  blockStatesSoFar: Record<string, LearningItemState>
  mode?: ProgressionMode
  modulePassingScore?: number | null
}): { state: LearningItemState; blocker?: ProgressionBlocker } {
  const completedIds = new Set([
    ...learnerState.completedBlockIds,
    ...(learnerState.completedMediaBlockIds || [])
  ])
  const exemptedIds = new Set(learnerState.exemptedBlockIds || [])
  const skippedIds = new Set(learnerState.skippedBlockIds || [])

  // 1. Check exemptions or skips
  if (exemptedIds.has(block.id)) {
    return { state: 'EXEMPTED' }
  }
  if (skippedIds.has(block.id)) {
    return { state: 'SKIPPED' }
  }

  const isMandatory = block.is_mandatory !== false

  // 2. Evaluate Quiz Blocks
  if (block.type === 'quiz') {
    const quizResult = learnerState.quizResultsByBlockId[block.id]
    const attemptsCount =
      learnerState.quizAttemptsByBlockId?.[block.id] ?? (quizResult?.attemptsCount || (quizResult ? 1 : 0))
    const maxAttempts = getBlockMaxAttempts(block)
    const passingScore = getBlockPassingScore(block, modulePassingScore)
    const isPassingRequired = requiresQuizPassing(block)

    // A: Check explicit prerequisites for quiz
    const explicitPrereqs = getBlockPrerequisites(block)
    for (const prereqId of explicitPrereqs) {
      const prereqState = blockStatesSoFar[prereqId]
      const prereqBlock = allBlocks.find((b) => b.id === prereqId)
      if (prereqState !== 'COMPLETED' && prereqState !== 'EXEMPTED' && prereqState !== 'SKIPPED') {
        return {
          state: 'LOCKED',
          blocker: {
            blockId: block.id,
            title: block.title || `Quiz ${index + 1}`,
            reason: 'unmet_prerequisite',
            description: `Requires completion of ${prereqBlock?.title || 'previous lesson'}.`,
            prerequisiteBlockId: prereqId,
            prerequisiteTitle: prereqBlock?.title || 'Prerequisite lesson'
          }
        }
      }
    }

    // B: In sequential mode, all preceding mandatory blocks must be completed
    if (mode === 'sequential') {
      for (let prevIdx = 0; prevIdx < index; prevIdx++) {
        const prevBlock = allBlocks[prevIdx]
        const prevState = blockStatesSoFar[prevBlock.id]
        if (
          prevBlock.is_mandatory !== false &&
          prevState !== 'COMPLETED' &&
          prevState !== 'EXEMPTED' &&
          prevState !== 'SKIPPED'
        ) {
          return {
            state: 'LOCKED',
            blocker: {
              blockId: block.id,
              title: block.title || `Quiz ${index + 1}`,
              reason: 'locked_by_sequential_mode',
              description: `Must complete ${prevBlock.title || `Lesson ${prevIdx + 1}`} first.`,
              prerequisiteBlockId: prevBlock.id,
              prerequisiteTitle: prevBlock.title || `Lesson ${prevIdx + 1}`
            }
          }
        }
      }
    }

    // C: Check quiz submission results
    if (quizResult && quizResult.completedAt) {
      const achievedScore = quizResult.score
      const passed = isPassingRequired ? quizResult.passed && achievedScore >= passingScore : true

      if (passed) {
        return { state: 'COMPLETED' }
      }

      // Failed quiz
      if (maxAttempts && attemptsCount >= maxAttempts) {
        return {
          state: 'FAILED',
          blocker: {
            blockId: block.id,
            title: block.title || `Quiz ${index + 1}`,
            reason: 'max_attempts_reached',
            description: `Maximum attempts (${maxAttempts}) reached. Score: ${achievedScore}%. Passing threshold: ${passingScore}%.`
          }
        }
      }

      return {
        state: 'RETRY_REQUIRED',
        blocker: {
          blockId: block.id,
          title: block.title || `Quiz ${index + 1}`,
          reason: 'quiz_failed',
          description: `Quiz not passed (Score: ${achievedScore}% / Required: ${passingScore}%). Please review material and retry.`
        }
      }
    }

    // Quiz not yet attempted
    return {
      state: 'AVAILABLE',
      blocker: isMandatory
        ? {
            blockId: block.id,
            title: block.title || `Quiz ${index + 1}`,
            reason: 'quiz_not_attempted',
            description: `Quiz must be completed and passed.`
          }
        : undefined
    }
  }

  // 3. Evaluate Standard Content Blocks (Lesson, Video, Reading, Interactive, SOP, etc.)
  // A: Check explicit prerequisites
  const explicitPrereqs = getBlockPrerequisites(block)
  for (const prereqId of explicitPrereqs) {
    const prereqState = blockStatesSoFar[prereqId]
    const prereqBlock = allBlocks.find((b) => b.id === prereqId)
    if (prereqState !== 'COMPLETED' && prereqState !== 'EXEMPTED' && prereqState !== 'SKIPPED') {
      return {
        state: 'LOCKED',
        blocker: {
          blockId: block.id,
          title: block.title || `Lesson ${index + 1}`,
          reason: 'unmet_prerequisite',
          description: `Requires completion of ${prereqBlock?.title || 'prerequisite lesson'}.`,
          prerequisiteBlockId: prereqId,
          prerequisiteTitle: prereqBlock?.title || 'Prerequisite lesson'
        }
      }
    }
  }

  // B: In sequential mode, all preceding mandatory blocks must be completed
  if (mode === 'sequential') {
    for (let prevIdx = 0; prevIdx < index; prevIdx++) {
      const prevBlock = allBlocks[prevIdx]
      const prevState = blockStatesSoFar[prevBlock.id]
      if (
        prevBlock.is_mandatory !== false &&
        prevState !== 'COMPLETED' &&
        prevState !== 'EXEMPTED' &&
        prevState !== 'SKIPPED'
      ) {
        return {
          state: 'LOCKED',
          blocker: {
            blockId: block.id,
            title: block.title || `Lesson ${index + 1}`,
            reason: 'locked_by_sequential_mode',
            description: `Must complete ${prevBlock.title || `Lesson ${prevIdx + 1}`} first.`,
            prerequisiteBlockId: prevBlock.id,
            prerequisiteTitle: prevBlock.title || `Lesson ${prevIdx + 1}`
          }
        }
      }
    }
  }

  // C: Check if completed
  if (completedIds.has(block.id)) {
    return { state: 'COMPLETED' }
  }

  // D: In-progress / Available
  if (learnerState.activeBlockId === block.id) {
    return {
      state: 'IN_PROGRESS',
      blocker: isMandatory
        ? {
            blockId: block.id,
            title: block.title || `Lesson ${index + 1}`,
            reason: 'incomplete_content',
            description: `Lesson is currently in progress.`
          }
        : undefined
    }
  }

  return {
    state: 'AVAILABLE',
    blocker: isMandatory
      ? {
          blockId: block.id,
          title: block.title || `Lesson ${index + 1}`,
          reason: 'incomplete_content',
          description: `Required content not yet completed.`
        }
      : undefined
  }
}

/**
 * Evaluates the full module structure and calculates the complete progression state.
 */
export function evaluateModuleProgression({
  module,
  blocks,
  learnerState,
  mode
}: {
  module?: Partial<TrainingModule> | null
  blocks: TrainingContentBlock[]
  learnerState: LearnerProgressState
  mode?: ProgressionMode
}): ModuleProgressionResult {
  const effectiveMode =
    mode ||
    ((module?.template_id === 'flexible' || (module as any)?.progression_mode === 'flexible')
      ? 'flexible'
      : 'sequential')
  const modulePassingScore = module?.passing_score_percentage ?? 80

  const blockStates: Record<string, LearningItemState> = {}
  const blockers: ProgressionBlocker[] = []

  // 1. Evaluate every block in order
  blocks.forEach((block, index) => {
    const { state, blocker } = evaluateSingleBlockState({
      block,
      index,
      learnerState,
      allBlocks: blocks,
      blockStatesSoFar: blockStates,
      mode: effectiveMode,
      modulePassingScore
    })
    blockStates[block.id] = state
    if (blocker && block.is_mandatory !== false) {
      blockers.push(blocker)
    }
  })

  // 2. Identify next required learning item
  let nextRequiredItem: TrainingContentBlock | null = null
  let nextRequiredIndex = -1

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const state = blockStates[b.id]
    const isMandatory = b.is_mandatory !== false

    if (isMandatory && state !== 'COMPLETED' && state !== 'EXEMPTED' && state !== 'SKIPPED') {
      if (state === 'AVAILABLE' || state === 'IN_PROGRESS' || state === 'RETRY_REQUIRED') {
        nextRequiredItem = b
        nextRequiredIndex = i
        break
      }
      // If it's locked, we still mark it as the target blocker if no earlier available item exists
      if (state === 'LOCKED' && !nextRequiredItem) {
        nextRequiredItem = b
        nextRequiredIndex = i
        break
      }
    }
  }

  // If all mandatory items are done, fallback to any optional incomplete item
  if (!nextRequiredItem) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      const state = blockStates[b.id]
      if (state !== 'COMPLETED' && state !== 'EXEMPTED' && state !== 'SKIPPED') {
        nextRequiredItem = b
        nextRequiredIndex = i
        break
      }
    }
  }

  // 3. Quiz breakdown summary
  const quizBlocks = blocks.filter((b) => b.type === 'quiz')
  let passedQuizzes = 0
  let failedQuizzes = 0
  let incompleteQuizzes = 0

  quizBlocks.forEach((qb) => {
    const st = blockStates[qb.id]
    if (st === 'COMPLETED') passedQuizzes++
    else if (st === 'FAILED' || st === 'RETRY_REQUIRED') failedQuizzes++
    else incompleteQuizzes++
  })

  // 4. Mandatory counts & real progress %
  const mandatoryBlocks = blocks.filter((b) => b.is_mandatory !== false)
  const mandatoryCompleted = mandatoryBlocks.filter((b) => {
    const st = blockStates[b.id]
    return st === 'COMPLETED' || st === 'EXEMPTED' || st === 'SKIPPED'
  }).length

  const mandatoryTotal = mandatoryBlocks.length || 1
  const realProgressPercentage = Math.min(100, Math.round((mandatoryCompleted / mandatoryTotal) * 100))

  // Active block evaluation
  const activeBlock = blocks.find((b) => b.id === learnerState.activeBlockId)
  const activeItemState = activeBlock ? blockStates[activeBlock.id] || 'AVAILABLE' : 'AVAILABLE'
  const canAdvanceCurrent =
    activeItemState === 'COMPLETED' ||
    activeItemState === 'EXEMPTED' ||
    activeItemState === 'SKIPPED' ||
    (activeBlock && activeBlock.is_mandatory === false)

  // Module completion requires 0 mandatory blockers
  const isModuleComplete = blockers.length === 0 && mandatoryCompleted === mandatoryBlocks.length

  return {
    blockStates,
    nextRequiredItem,
    nextRequiredIndex: nextRequiredIndex >= 0 ? nextRequiredIndex : 0,
    activeItemState,
    canAdvanceCurrent: Boolean(canAdvanceCurrent),
    isModuleComplete,
    mandatoryTotal: mandatoryBlocks.length,
    mandatoryCompleted,
    realProgressPercentage,
    blockers,
    quizzesSummary: {
      total: quizBlocks.length,
      required: quizBlocks.filter((b) => b.is_mandatory !== false).length,
      passed: passedQuizzes,
      failed: failedQuizzes,
      incomplete: incompleteQuizzes
    }
  }
}

/**
 * Returns the exact next required learning item index for smart resume or auto-advance.
 */
export function getNextRequiredLearningItem(
  module: Partial<TrainingModule> | null | undefined,
  blocks: TrainingContentBlock[],
  learnerState: LearnerProgressState,
  mode?: ProgressionMode
): { item: TrainingContentBlock | null; index: number } {
  const result = evaluateModuleProgression({ module, blocks, learnerState, mode })
  return {
    item: result.nextRequiredItem,
    index: result.nextRequiredIndex
  }
}

/**
 * Validates a learner's navigation attempt (via direct click or URL parameter).
 * Returns the allowed target index, or redirects to the first valid next required item if locked.
 */
export function validateNavigationTarget({
  targetIndex,
  blocks,
  progression
}: {
  targetIndex: number
  blocks: TrainingContentBlock[]
  progression: ModuleProgressionResult
}): { allowed: boolean; safeIndex: number; targetBlock: TrainingContentBlock | null; reason?: string } {
  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return {
      allowed: false,
      safeIndex: progression.nextRequiredIndex,
      targetBlock: progression.nextRequiredItem,
      reason: 'Invalid block index'
    }
  }

  const targetBlock = blocks[targetIndex]
  const state = progression.blockStates[targetBlock.id]

  // Completed, Exempted, Skipped, In Progress, or Available items can be opened
  if (state !== 'LOCKED') {
    return {
      allowed: true,
      safeIndex: targetIndex,
      targetBlock
    }
  }

  // Locked: find the first prerequisite blocker
  const blocker = progression.blockers.find((b) => b.blockId === targetBlock.id)
  return {
    allowed: false,
    safeIndex: progression.nextRequiredIndex,
    targetBlock: progression.nextRequiredItem,
    reason: blocker?.description || 'This lesson is locked. Please complete prior required lessons first.'
  }
}
