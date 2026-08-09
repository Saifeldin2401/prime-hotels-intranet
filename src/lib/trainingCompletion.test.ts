import { describe, expect, it } from 'vitest'

import { evaluateTrainingCompletion } from './trainingCompletion'

const block = (id: string, type: 'text' | 'quiz', mandatory = true, data: Record<string, unknown> | null = null) => ({
  id,
  type,
  title: id,
  is_mandatory: mandatory,
  content_data: data,
} as never)

describe('evaluateTrainingCompletion', () => {
  it('allows a final required quiz to complete once passed', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('lesson', 'text'), block('final', 'quiz', true, { quiz_id: 'quiz-1' })],
      completedBlockIds: ['lesson'],
      completedMediaBlockIds: [],
      quizResultsByBlockId: { final: { score: 90, passed: true, completedAt: '2026-01-01' } },
    })
    expect(state.complete).toBe(true)
  })

  it('requires every required quiz, not just the final quiz', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('one', 'quiz', true, { quiz_id: 'quiz-1' }), block('two', 'quiz', true, { quiz_id: 'quiz-2' })],
      completedBlockIds: [],
      completedMediaBlockIds: [],
      quizResultsByBlockId: { one: { score: 90, passed: true, completedAt: '2026-01-01' } },
    })
    expect(state.complete).toBe(false)
    expect(state.blockers).toEqual([{ blockId: 'two', label: 'two', reason: 'quiz-not-submitted' }])
  })

  it('does not let a failed required quiz satisfy completion', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('quiz', 'quiz', true, { quiz_id: 'quiz-1' })],
      completedBlockIds: [],
      completedMediaBlockIds: [],
      quizResultsByBlockId: { quiz: { score: 60, passed: false, completedAt: '2026-01-01' } },
    })
    expect(state.complete).toBe(false)
    expect(state.blockers[0]?.reason).toBe('quiz-not-passed')
  })

  it('allows optional quizzes to be skipped', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('lesson', 'text'), block('optional', 'quiz', false, { quiz_id: 'quiz-1' })],
      completedBlockIds: ['lesson'],
      completedMediaBlockIds: [],
      quizResultsByBlockId: {},
    })
    expect(state.complete).toBe(true)
  })

  it('keeps the normal completion flow for trainings with no quizzes', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('one', 'text'), block('two', 'text')],
      completedBlockIds: ['one', 'two'],
      completedMediaBlockIds: [],
      quizResultsByBlockId: {},
    })
    expect(state).toMatchObject({ complete: true, totalQuizzes: 0, totalRequiredQuizzes: 0 })
  })

  it('supports completion-only quizzes without weakening pass-required quizzes', () => {
    const state = evaluateTrainingCompletion({
      blocks: [block('quiz', 'quiz', true, { quiz_id: 'quiz-1', completion_requirement: 'submitted' })],
      completedBlockIds: [],
      completedMediaBlockIds: [],
      quizResultsByBlockId: { quiz: { score: 60, passed: false, completedAt: '2026-01-01' } },
    })
    expect(state.complete).toBe(true)
  })
})
