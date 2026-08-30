/**
 * Blueprint -> Training Builder blocks
 *
 * Single source of truth for turning an AI `CourseBlueprint` into the
 * `documents` (content_type='training_block') rows that the Training Builder
 * (`src/pages/training/**`) and the Training Player (`src/pages/training/TrainingPlayer.tsx`)
 * both read.
 *
 * The AI engine emits a rich per-lesson structure (`components`,
 * `renderedHtml` / `renderedHtml_ar`, `learningOutcomes`, `visualAssets`,
 * lesson/module quizzes, course objectives). The old persistence path
 * flattened every lesson into ONE `text` row and dropped the rest. This
 * module maps every meaningful component to a real builder block, in order,
 * without fabricating content.
 *
 * Consumed by `aiCourseEngineService.saveBlueprintToDatabase`.
 */

import type { QuestionType } from '@/types/questions'
import type {
  CourseBlueprint,
  CourseVisualAsset,
  GeneratedUnifiedQuestion,
  LessonBlueprint,
  LessonComponentKey,
  ModuleBlueprint,
  QuizBlueprint,
} from '@/types/aiCourseEngine'

// Builder ContentType (mirrors src/pages/training/components/builder/trainingBuilderTypes.ts)
export type BuilderContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'document_link'
  | 'audio'
  | 'quiz'
  | 'interactive'
  | 'sop_reference'
  | 'assignment'
  | 'practical'
  | 'roleplay'

/**
 * SSOT mapping: LessonComponentKey -> the builder ContentType that best
 * represents that component. Used to tag every emitted block with a
 * `suggestedBlockType` so a human reviewer can one-click convert a section in
 * the builder, and to decide which components become non-text blocks.
 */
export const LESSON_COMPONENT_BLOCK_MAP: Record<LessonComponentKey, BuilderContentType> = {
  intro: 'text',
  objectives: 'text',
  concepts: 'text',
  definitions: 'text',
  explanation: 'text',
  examples: 'text',
  real_world_examples: 'text',
  case_study: 'roleplay',
  scenario: 'roleplay',
  demonstration: 'practical',
  step_procedure: 'practical',
  dialogue_script: 'roleplay',
  checklist: 'interactive',
  last_protocol: 'text',
  practical_exercise: 'practical',
  reflection_questions: 'text',
  discussion_questions: 'text',
  knowledge_check: 'quiz',
  summary: 'text',
  action_points: 'text',
  further_reading: 'text',
  assessment: 'quiz',
}

export const mapLessonComponentToBlockType = (component: LessonComponentKey): BuilderContentType =>
  LESSON_COMPONENT_BLOCK_MAP[component] ?? 'text'

/**
 * Clamp a mapped block type to one that renders safely from HTML content
 * alone (no media URL, no linked quiz row, no submission gating surprises)
 * when the only material we have for that section is `renderedHtml`.
 *
 * `quiz` / `interactive` / `image` sections fall back to `text` here — real
 * quiz blocks are emitted separately from actual question data, and real
 * media blocks from `visualAssets`.
 */
export const clampToRenderableBlockType = (type: BuilderContentType): BuilderContentType => {
  switch (type) {
    case 'text':
    case 'practical':
    case 'roleplay':
      return type
    default:
      return 'text'
  }
}

// Heading-text keywords -> component. Checked in order; first hit wins.
const COMPONENT_HEADING_KEYWORDS: Array<{ re: RegExp; component: LessonComponentKey }> = [
  { re: /\b(last|service recovery|recovery|problem resolution|بروتوكول|التعافي)\b/i, component: 'last_protocol' },
  { re: /\b(dialogue|script|verbatim|conversation|نصوص المحادثة|الحوار)\b/i, component: 'dialogue_script' },
  { re: /\b(checklist|inspection|قائمة تدقيق|التدقيق)\b/i, component: 'checklist' },
  { re: /\b(step|procedure|workflow|execution|steps|خطوات|الإجراء|التنفيذ)\b/i, component: 'step_procedure' },
  { re: /\b(demonstration|walkthrough|عرض توضيحي)\b/i, component: 'demonstration' },
  { re: /\b(scenario|situation|سيناريو)\b/i, component: 'scenario' },
  { re: /\b(case study|case|دراسة حالة)\b/i, component: 'case_study' },
  { re: /\b(practice|exercise|drill|hands-on|activity|تمرين|تدريب عملي)\b/i, component: 'practical_exercise' },
  { re: /\b(real[- ]world|real world|أمثلة واقعية)\b/i, component: 'real_world_examples' },
  { re: /\b(example|examples|مثال|أمثلة)\b/i, component: 'examples' },
  { re: /\b(definition|glossary|terminology|تعريف|مصطلحات)\b/i, component: 'definitions' },
  { re: /\b(concept|principle|مفهوم|مبادئ)\b/i, component: 'concepts' },
  { re: /\b(objective|standard|purpose|goals|الأهداف|المعايير)\b/i, component: 'objectives' },
  { re: /\b(reflection|reflect|تأمل)\b/i, component: 'reflection_questions' },
  { re: /\b(discussion|discuss|نقاش)\b/i, component: 'discussion_questions' },
  { re: /\b(knowledge check|quiz|check your|اختبر معلوماتك)\b/i, component: 'knowledge_check' },
  { re: /\b(further reading|resources|references|قراءات إضافية|مراجع)\b/i, component: 'further_reading' },
  { re: /\b(action point|takeaway action|next steps|pro tip|tip|نصيحة|خطوات عملية)\b/i, component: 'action_points' },
  { re: /\b(summary|recap|takeaway|الخلاصة|ملخص)\b/i, component: 'summary' },
  { re: /\b(introduction|overview|welcome|مقدمة|نظرة عامة)\b/i, component: 'intro' },
]

const inferComponentFromHeading = (heading: string): LessonComponentKey | null => {
  const plain = heading.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  for (const { re, component } of COMPONENT_HEADING_KEYWORDS) {
    if (re.test(plain)) return component
  }
  return null
}

export interface ComponentSection {
  component: LessonComponentKey
  heading: string
  html: string
}

/**
 * Best-effort split of a monolithic lesson HTML blob into ordered
 * per-component sections, splitting on h1-h4 headings. Falls back to a single
 * section when the content is not heading-delimited. Never invents content:
 * every character of the input ends up in exactly one section.
 */
export const splitRenderedHtmlIntoComponentSections = (
  rawHtml: string | undefined | null,
  components: LessonComponentKey[] = [],
): ComponentSection[] => {
  const html = (rawHtml || '').trim()
  if (!html) return []

  // Drop a single outer wrapper <div ...> ... </div> so sections are clean fragments.
  let body = html
  const outerWrap = body.match(/^<div[^>]*>([\s\S]*)<\/div>\s*$/i)
  if (outerWrap && !/<\/div>\s*<div/i.test(outerWrap[1])) {
    body = outerWrap[1].trim()
  }

  const headingRe = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi
  const matches: Array<{ index: number; length: number; heading: string }> = []
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(body)) !== null) {
    matches.push({ index: m.index, length: m[0].length, heading: m[2] })
  }

  if (matches.length < 2) {
    const only: LessonComponentKey =
      inferComponentFromHeading(matches[0]?.heading || '') || components[0] || 'explanation'
    return [{ component: only, heading: matches[0]?.heading?.replace(/<[^>]*>/g, '').trim() || '', html: body }]
  }

  const sections: ComponentSection[] = []
  const preamble = body.slice(0, matches[0].index).trim()
  if (preamble) {
    sections.push({ component: components[0] || 'intro', heading: '', html: preamble })
  }

  let fallbackCursor = 0
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length
    const chunk = body.slice(start, end).trim()
    if (!chunk) continue
    const inferred = inferComponentFromHeading(matches[i].heading)
    const positional = components[fallbackCursor] ?? components[components.length - 1] ?? 'explanation'
    if (!inferred) fallbackCursor++
    sections.push({
      component: inferred || positional,
      heading: matches[i].heading.replace(/<[^>]*>/g, '').trim(),
      html: chunk,
    })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Block drafts
// ---------------------------------------------------------------------------

export interface BlueprintBlockDraft {
  blockType: BuilderContentType
  title: string
  /** English HTML/markup for the block. */
  content: string
  /** Arabic HTML/markup, when the blueprint carries it. Persisted to
   *  `documents.content_ar` AND `content_data.translations.ar`. */
  contentAr?: string
  contentUrl?: string | null
  durationSeconds?: number | null
  isMandatory: boolean
  contentData: Record<string, unknown>
  /** When set, the save path creates a real `learning_quizzes` row + linked
   *  `unified_questions` and stamps `content_data.quiz_id`. */
  quiz?: QuizBlueprint
  /** When set, the save path also inserts a `course_visual_assets` row. */
  visualAsset?: CourseVisualAsset
  /** Section grouping the Training Builder reconstructs from `content_data`. */
  section: { id: string; title: string; order: number; description?: string }
}

const listToHtml = (items: string[]): string =>
  `<ul>${items.filter(Boolean).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const withTranslations = (
  base: Record<string, unknown>,
  ar: string | undefined,
): Record<string, unknown> => {
  if (!ar || !ar.trim()) return base
  const existing = (base.translations && typeof base.translations === 'object' ? base.translations : {}) as Record<string, unknown>
  return { ...base, translations: { ...existing, ar } }
}

const OVERVIEW_SECTION = { id: 'course-overview', title: 'Course Overview', order: 0 }

/**
 * Turn a full blueprint into an ordered list of builder block drafts.
 * The save path assigns `block_order` by array position.
 */
export const blueprintToBlockDrafts = (
  blueprint: CourseBlueprint,
  opts: { defaultLessonDurationMinutes?: number } = {},
): BlueprintBlockDraft[] => {
  const drafts: BlueprintBlockDraft[] = []
  const defaultDuration = opts.defaultLessonDurationMinutes ?? 15

  // --- Course objectives (leading, navigable) ---
  const objectiveParts: string[] = []
  if (blueprint.terminalObjectives?.length) {
    objectiveParts.push(`<h3>Terminal Objectives</h3>${listToHtml(blueprint.terminalObjectives)}`)
  }
  if (blueprint.enablingObjectives?.length) {
    objectiveParts.push(`<h3>Enabling Objectives</h3>${listToHtml(blueprint.enablingObjectives)}`)
  }
  if (blueprint.prerequisites?.length) {
    objectiveParts.push(`<h3>Prerequisites</h3>${listToHtml(blueprint.prerequisites)}`)
  }
  if (objectiveParts.length) {
    drafts.push({
      blockType: 'text',
      title: 'Course Objectives',
      content: objectiveParts.join('\n'),
      isMandatory: false,
      section: OVERVIEW_SECTION,
      contentData: {
        component: 'objectives',
        suggestedBlockType: 'text',
        ai_generated: true,
        is_course_overview: true,
      },
    })
  }

  blueprint.modules.forEach((mod, moduleIndex) => {
    const section = {
      id: mod.id || `module-${moduleIndex + 1}`,
      title: mod.title || `Module ${moduleIndex + 1}`,
      description: mod.description || '',
      order: moduleIndex + 1,
    }

    for (const lesson of mod.lessons) {
      drafts.push(...lessonToBlockDrafts(lesson, mod, section, defaultDuration))
    }

    // Module checkpoint quiz
    if (hasQuestions(mod.moduleQuiz)) {
      drafts.push({
        blockType: 'quiz',
        title: mod.moduleQuiz!.title || `${mod.title} Knowledge Check`,
        content: '',
        isMandatory: true,
        section,
        quiz: mod.moduleQuiz,
        contentData: {
          component: 'knowledge_check',
          suggestedBlockType: 'quiz',
          is_checkpoint: true,
          passing_score: mod.moduleQuiz!.passingScore || 80,
          topic: mod.title,
          module_id: mod.id,
          ai_generated: true,
        },
      })
    }
  })

  // --- Final assessment (trailing) ---
  if (hasQuestions(blueprint.finalAssessment)) {
    drafts.push({
      blockType: 'quiz',
      title: blueprint.finalAssessment!.title || `${blueprint.title} Final Comprehensive Exam`,
      content: '',
      isMandatory: true,
      section: { id: 'course-wrap-up', title: 'Final Assessment', order: blueprint.modules.length + 1 },
      quiz: blueprint.finalAssessment,
      contentData: {
        component: 'assessment',
        suggestedBlockType: 'quiz',
        is_final_assessment: true,
        passing_score: blueprint.finalAssessment!.passingScore || 85,
        topic: blueprint.title,
        ai_generated: true,
      },
    })
  }

  // --- Course summary / key takeaways (trailing, navigable) ---
  if (blueprint.summaryTakeaways?.length) {
    drafts.push({
      blockType: 'text',
      title: 'Key Takeaways',
      content: `<h3>Key Takeaways</h3>${listToHtml(blueprint.summaryTakeaways)}`,
      isMandatory: false,
      section: { id: 'course-wrap-up', title: 'Final Assessment', order: blueprint.modules.length + 1 },
      contentData: {
        component: 'summary',
        suggestedBlockType: 'text',
        ai_generated: true,
        is_course_summary: true,
      },
    })
  }

  return drafts
}

const hasQuestions = (q: QuizBlueprint | undefined): q is QuizBlueprint =>
  !!q && Array.isArray(q.questions) && q.questions.length > 0

const lessonToBlockDrafts = (
  lesson: LessonBlueprint,
  mod: ModuleBlueprint,
  section: { id: string; title: string; order: number; description?: string },
  defaultDuration: number,
): BlueprintBlockDraft[] => {
  const out: BlueprintBlockDraft[] = []
  const durationSeconds = (lesson.durationMinutes || defaultDuration) * 60
  const baseContentData = {
    templateType: lesson.templateType,
    learningOutcomes: lesson.learningOutcomes || [],
    components: lesson.components || [],
    moduleTitle: mod.title,
    module_id: mod.id,
    lesson_id: lesson.id,
    lesson_title: lesson.title,
    lesson_title_ar: lesson.title_ar,
    ai_generated: true,
  }

  // 1. Learning outcomes (real blueprint data, otherwise dropped)
  if ((lesson.learningOutcomes || []).length > 0) {
    out.push({
      blockType: 'text',
      title: `${lesson.title} — Learning Outcomes`,
      content: `<h3>By the end of this lesson you will be able to:</h3>${listToHtml(lesson.learningOutcomes)}`,
      isMandatory: false,
      section,
      contentData: { ...baseContentData, component: 'objectives', suggestedBlockType: 'text' },
    })
  }

  // 2. Main lesson content — split monolithic renderedHtml into ordered
  //    per-component blocks when possible.
  const enSections = splitRenderedHtmlIntoComponentSections(lesson.renderedHtml, lesson.components)
  const arSections = splitRenderedHtmlIntoComponentSections(lesson.renderedHtml_ar, lesson.components)
  const arAligned = arSections.length === enSections.length

  if (enSections.length === 0 && lesson.renderedHtml_ar) {
    // Arabic-only content (English blob missing)
    out.push({
      blockType: 'text',
      title: lesson.title || 'Lesson',
      content: lesson.renderedHtml_ar,
      isMandatory: true,
      durationSeconds,
      section,
      contentData: withTranslations(
        { ...baseContentData, component: 'explanation', suggestedBlockType: 'text' },
        lesson.renderedHtml_ar,
      ),
    })
  } else if (enSections.length === 0 && !lesson.renderedHtml_ar && (lesson.description || '').trim()) {
    // No rendered lesson body at all — keep the description as a text block
    // rather than dropping the lesson entirely.
    out.push({
      blockType: 'text',
      title: lesson.title || 'Lesson',
      content: `<p>${escapeHtml(lesson.description as string)}</p>`,
      contentAr: (lesson.description_ar || '').trim() ? `<p>${escapeHtml(lesson.description_ar as string)}</p>` : undefined,
      isMandatory: true,
      durationSeconds,
      section,
      contentData: withTranslations(
        { ...baseContentData, component: 'explanation', suggestedBlockType: 'text' },
        (lesson.description_ar || '').trim() ? `<p>${escapeHtml(lesson.description_ar as string)}</p>` : undefined,
      ),
    })
  }

  enSections.forEach((sec, idx) => {
    const mappedType = mapLessonComponentToBlockType(sec.component)
    const blockType = clampToRenderableBlockType(mappedType)
    const isFirst = idx === 0
    const arForSection = arAligned ? arSections[idx]?.html : isFirst ? lesson.renderedHtml_ar : undefined
    const nonTextGuard =
      blockType === 'practical' || blockType === 'roleplay'
        ? { requires_submission: false, requires_instructor_approval: false }
        : {}

    out.push({
      blockType,
      title: sec.heading || lesson.title || 'Lesson',
      content: sec.html,
      contentAr: arForSection,
      // Only the primary instructional block gates progression; supporting
      // component blocks (examples, summary, reflection) do not.
      isMandatory: isFirst && (blockType === 'text'),
      durationSeconds: isFirst ? durationSeconds : null,
      section,
      contentData: withTranslations(
        {
          ...baseContentData,
          component: sec.component,
          suggestedBlockType: mappedType,
          ...nonTextGuard,
        },
        arForSection,
      ),
    })
  })

  // 3. Visual assets -> real image blocks
  ;(lesson.visualAssets || []).forEach((asset, idx) => {
    const caption = asset.caption || asset.title || ''
    out.push({
      blockType: 'image',
      title: asset.title || `${lesson.title} visual ${idx + 1}`,
      content: caption ? `<p>${escapeHtml(caption)}</p>` : '',
      contentAr: asset.caption_ar,
      contentUrl: asset.image_url,
      isMandatory: false,
      section,
      visualAsset: asset,
      contentData: withTranslations(
        {
          ...baseContentData,
          component: 'demonstration',
          suggestedBlockType: 'image',
          alt_text: asset.alt_text,
          alt_text_ar: asset.alt_text_ar,
          caption_ar: asset.caption_ar,
          placement: asset.placement,
          visual_asset: true,
        },
        asset.caption_ar,
      ),
    })
  })

  // 4. Lesson-level knowledge-check quizzes -> real quiz blocks
  ;(lesson.quizCheckpoints || []).forEach((quiz, idx) => {
    if (!hasQuestions(quiz)) return
    out.push({
      blockType: 'quiz',
      title: quiz.title || `${lesson.title} Knowledge Check`,
      content: '',
      isMandatory: true,
      section,
      quiz,
      contentData: {
        ...baseContentData,
        component: 'knowledge_check',
        suggestedBlockType: 'quiz',
        is_checkpoint: true,
        passing_score: quiz.passingScore || 80,
        topic: lesson.title,
        checkpoint_index: idx,
      },
    })
  })

  return out
}

// ---------------------------------------------------------------------------
// Quiz question persistence helpers (SSOT for row shapes)
// ---------------------------------------------------------------------------

// Full `question_type` Postgres enum (unified_questions).
const UNIFIED_QUESTION_TYPES = new Set<string>([
  'mcq', 'mcq_multi', 'true_false', 'yes_no', 'fill_blank', 'short_answer',
  'long_answer', 'matching', 'ordering', 'ranking', 'scenario', 'case_based',
  'numeric', 'code_technical', 'categorization', 'hotspot_image',
])

export const normalizeUnifiedQuestionType = (value: string | undefined | null): QuestionType =>
  (value && UNIFIED_QUESTION_TYPES.has(value) ? value : 'mcq') as QuestionType

const normalizeDifficulty = (value: string | undefined): 'easy' | 'medium' | 'hard' | 'expert' => {
  if (value === 'easy' || value === 'hard' || value === 'expert') return value
  return 'medium'
}

export interface QuestionRowContext {
  trainingModuleId: string
  createdBy?: string | null
  sourceDomain?: string
}

export const buildUnifiedQuestionRow = (
  q: GeneratedUnifiedQuestion,
  ctx: QuestionRowContext,
): Record<string, unknown> => ({
  source_domain: ctx.sourceDomain || 'knowledge',
  question_text: q.question_text,
  question_text_ar: q.question_text_ar || null,
  question_type: normalizeUnifiedQuestionType(q.question_type),
  difficulty: normalizeDifficulty(q.difficulty),
  bloom_level: q.bloom_level || null,
  points: typeof q.points === 'number' && q.points > 0 ? q.points : 1,
  correct_answer: q.correct_answer || q.options?.find((o) => o.is_correct)?.text || '',
  explanation: q.explanation || '',
  explanation_ar: q.explanation_ar || null,
  hint: q.hint || '',
  hint_ar: q.hint_ar || null,
  distractor_rationales: q.distractor_rationales || null,
  tags: Array.isArray(q.tags) && q.tags.length ? q.tags : null,
  training_module_id: ctx.trainingModuleId,
  ai_generated: true,
  status: 'published',
  created_by: ctx.createdBy || null,
})

export const buildUnifiedOptionRows = (
  q: GeneratedUnifiedQuestion,
  questionId: string,
): Record<string, unknown>[] => {
  const opts = q.options || []
  if (!opts.length) return []
  return opts.map((opt, idx) => ({
    question_id: questionId,
    option_text: opt.text,
    option_text_ar: opt.text_ar || null,
    match_value: opt.match_value || null,
    match_value_ar: opt.match_value_ar || null,
    is_correct: !!opt.is_correct,
    feedback: opt.feedback || null,
    feedback_ar: opt.feedback_ar || null,
    display_order: idx + 1,
  }))
}

/**
 * `unified_quiz_questions` link row. The column is `display_order` (1-based) —
 * NOT `order_index` (which does not exist on this table and silently broke
 * every module/final quiz link in the old save path).
 */
export const buildQuizQuestionLinkRow = (
  quizId: string,
  questionId: string,
  index: number,
): Record<string, unknown> => ({
  quiz_id: quizId,
  question_id: questionId,
  display_order: index + 1,
})
