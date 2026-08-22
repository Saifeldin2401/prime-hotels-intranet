import { describe, it, expect } from 'vitest'
import { auditTrainingModule } from './trainingBuilderValidator'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

describe('trainingBuilderValidator', () => {
  it('should flag empty title and missing category as critical errors', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Section 1',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Lesson 1',
            content: '<p>Standard procedure...</p>',
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
        ],
      },
    ]

    const result = auditTrainingModule({
      title: '',
      category: '',
      sections,
    })

    expect(result.isPublishReady).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
    expect(result.errors.some((e) => e.id === 'err-mod-title')).toBe(true)
    expect(result.errors.some((e) => e.id === 'err-mod-cat')).toBe(true)
  })

  it('should flag empty lessons and unlinked quizzes as errors', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Operations',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Empty Procedure',
            content: '<p>   </p>', // empty HTML
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
          {
            id: 'item-2',
            type: 'quiz',
            title: 'Assessment Quiz',
            content: '',
            content_url: '',
            content_data: {}, // missing quiz_id
            is_mandatory: true,
            order: 1,
          },
        ],
      },
    ]

    const result = auditTrainingModule({
      title: 'Luxury Guest Experience',
      category: 'operations',
      sections,
    })

    expect(result.isPublishReady).toBe(false)
    expect(result.errors.some((e) => e.id.startsWith('err-empty-block'))).toBe(true)
    expect(result.errors.some((e) => e.id.startsWith('err-unlinked-quiz'))).toBe(true)
  })

  it('should pass publish readiness for a complete, well-formed module', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Front Office Excellence',
        description: 'Comprehensive guide to guest check-in standards.',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Guest Check-in Protocol',
            content: '<p>Greet with guest name, offer refreshing towel, explain amenities.</p>',
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
          {
            id: 'item-2',
            type: 'quiz',
            title: 'Check-in Checkpoint Quiz',
            content: '',
            content_url: '',
            content_data: { quiz_id: 'quiz-ready-1' },
            is_mandatory: true,
            order: 1,
          },
        ],
      },
    ]

    const result = auditTrainingModule({
      title: 'Front Office 5-Star Operations',
      description: 'Mastering luxury reception and concierge guest interactions.',
      category: 'front_office',
      sections,
    })

    expect(result.isPublishReady).toBe(true)
    expect(result.errors.length).toBe(0)
    expect(result.healthScore).toBeGreaterThanOrEqual(90)
  })
})
