/**
 * Unit Tests for AI Course Engine Service & Pipeline
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>()
  return {
    ...actual,
    callHuggingFace: vi.fn().mockImplementation(async () => {
      return JSON.stringify({
        shouldGenerate: true,
        purpose: 'process_visualization',
        educationalObjective: 'Visualizing 5-star hotel benchmark standard',
        subject: 'Greeting & Surname Recognition',
        visualConcept: 'Greeting standard execution',
        optimizedPrompt: 'Educational illustration of 5-star luxury hotel greeting procedure',
        placement: 'procedure',
        aspectRatio: '16:9',
        title: 'Greeting & Surname Recognition',
        altText: 'Educational visual illustrating Greeting & Surname Recognition procedure',
        caption: 'Adherence to standard operating workflows ensures flawless guest satisfaction.',
      })
    }),
  }
})

import {
  auditCourseQuality,
  BLOOM_PRESETS,
  COURSE_TYPES,
  INSTRUCTIONAL_STRATEGIES,
  validateCourseBlueprint,
  validateQuizQuestions,
} from '@/lib/ai/courseEngine'
import type { CourseBlueprint, FullCourseGenerationConfig } from '@/types/aiCourseEngine'

describe('AI Course Engine', () => {
  const mockConfig: FullCourseGenerationConfig = {
    generationMode: 'full_course',
    courseType: 'professional',
    instructionalStrategy: 'explain_example_practice',
    targetAudience: 'employees',
    experienceLevel: 'intermediate',
    difficulty: 'intermediate',
    difficultyProgression: 'progressive',
    granularity: {
      moduleCount: 3,
      lessonsPerModule: 2,
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
      questionCount: 4,
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
    questionTypes: ['mcq', 'scenario', 'ordering', 'matching'],
    bloomDistribution: BLOOM_PRESETS.intermediate,
    aiControls: {
      preferredModel: 'auto',
      creativity: 'balanced',
      strictness: 'balanced',
      sourceMode: 'source_enhanced',
      hallucinationProtection: true,
      targetLanguage: 'English',
    },
    sourceContent: 'Standard VIP check-in protocols and greeting standards.',
  }

  const mockBlueprint: CourseBlueprint = {
    title: 'VIP Guest Arrival & Check-In Excellence',
    subtitle: 'Forbes 5-Star Front Desk Standards',
    description: 'Comprehensive SOP training for front office associates.',
    courseType: 'professional',
    instructionalStrategy: 'explain_example_practice',
    targetAudience: 'employees',
    experienceLevel: 'intermediate',
    difficulty: 'intermediate',
    difficultyProgression: 'progressive',
    estimatedDurationMinutes: 90,
    terminalObjectives: [
      'Execute Forbes 5-star greeting in under 30 seconds',
      'Accurately assign VIP suites in PMS',
      'Demonstrate LAST recovery framework for arrival escalations',
    ],
    enablingObjectives: [
      'Verify room readiness',
      'Issue encoded keycards',
      'Deliver luggage orientation',
    ],
    prerequisites: ['Basic front office orientation'],
    modules: [
      {
        id: 'mod-1',
        title: 'Arrival Protocols & VIP Greeting',
        description: 'First impression standards',
        durationMinutes: 30,
        difficultyLevel: 'intermediate',
        lessons: [
          {
            id: 'les-1-1',
            title: 'Greeting & Surname Recognition',
            templateType: 'sop_standard',
            durationMinutes: 15,
            learningOutcomes: ['Warm greeting within 30 seconds', 'Eye contact and surname use'],
            suggestedBlockTypes: ['text'],
            components: ['intro', 'step_procedure', 'checklist'],
            renderedHtml: '<p>Standard check-in content</p>',
          },
          {
            id: 'les-1-2',
            title: 'PMS Key Encoding & Registration',
            templateType: 'practical',
            durationMinutes: 15,
            learningOutcomes: ['Accurate PMS check-in', 'Keycard security verification'],
            suggestedBlockTypes: ['text'],
            components: ['step_procedure', 'summary'],
            renderedHtml: '<p>PMS steps</p>',
          },
        ],
      },
    ],
    summaryTakeaways: ['Guest perception is established in the first 30 seconds of arrival.'],
  }

  it('exposes all 18 course types and 14 instructional strategies', () => {
    expect(COURSE_TYPES.length).toBe(18)
    expect(INSTRUCTIONAL_STRATEGIES.length).toBe(14)
    expect(COURSE_TYPES.find((c) => c.id === 'compliance')).toBeDefined()
    expect(COURSE_TYPES.find((c) => c.id === 'microlearning')).toBeDefined()
    expect(INSTRUCTIONAL_STRATEGIES.find((s) => s.id === 'socratic')).toBeDefined()
  })

  it('validates Course Blueprints and detects structure errors', () => {
    const validResult = validateCourseBlueprint(mockBlueprint, mockConfig)
    expect(validResult.isValid).toBe(true)
    expect(validResult.issues.length).toBe(0)

    const invalidBlueprint: CourseBlueprint = {
      ...mockBlueprint,
      title: '',
      modules: [],
    }
    const invalidResult = validateCourseBlueprint(invalidBlueprint, mockConfig)
    expect(invalidResult.isValid).toBe(false)
    expect(invalidResult.issues).toContain('Course title is missing or too short.')
    expect(invalidResult.issues).toContain('Blueprint contains zero modules.')
  })

  it('validates Quiz Questions across all supported formats', () => {
    const questions = [
      {
        question_text: 'What is the benchmark greeting timeframe?',
        question_type: 'mcq' as const,
        difficulty: 'medium' as const,
        points: 10,
        options: [
          { text: 'Within 30 seconds', is_correct: true },
          { text: 'Within 5 minutes', is_correct: false },
        ],
        correct_answer: 'Within 30 seconds',
      },
      {
        question_text: 'Order the check-in steps in chronological sequence:',
        question_type: 'ordering' as const,
        difficulty: 'medium' as const,
        points: 10,
      },
    ]

    const { validQuestions, issues } = validateQuizQuestions(questions as any)
    expect(validQuestions.length).toBe(2)
    expect(issues.length).toBe(0)
    // Ordering should have synthesized 4 options
    expect(validQuestions[1].options?.length).toBe(4)
  })

  it('calculates LCMS QA Quality Report and gap analysis accurately', async () => {
    const report = await auditCourseQuality(mockBlueprint, mockConfig)
    expect(report.overallScore).toBeGreaterThanOrEqual(70)
    expect(report.overallScore).toBeLessThanOrEqual(100)
    expect(report.objectiveAlignmentScore).toBeGreaterThan(80)
    expect(report.cognitiveProgressionScore).toBeGreaterThan(80)
    expect(Array.isArray(report.identifiedGaps)).toBe(true)
  })

  it('analyzes visual learning opportunities for lessons with SOPs and procedures', async () => {
    const { analyzeLessonVisualOpportunities, DEFAULT_IMAGE_CONFIG } = await import('@/lib/ai/courseEngine')
    expect(DEFAULT_IMAGE_CONFIG.imageModel).toBe('@cf/bytedance/stable-diffusion-xl-lightning')
    expect(DEFAULT_IMAGE_CONFIG.provider).toBe('cloudflare')
    expect(DEFAULT_IMAGE_CONFIG.costTier).toBe('free_only')
    expect(DEFAULT_IMAGE_CONFIG.density).toBe('balanced')
    expect(DEFAULT_IMAGE_CONFIG.enableAIImages).toBe(true)

    const opportunities = await analyzeLessonVisualOpportunities({
      courseTitle: mockBlueprint.title,
      moduleTitle: mockBlueprint.modules[0].title,
      lesson: mockBlueprint.modules[0].lessons[0],
      lessonIndex: 0,
      totalLessonsInModule: 2,
      config: {
        ...mockConfig,
        imageConfig: {
          ...DEFAULT_IMAGE_CONFIG,
          preferredStyle: 'educational_illustration',
          preferredAspectRatio: '16:9',
        },
      },
    })

    expect(opportunities.length).toBeGreaterThan(0)
    expect(opportunities[0].shouldGenerate).toBe(true)
    expect(opportunities[0].aspectRatio).toBe('16:9')
    expect(opportunities[0].optimizedPrompt).toBeDefined()
    expect(opportunities[0].altText).toBeDefined()
  })

  it('respects image generation disabled config', async () => {
    const { analyzeLessonVisualOpportunities } = await import('@/lib/ai/courseEngine')
    const opportunities = await analyzeLessonVisualOpportunities({
      courseTitle: mockBlueprint.title,
      moduleTitle: mockBlueprint.modules[0].title,
      lesson: mockBlueprint.modules[0].lessons[0],
      lessonIndex: 0,
      totalLessonsInModule: 2,
      config: {
        ...mockConfig,
        imageConfig: {
          enableAIImages: false,
          imageModel: 'recraft/recraft-v3:free',
          selectionStrategy: 'auto_intelligent',
          preferredStyle: 'educational_illustration',
          preferredAspectRatio: '16:9',
          maxImagesPerLesson: 1,
          maxImagesPerCourse: 6,
        },
      },
    })

    expect(opportunities.length).toBe(0)
  })

  it('detects duplicate lesson topics and flags them in QA Quality Report', async () => {
    const repetitiveBlueprint: CourseBlueprint = {
      ...mockBlueprint,
      modules: [
        {
          id: 'mod-1',
          title: 'Module 1: Advanced Operational Protocols',
          description: 'Desc',
          durationMinutes: 30,
          difficultyLevel: 'intermediate',
          lessons: [
            {
              id: 'les-1-1',
              title: 'Lesson 1.1: Operational Standards & Procedures',
              templateType: 'sop_standard',
              durationMinutes: 15,
              learningOutcomes: [],
              suggestedBlockTypes: ['text'],
              components: ['intro'],
              renderedHtml: '<p>Too short</p>',
            },
            {
              id: 'les-1-2',
              title: 'Lesson 1.2: Operational Standards & Procedures',
              templateType: 'sop_standard',
              durationMinutes: 15,
              learningOutcomes: [],
              suggestedBlockTypes: ['text'],
              components: ['intro'],
              renderedHtml: '<p>Too short</p>',
            },
          ],
        },
        {
          id: 'mod-2',
          title: 'Module 2: Advanced Operational Protocols',
          description: 'Desc',
          durationMinutes: 30,
          difficultyLevel: 'intermediate',
          lessons: [
            {
              id: 'les-2-1',
              title: 'Lesson 2.1: Operational Standards & Procedures',
              templateType: 'sop_standard',
              durationMinutes: 15,
              learningOutcomes: [],
              suggestedBlockTypes: ['text'],
              components: ['intro'],
              renderedHtml: '<p>Too short</p>',
            },
          ],
        },
      ],
    }

    const report = await auditCourseQuality(repetitiveBlueprint, mockConfig)
    expect(report.repetitionIssues.length).toBeGreaterThan(0)
    expect(report.identifiedGaps.some((g) => g.area === 'Curriculum Progression')).toBe(true)
    expect(report.cognitiveProgressionScore).toBeLessThan(75)
    expect(report.overallScore).toBeLessThan(80)
  })

  it('auto-remediates gaps from the course itself (AI-grounded, no canned content)', async () => {
    vi.resetModules()
    const executePrompt = vi.fn().mockResolvedValue({
      data: JSON.stringify({
        terminal: ['Perform the guest check-in protocol', 'Resolve check-in exceptions', 'Verify guest identity documents'],
        enabling: ['Greet arriving guests', 'Confirm reservations', 'Issue room keys'],
      }),
      rawResponse: '',
    })
    const assessmentProcess = vi.fn().mockResolvedValue({
      data: [
        { question_text: 'What is the first step of check-in?', question_type: 'mcq', difficulty: 'medium', points: 10 },
        { question_text: 'Order the check-in steps.', question_type: 'ordering', difficulty: 'medium', points: 10 },
      ],
    })
    const writerProcess = vi.fn().mockResolvedValue({ data: `<p>${'Detailed check-in procedure. '.repeat(20)}</p>` })
    vi.doMock('@/lib/ai/client', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/ai/client')>()),
      aiClient: { executePrompt },
    }))
    vi.doMock('@/lib/ai/agents/assessmentAgent', () => ({ assessmentAgent: { process: assessmentProcess } }))
    vi.doMock('@/lib/ai/agents/contentWriterAgent', () => ({ contentWriterAgent: { process: writerProcess } }))

    const { remediateCourseQAGap, remediateAllCourseQAGaps } = await import('@/lib/ai/courseEngine')
    const sparseBlueprint = buildSparseBlueprint()

    const objectivesFix = await remediateCourseQAGap(sparseBlueprint, 'Learning Objectives', undefined)
    expect(objectivesFix.updatedBlueprint.terminalObjectives).toContain('Perform the guest check-in protocol')
    expect(objectivesFix.updatedQAReport.objectiveAlignmentScore).toBeGreaterThanOrEqual(85)
    // The prompt is built from this course's own outline.
    expect(executePrompt.mock.calls[0][0]).toContain('Guest Check-in Protocol')

    const fullFix = await remediateAllCourseQAGaps(sparseBlueprint, undefined)
    expect(fullFix.updatedQAReport.overallScore).toBeGreaterThanOrEqual(90)
    expect(fullFix.updatedBlueprint.modules[0].moduleQuiz?.questions.map((q) => q.question_text))
      .toEqual(['What is the first step of check-in?', 'Order the check-in steps.'])
    expect(assessmentProcess.mock.calls[0][0].title).toBe('Guest Check-in Protocol')
    expect(fullFix.updatedBlueprint.modules[0].lessons[0].renderedHtml).toContain('Detailed check-in procedure')

    vi.doUnmock('@/lib/ai/client')
    vi.doUnmock('@/lib/ai/agents/assessmentAgent')
    vi.doUnmock('@/lib/ai/agents/contentWriterAgent')
  })

  it('leaves gaps visible instead of inserting boilerplate when the AI is unavailable', async () => {
    vi.resetModules()
    vi.doMock('@/lib/ai/client', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/lib/ai/client')>()),
      aiClient: { executePrompt: vi.fn().mockRejectedValue(new Error('AI down')) },
    }))
    vi.doMock('@/lib/ai/agents/assessmentAgent', () => ({
      assessmentAgent: { process: vi.fn().mockRejectedValue(new Error('AI down')) },
    }))

    const { remediateCourseQAGap } = await import('@/lib/ai/courseEngine')
    const sparseBlueprint = buildSparseBlueprint()

    // Objectives fall back to the course's own module/lesson titles — never generic text.
    const objectivesFix = await remediateCourseQAGap(sparseBlueprint, 'Learning Objectives', undefined)
    expect(objectivesFix.updatedBlueprint.terminalObjectives).toEqual(['Demonstrate competence in Guest Check-in Protocol'])
    expect(objectivesFix.updatedBlueprint.enablingObjectives).toEqual(['Apply Welcome Procedure'])

    // No questions are fabricated; the assessment gap stays in the report.
    const quizFix = await remediateCourseQAGap(sparseBlueprint, 'Assessment Rigour', undefined)
    expect(quizFix.updatedBlueprint.modules[0].moduleQuiz).toBeUndefined()
    expect(quizFix.updatedQAReport.identifiedGaps.some((g) => g.area === 'Assessment Rigour')).toBe(true)

    vi.doUnmock('@/lib/ai/client')
    vi.doUnmock('@/lib/ai/agents/assessmentAgent')
  })

  function buildSparseBlueprint(): CourseBlueprint {
    return {
      ...mockBlueprint,
      terminalObjectives: [],
      enablingObjectives: [],
      modules: [
        {
          id: 'mod-1',
          title: 'Guest Check-in Protocol',
          durationMinutes: 20,
          difficultyLevel: 'intermediate',
          lessons: [
            {
              id: 'l-1',
              title: 'Welcome Procedure',
              templateType: 'sop_standard',
              durationMinutes: 10,
              learningOutcomes: [],
              suggestedBlockTypes: ['text'],
              components: ['step_procedure'],
              renderedHtml: '<p>Brief greeting</p>',
            },
          ],
        },
      ],
    }
  }
})


