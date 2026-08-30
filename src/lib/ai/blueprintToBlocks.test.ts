import { describe, expect, it } from 'vitest'
import {
  blueprintToBlockDrafts,
  buildQuizQuestionLinkRow,
  buildUnifiedOptionRows,
  buildUnifiedQuestionRow,
  clampToRenderableBlockType,
  LESSON_COMPONENT_BLOCK_MAP,
  mapLessonComponentToBlockType,
  normalizeUnifiedQuestionType,
  splitRenderedHtmlIntoComponentSections,
} from './blueprintToBlocks'
import type { CourseBlueprint, GeneratedUnifiedQuestion } from '@/types/aiCourseEngine'

describe('blueprintToBlocks - component mapping (SSOT)', () => {
  it('maps every LessonComponentKey to a builder ContentType', () => {
    const keys = Object.keys(LESSON_COMPONENT_BLOCK_MAP)
    expect(keys.length).toBe(22)
    expect(mapLessonComponentToBlockType('scenario')).toBe('roleplay')
    expect(mapLessonComponentToBlockType('dialogue_script')).toBe('roleplay')
    expect(mapLessonComponentToBlockType('step_procedure')).toBe('practical')
    expect(mapLessonComponentToBlockType('practical_exercise')).toBe('practical')
    expect(mapLessonComponentToBlockType('knowledge_check')).toBe('quiz')
    expect(mapLessonComponentToBlockType('assessment')).toBe('quiz')
    expect(mapLessonComponentToBlockType('summary')).toBe('text')
    expect(mapLessonComponentToBlockType('checklist')).toBe('interactive')
  })

  it('clamps non-HTML-renderable block types back to text', () => {
    expect(clampToRenderableBlockType('text')).toBe('text')
    expect(clampToRenderableBlockType('practical')).toBe('practical')
    expect(clampToRenderableBlockType('roleplay')).toBe('roleplay')
    expect(clampToRenderableBlockType('quiz')).toBe('text')
    expect(clampToRenderableBlockType('image')).toBe('text')
    expect(clampToRenderableBlockType('interactive')).toBe('text')
    expect(clampToRenderableBlockType('video')).toBe('text')
  })
})

describe('splitRenderedHtmlIntoComponentSections', () => {
  const monolithic = `<div class="space-y-4">
    <h3>1. Executive Standard &amp; Operational Purpose</h3>
    <p>Why this matters.</p>
    <h3>2. Step-by-Step Procedure &amp; Time Benchmarks</h3>
    <ol><li>Do the thing.</li></ol>
    <h3>3. 5-Star Quality Inspection Checklist</h3>
    <ul><li>Check it.</li></ul>
  </div>`

  it('splits a monolithic blob into ordered per-heading sections', () => {
    const sections = splitRenderedHtmlIntoComponentSections(monolithic, ['objectives', 'step_procedure', 'checklist'])
    expect(sections.length).toBe(3)
    expect(sections[0].component).toBe('objectives')
    expect(sections[1].component).toBe('step_procedure')
    expect(sections[2].component).toBe('checklist')
    // No content is lost
    expect(sections[1].html).toContain('Do the thing.')
    expect(sections[2].html).toContain('Check it.')
    // The outer wrapper div is stripped
    expect(sections[0].html.startsWith('<div')).toBe(false)
  })

  it('returns a single section when there are no headings', () => {
    const sections = splitRenderedHtmlIntoComponentSections('<p>Just a paragraph.</p>', ['explanation'])
    expect(sections.length).toBe(1)
    expect(sections[0].component).toBe('explanation')
    expect(sections[0].html).toContain('Just a paragraph.')
  })

  it('returns an empty array for empty input', () => {
    expect(splitRenderedHtmlIntoComponentSections('', [])).toEqual([])
    expect(splitRenderedHtmlIntoComponentSections(undefined, [])).toEqual([])
  })
})

const baseBlueprint = (): CourseBlueprint => ({
  title: 'VIP Arrival Excellence',
  description: 'SOP training',
  courseType: 'professional',
  instructionalStrategy: 'explain_example_practice',
  targetAudience: 'employees',
  experienceLevel: 'intermediate',
  difficulty: 'intermediate',
  difficultyProgression: 'progressive',
  estimatedDurationMinutes: 60,
  terminalObjectives: ['Greet within 30 seconds', 'Assign VIP suite'],
  enablingObjectives: ['Verify room readiness'],
  prerequisites: ['Front office orientation'],
  summaryTakeaways: ['First impressions are decisive.'],
  modules: [
    {
      id: 'mod-1',
      title: 'Arrival Protocols',
      description: 'First impressions',
      durationMinutes: 30,
      difficultyLevel: 'intermediate',
      lessons: [
        {
          id: 'les-1-1',
          title: 'Greeting & Surname Recognition',
          templateType: 'sop_standard',
          durationMinutes: 15,
          learningOutcomes: ['Warm greeting within 30 seconds'],
          suggestedBlockTypes: ['text'],
          components: ['objectives', 'step_procedure'],
          renderedHtml: '<div class="space-y-4"><h3>Operational Purpose</h3><p>EN purpose.</p><h3>Step-by-Step Procedure</h3><ol><li>EN step.</li></ol></div>',
          renderedHtml_ar: '<div class="space-y-4"><h3>الأهداف التشغيلية</h3><p>الغرض بالعربية.</p><h3>خطوات التنفيذ</h3><ol><li>خطوة بالعربية.</li></ol></div>',
          visualAssets: [
            {
              id: 'img-1',
              course_id: 'c',
              module_id: 'mod-1',
              lesson_id: 'les-1-1',
              image_url: 'https://example.com/a.png',
              storage_bucket: 'content-media',
              title: 'Greeting visual',
              alt_text: 'A concierge greeting a guest',
              caption: 'Warm welcome',
              caption_ar: 'ترحيب حار',
              educational_purpose: 'demonstration',
              visual_concept: 'greeting',
              prompt: 'concierge greeting guest',
              aspect_ratio: '16:9',
              visual_style: 'educational_illustration',
              placement: 'concept_explanation',
              provider: 'cloudflare',
              model: 'x',
              status: 'completed',
              order_index: 0,
            },
          ],
        },
      ],
      moduleQuiz: {
        id: 'q-mod-1',
        title: 'Arrival Protocols Check',
        placement: 'per_module',
        questionCount: 1,
        passingScore: 80,
        questions: [
          {
            question_text: 'Greeting benchmark?',
            question_type: 'mcq',
            difficulty: 'medium',
            points: 10,
            options: [
              { text: '30 seconds', is_correct: true },
              { text: '5 minutes', is_correct: false },
            ],
            correct_answer: '30 seconds',
          },
        ],
      },
    },
  ],
  finalAssessment: {
    id: 'final',
    title: 'Final Exam',
    placement: 'final_assessment',
    questionCount: 1,
    passingScore: 85,
    questions: [
      {
        question_text: 'Order the arrival steps',
        question_type: 'ordering',
        difficulty: 'hard',
        points: 10,
      },
    ],
  },
})

describe('blueprintToBlockDrafts', () => {
  it('emits course objectives first and key takeaways last', () => {
    const drafts = blueprintToBlockDrafts(baseBlueprint())
    expect(drafts[0].title).toBe('Course Objectives')
    expect(drafts[0].section.order).toBe(0)
    expect(drafts[0].content).toContain('Greet within 30 seconds')
    expect(drafts[drafts.length - 1].title).toBe('Key Takeaways')
    expect(drafts[drafts.length - 1].content).toContain('First impressions are decisive.')
  })

  it('emits a learning-outcomes block plus split per-component lesson blocks', () => {
    const drafts = blueprintToBlockDrafts(baseBlueprint())
    const lessonBlocks = drafts.filter((d) => d.contentData.lesson_id === 'les-1-1')
    const outcomes = lessonBlocks.find((d) => d.title.includes('Learning Outcomes'))
    expect(outcomes).toBeDefined()
    expect(outcomes!.content).toContain('Warm greeting within 30 seconds')

    const components = lessonBlocks.map((d) => d.contentData.component)
    expect(components).toContain('objectives')
    expect(components).toContain('step_procedure')
  })

  it('carries Arabic content onto blocks (content_ar + content_data.translations.ar)', () => {
    const drafts = blueprintToBlockDrafts(baseBlueprint())
    const withAr = drafts.filter((d) => !!d.contentAr)
    expect(withAr.length).toBeGreaterThan(0)
    const first = withAr[0]
    expect(first.contentAr).toContain('بالعربية')
    expect((first.contentData.translations as Record<string, string>).ar).toBe(first.contentAr)
  })

  it('emits image blocks from visual assets with the media URL and asset payload', () => {
    const drafts = blueprintToBlockDrafts(baseBlueprint())
    const image = drafts.find((d) => d.blockType === 'image')
    expect(image).toBeDefined()
    expect(image!.contentUrl).toBe('https://example.com/a.png')
    expect(image!.visualAsset?.id).toBe('img-1')
    expect(image!.contentAr).toBe('ترحيب حار')
  })

  it('emits real quiz drafts for module quiz and final assessment, grouped in sections', () => {
    const drafts = blueprintToBlockDrafts(baseBlueprint())
    const quizzes = drafts.filter((d) => d.blockType === 'quiz')
    expect(quizzes.length).toBe(2)
    expect(quizzes[0].quiz?.id).toBe('q-mod-1')
    expect(quizzes[0].contentData.is_checkpoint).toBe(true)
    expect(quizzes[1].quiz?.id).toBe('final')
    expect(quizzes[1].contentData.is_final_assessment).toBe(true)

    // Module content shares one section id
    const modBlocks = drafts.filter((d) => d.section.id === 'mod-1')
    expect(modBlocks.length).toBeGreaterThan(1)
  })

  it('does not emit quiz drafts when a quiz has no questions', () => {
    const bp = baseBlueprint()
    bp.modules[0].moduleQuiz!.questions = []
    bp.finalAssessment!.questions = []
    const drafts = blueprintToBlockDrafts(bp)
    expect(drafts.some((d) => d.blockType === 'quiz')).toBe(false)
  })
})

describe('unified question row builders', () => {
  const q: GeneratedUnifiedQuestion = {
    question_text: 'What is the greeting benchmark?',
    question_text_ar: 'ما هو معيار الترحيب؟',
    question_type: 'mcq',
    difficulty: 'medium',
    bloom_level: 'apply',
    points: 5,
    explanation: 'Because Forbes.',
    explanation_ar: 'لأن فوربس.',
    hint: 'Under a minute.',
    hint_ar: 'أقل من دقيقة.',
    options: [
      { text: '30 seconds', text_ar: '30 ثانية', is_correct: true, feedback: 'Correct' },
      { text: '5 minutes', is_correct: false },
    ],
    correct_answer: '30 seconds',
  }

  it('builds a unified_questions row with bilingual fields, bloom level and points', () => {
    const row = buildUnifiedQuestionRow(q, { trainingModuleId: 'm-1', createdBy: 'u-1' })
    expect(row.question_text_ar).toBe('ما هو معيار الترحيب؟')
    expect(row.explanation_ar).toBe('لأن فوربس.')
    expect(row.hint_ar).toBe('أقل من دقيقة.')
    expect(row.bloom_level).toBe('apply')
    expect(row.points).toBe(5)
    expect(row.training_module_id).toBe('m-1')
    expect(row.question_type).toBe('mcq')
  })

  it('normalizes question types across the full enum, falling back to mcq', () => {
    expect(normalizeUnifiedQuestionType('ordering')).toBe('ordering')
    expect(normalizeUnifiedQuestionType('scenario')).toBe('scenario')
    expect(normalizeUnifiedQuestionType('ranking')).toBe('ranking')
    expect(normalizeUnifiedQuestionType('numeric')).toBe('numeric')
    expect(normalizeUnifiedQuestionType('totally_made_up')).toBe('mcq')
    expect(normalizeUnifiedQuestionType(undefined)).toBe('mcq')
  })

  it('builds option rows with 1-based display_order and bilingual text', () => {
    const rows = buildUnifiedOptionRows(q, 'question-123')
    expect(rows.length).toBe(2)
    expect(rows[0].display_order).toBe(1)
    expect(rows[1].display_order).toBe(2)
    expect(rows[0].option_text_ar).toBe('30 ثانية')
    expect(rows[0].feedback).toBe('Correct')
    expect(rows[0].is_correct).toBe(true)
  })

  it('builds a quiz link row keyed by display_order (never order_index)', () => {
    const link = buildQuizQuestionLinkRow('quiz-1', 'question-1', 0)
    expect(link).toEqual({ quiz_id: 'quiz-1', question_id: 'question-1', display_order: 1 })
    expect('order_index' in link).toBe(false)
    expect(buildQuizQuestionLinkRow('quiz-1', 'question-2', 3).display_order).toBe(4)
  })
})
