import { describe, expect, it } from 'vitest'
import {
  evaluateModuleProgression,
  evaluateSingleBlockState,
  getNextRequiredLearningItem,
  validateNavigationTarget,
  type LearnerProgressState
} from './trainingProgressionEngine'
import type { TrainingContentBlock, TrainingModule } from './types/training'

describe('Training Progression Engine', () => {
  const createBlock = (
    id: string,
    type: TrainingContentBlock['type'],
    order: number,
    isMandatory: boolean = true,
    contentData: Record<string, unknown> | null = null
  ): TrainingContentBlock => ({
    id,
    training_module_id: 'mod-1',
    title: `Block ${order}: ${type}`,
    type,
    content: `<p>Content for ${id}</p>`,
    content_url: null,
    content_data: contentData,
    order,
    is_mandatory: isMandatory,
    created_at: new Date().toISOString()
  })

  describe('Multi-Quiz Sequence & Progression', () => {
    // Structure: Lesson 1 -> Quiz 1 -> Lesson 2 -> Quiz 2 -> Final Exam
    const blocks: TrainingContentBlock[] = [
      createBlock('b-l1', 'text', 0, true),
      createBlock('b-q1', 'quiz', 1, true, { quiz_id: 'quiz-1', passing_score_percentage: 80 }),
      createBlock('b-l2', 'text', 2, true),
      createBlock('b-q2', 'quiz', 3, true, { quiz_id: 'quiz-2', passing_score_percentage: 80 }),
      createBlock('b-final', 'quiz', 4, true, { quiz_id: 'quiz-final', passing_score_percentage: 85 })
    ]

    const module: Partial<TrainingModule> = {
      id: 'mod-1',
      title: 'Luxury Guest Service Excellence',
      passing_score_percentage: 80
    }

    it('starts with Lesson 1 AVAILABLE and all subsequent blocks LOCKED in sequential mode', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(),
        quizResultsByBlockId: {}
      }

      const progression = evaluateModuleProgression({ module, blocks, learnerState, mode: 'sequential' })

      expect(progression.blockStates['b-l1']).toBe('AVAILABLE')
      expect(progression.blockStates['b-q1']).toBe('LOCKED')
      expect(progression.blockStates['b-l2']).toBe('LOCKED')
      expect(progression.blockStates['b-q2']).toBe('LOCKED')
      expect(progression.blockStates['b-final']).toBe('LOCKED')
      expect(progression.nextRequiredItem?.id).toBe('b-l1')
      expect(progression.nextRequiredIndex).toBe(0)
      expect(progression.isModuleComplete).toBe(false)
      expect(progression.realProgressPercentage).toBe(0)
    })

    it('unlocks Quiz 1 when Lesson 1 is completed, while Lesson 2 remains LOCKED', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {}
      }

      const progression = evaluateModuleProgression({ module, blocks, learnerState, mode: 'sequential' })

      expect(progression.blockStates['b-l1']).toBe('COMPLETED')
      expect(progression.blockStates['b-q1']).toBe('AVAILABLE')
      expect(progression.blockStates['b-l2']).toBe('LOCKED')
      expect(progression.nextRequiredItem?.id).toBe('b-q1')
      expect(progression.nextRequiredIndex).toBe(1)
      expect(progression.realProgressPercentage).toBe(20)
    })

    it('requires Quiz 1 to pass; if failed, Quiz 1 is RETRY_REQUIRED and Lesson 2 remains LOCKED', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {
          'b-q1': {
            quizId: 'quiz-1',
            score: 60, // Below 80
            passed: false,
            completedAt: new Date().toISOString()
          }
        }
      }

      const progression = evaluateModuleProgression({ module, blocks, learnerState, mode: 'sequential' })

      expect(progression.blockStates['b-l1']).toBe('COMPLETED')
      expect(progression.blockStates['b-q1']).toBe('RETRY_REQUIRED')
      expect(progression.blockStates['b-l2']).toBe('LOCKED')
      expect(progression.nextRequiredItem?.id).toBe('b-q1')
      expect(progression.nextRequiredIndex).toBe(1)
      expect(progression.isModuleComplete).toBe(false)
    })

    it('unlocks Lesson 2 when Quiz 1 passes, but keeps Quiz 2 LOCKED', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {
          'b-q1': {
            quizId: 'quiz-1',
            score: 90,
            passed: true,
            completedAt: new Date().toISOString()
          }
        }
      }

      const progression = evaluateModuleProgression({ module, blocks, learnerState, mode: 'sequential' })

      expect(progression.blockStates['b-l1']).toBe('COMPLETED')
      expect(progression.blockStates['b-q1']).toBe('COMPLETED')
      expect(progression.blockStates['b-l2']).toBe('AVAILABLE')
      expect(progression.blockStates['b-q2']).toBe('LOCKED')
      expect(progression.nextRequiredItem?.id).toBe('b-l2')
      expect(progression.nextRequiredIndex).toBe(2)
      expect(progression.realProgressPercentage).toBe(40)
    })

    it('marks module COMPLETED only when all lessons and all quizzes are passed', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1', 'b-l2']),
        quizResultsByBlockId: {
          'b-q1': { quizId: 'quiz-1', score: 100, passed: true, completedAt: new Date().toISOString() },
          'b-q2': { quizId: 'quiz-2', score: 90, passed: true, completedAt: new Date().toISOString() },
          'b-final': { quizId: 'quiz-final', score: 95, passed: true, completedAt: new Date().toISOString() }
        }
      }

      const progression = evaluateModuleProgression({ module, blocks, learnerState, mode: 'sequential' })

      expect(progression.isModuleComplete).toBe(true)
      expect(progression.realProgressPercentage).toBe(100)
      expect(progression.blockers).toHaveLength(0)
      expect(progression.quizzesSummary.passed).toBe(3)
      expect(progression.quizzesSummary.failed).toBe(0)
      expect(progression.quizzesSummary.incomplete).toBe(0)
    })
  })

  describe('Sequential vs Flexible Learning Modes', () => {
    const blocks: TrainingContentBlock[] = [
      createBlock('b-l1', 'text', 0, true),
      createBlock('b-l2', 'text', 1, true),
      createBlock('b-q1', 'quiz', 2, true, { quiz_id: 'quiz-1', passing_score_percentage: 80 })
    ]

    it('in Flexible mode, non-quiz lessons are AVAILABLE for exploration while quizzes remain gated', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(),
        quizResultsByBlockId: {}
      }

      const progression = evaluateModuleProgression({ blocks, learnerState, mode: 'flexible' })

      // In flexible mode, learner can view lesson 1 and lesson 2
      expect(progression.blockStates['b-l1']).toBe('AVAILABLE')
      expect(progression.blockStates['b-l2']).toBe('AVAILABLE')
      expect(progression.isModuleComplete).toBe(false)
    })
  })

  describe('Smart Resume Logic', () => {
    const blocks: TrainingContentBlock[] = [
      createBlock('b-l1', 'text', 0, true),
      createBlock('b-q1', 'quiz', 1, true, { quiz_id: 'quiz-1' }),
      createBlock('b-l2', 'text', 2, true),
      createBlock('b-q2', 'quiz', 3, true, { quiz_id: 'quiz-2' })
    ]

    it('resumes at Quiz 1 when only Lesson 1 is completed', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {}
      }

      const resume = getNextRequiredLearningItem(null, blocks, learnerState)
      expect(resume.item?.id).toBe('b-q1')
      expect(resume.index).toBe(1)
    })

    it('resumes at Lesson 2 when Lesson 1 and Quiz 1 are completed', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {
          'b-q1': { quizId: 'quiz-1', score: 100, passed: true, completedAt: new Date().toISOString() }
        }
      }

      const resume = getNextRequiredLearningItem(null, blocks, learnerState)
      expect(resume.item?.id).toBe('b-l2')
      expect(resume.index).toBe(2)
    })
  })

  describe('Direct Navigation Bypass Protection', () => {
    const blocks: TrainingContentBlock[] = [
      createBlock('b-l1', 'text', 0, true),
      createBlock('b-q1', 'quiz', 1, true, { quiz_id: 'quiz-1' }),
      createBlock('b-l2', 'text', 2, true)
    ]

    it('allows opening completed and available blocks', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {}
      }
      const progression = evaluateModuleProgression({ blocks, learnerState, mode: 'sequential' })

      // Learner clicks on completed Lesson 1 to review
      const navReview = validateNavigationTarget({ targetIndex: 0, blocks, progression })
      expect(navReview.allowed).toBe(true)

      // Learner clicks on available Quiz 1
      const navQuiz = validateNavigationTarget({ targetIndex: 1, blocks, progression })
      expect(navQuiz.allowed).toBe(true)
    })

    it('blocks direct navigation to a LOCKED block and safely redirects to next required item', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {}
      }
      const progression = evaluateModuleProgression({ blocks, learnerState, mode: 'sequential' })

      // Learner attempts to jump directly to Lesson 2 (index 2) via URL or sidebar
      const navLocked = validateNavigationTarget({ targetIndex: 2, blocks, progression })
      expect(navLocked.allowed).toBe(false)
      expect(navLocked.safeIndex).toBe(1) // Redirects to Quiz 1
      expect(navLocked.targetBlock?.id).toBe('b-q1')
      expect(navLocked.reason).toBeDefined()
    })
  })

  describe('Optional Content Does Not Distort Real Progress Percentage', () => {
    const blocks: TrainingContentBlock[] = [
      createBlock('b-l1', 'text', 0, true), // Mandatory
      createBlock('b-opt1', 'text', 1, false), // Optional
      createBlock('b-opt2', 'video', 2, false), // Optional
      createBlock('b-q1', 'quiz', 3, true, { quiz_id: 'quiz-1' }) // Mandatory
    ]

    it('calculates 50% when 1 of 2 mandatory blocks is complete regardless of optional blocks', () => {
      const learnerState: LearnerProgressState = {
        completedBlockIds: new Set(['b-l1']),
        quizResultsByBlockId: {}
      }

      const progression = evaluateModuleProgression({ blocks, learnerState, mode: 'sequential' })
      expect(progression.mandatoryTotal).toBe(2)
      expect(progression.mandatoryCompleted).toBe(1)
      expect(progression.realProgressPercentage).toBe(50)
    })
  })
})
