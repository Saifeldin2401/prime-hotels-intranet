import { describe, expect, it } from 'vitest'
import {
  checkCourseConfigConsistency,
  harmonizeCourseConfig,
  getSmartModePreset,
} from '@/lib/ai/courseHarmonizer'
import type { FullCourseGenerationConfig } from '@/types/aiCourseEngine'

describe('Course Configuration Auto-Harmonizer', () => {
  const baseConfig: FullCourseGenerationConfig = {
    generationMode: 'full_course',
    courseType: 'professional',
    instructionalStrategy: 'explain_example_practice',
    targetAudience: 'employees',
    experienceLevel: 'intermediate',
    difficulty: 'intermediate',
    difficultyProgression: 'progressive',
    granularity: {
      moduleCount: 4,
      lessonsPerModule: 3,
      lessonDuration: 15,
    },
    overallDepth: 'comprehensive',
    depthConfig: {
      theory: 3,
      examples: 4,
      practical: 4,
      caseStudies: 4,
      assessments: 3,
    },
    lessonComponents: ['intro', 'objectives', 'step_procedure', 'checklist', 'summary'],
    defaultLessonTemplate: 'sop_standard',
    quizConfig: {
      placement: 'per_module',
      questionCount: 5,
      passingScore: 85,
      maxAttempts: 3,
      randomizeQuestions: true,
      randomizeAnswers: true,
      useQuestionPools: false,
      adaptiveDifficulty: false,
      distractorQuality: 'high',
      includeHints: true,
      includeExplanations: true,
      storeInQuestionBank: true,
    },
    questionTypes: ['mcq', 'scenario'],
    bloomDistribution: {
      remember: 15,
      understand: 25,
      apply: 35,
      analyze: 15,
      evaluate: 10,
      create: 0,
    },
    aiControls: {
      preferredModel: 'auto',
      creativity: 'balanced',
      strictness: 'balanced',
      sourceMode: 'source_enhanced',
      hallucinationProtection: true,
      targetLanguage: 'English',
    },
  }

  it('detects no issues for a balanced, harmonious configuration', () => {
    const report = checkCourseConfigConsistency(baseConfig)
    expect(report.isConsistent).toBe(true)
    expect(report.score).toBeGreaterThanOrEqual(90)
    expect(report.issues.length).toBe(0)
  })

  it('detects microlearning with oversized duration and auto-harmonizes it', () => {
    const microConfig: FullCourseGenerationConfig = {
      ...baseConfig,
      courseType: 'microlearning',
      granularity: {
        ...baseConfig.granularity,
        lessonDuration: 45, // Inconsistent with microlearning
      },
    }

    const report = checkCourseConfigConsistency(microConfig)
    expect(report.isConsistent).toBe(false)
    expect(report.issues.some((i) => i.id === 'micro_duration_mismatch')).toBe(true)

    const harmonized = harmonizeCourseConfig(microConfig)
    expect(harmonized.granularity.lessonDuration).toBeLessThanOrEqual(10)
    expect(checkCourseConfigConsistency(harmonized).isConsistent).toBe(true)
  })

  it('detects compliance training with no assessment and auto-harmonizes it to 85% pass mark', () => {
    const complianceConfig: FullCourseGenerationConfig = {
      ...baseConfig,
      courseType: 'compliance',
      quizConfig: {
        ...baseConfig.quizConfig,
        placement: 'none',
        passingScore: 50,
      },
    }

    const report = checkCourseConfigConsistency(complianceConfig)
    expect(report.isConsistent).toBe(false)
    expect(report.issues.some((i) => i.id === 'compliance_rigour_mismatch')).toBe(true)

    const harmonized = harmonizeCourseConfig(complianceConfig)
    expect(harmonized.quizConfig.placement).toBe('per_module')
    expect(harmonized.quizConfig.passingScore).toBe(85)
  })

  it('provides smart presets when switching generation modes', () => {
    const singleLessonPreset = getSmartModePreset('lesson_generation')
    expect(singleLessonPreset.granularity?.moduleCount).toBe(1)
    expect(singleLessonPreset.granularity?.lessonsPerModule).toBe(1)

    const finalExamPreset = getSmartModePreset('assessment_generation')
    expect(finalExamPreset.quizConfig?.placement).toBe('final_exam')
    expect(finalExamPreset.quizConfig?.questionCount).toBe(20)
  })
})
