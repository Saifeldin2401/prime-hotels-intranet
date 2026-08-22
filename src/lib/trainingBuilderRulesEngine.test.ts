import { describe, it, expect } from 'vitest'
import {
  analyzeBuilderContent,
  evaluateBuilderVisibility,
  resolveConfigProvenance,
} from './trainingBuilderRulesEngine'
import type { TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

describe('trainingBuilderRulesEngine', () => {
  it('should accurately analyze content with zero quizzes', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Front Desk Basics',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Greeting Guests',
            content: '<p>Always smile and greet with respect.</p>',
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
          {
            id: 'item-2',
            type: 'sop_reference',
            title: 'SOP: Check-in Process',
            content: '',
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 1,
          },
        ],
      },
    ]

    const analysis = analyzeBuilderContent(sections)
    expect(analysis.totalSections).toBe(1)
    expect(analysis.totalItems).toBe(2)
    expect(analysis.quizCount).toBe(0)
    expect(analysis.videoCount).toBe(0)
    expect(analysis.textLessonCount).toBe(1)
    expect(analysis.sopCount).toBe(1)

    const rules = evaluateBuilderVisibility(analysis)
    expect(rules.showQuizRules).toBe(false)
    expect(rules.showPassingScore).toBe(false)
    expect(rules.showMaxAttempts).toBe(false)
    expect(rules.reasons.quizRules).toContain('No quizzes')
  })

  it('should dynamically activate quiz configuration when quizzes exist', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Safety Standards',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'text',
            title: 'Fire Safety Lesson',
            content: '<p>Evacuation procedure...</p>',
            content_url: '',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
          {
            id: 'item-2',
            type: 'quiz',
            title: 'Fire Safety Checkpoint',
            content: '',
            content_url: '',
            content_data: { quiz_id: 'quiz-fire-1' },
            is_mandatory: true,
            order: 1,
          },
        ],
      },
    ]

    const analysis = analyzeBuilderContent(sections)
    expect(analysis.quizCount).toBe(1)
    expect(analysis.hasAssessments).toBe(true)

    const rules = evaluateBuilderVisibility(analysis, { allowRetake: true })
    expect(rules.showQuizRules).toBe(true)
    expect(rules.showPassingScore).toBe(true)
    expect(rules.showMaxAttempts).toBe(true)
    expect(rules.showRandomizeQuestions).toBe(true)
    expect(rules.requiredFields).toContain('passingScore')
  })

  it('should detect video and media rules correctly', () => {
    const sections: TrainingSection[] = [
      {
        id: 'sec-1',
        title: 'Concierge Protocol',
        order: 0,
        items: [
          {
            id: 'item-1',
            type: 'video',
            title: 'VIP Guest Arrival Video',
            content: '',
            content_url: 'https://cdn.hotel.com/arrival.mp4',
            content_data: {},
            is_mandatory: true,
            order: 0,
          },
        ],
      },
    ]

    const analysis = analyzeBuilderContent(sections)
    expect(analysis.videoCount).toBe(1)

    const rules = evaluateBuilderVisibility(analysis)
    expect(rules.showMediaRules).toBe(true)
    expect(rules.showVideoWatchThreshold).toBe(true)
    expect(rules.showQuizRules).toBe(false)
  })

  it('should resolve config provenance for global vs module vs block overrides', () => {
    const defaultProvenance = resolveConfigProvenance('passingScore', '80', '80', 0)
    expect(defaultProvenance.source).toBe('training_default')
    expect(defaultProvenance.isOverridden).toBe(false)

    const moduleProvenance = resolveConfigProvenance('passingScore', '90', '80', 0)
    expect(moduleProvenance.source).toBe('module_override')
    expect(moduleProvenance.isOverridden).toBe(true)

    const blockProvenance = resolveConfigProvenance('passingScore', '80', '80', 2)
    expect(blockProvenance.source).toBe('block_override')
    expect(blockProvenance.isOverridden).toBe(true)
    expect(blockProvenance.sourceLabel).toContain('2 block-level override')
  })
})
