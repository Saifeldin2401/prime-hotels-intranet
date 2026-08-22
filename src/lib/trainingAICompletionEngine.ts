/**
 * Hierarchical AI Completion & Auto-Filling Engine
 *
 * Intelligently generates missing titles, descriptions, learning objectives,
 * SOP workflows, and section overviews using surrounding hierarchical context.
 * Strictly preserves manual user content and enforces a confidence & review model.
 */

import { aiService } from '@/lib/gemini'
import type { ContentBlockForm, TrainingSection } from '@/pages/training/components/builder/trainingBuilderTypes'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MissingFieldType =
  | 'module_title'
  | 'module_description'
  | 'learning_objectives'
  | 'section_title'
  | 'section_description'
  | 'lesson_title'
  | 'lesson_content'
  | 'quiz_instructions'

export type AIConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface HierarchyContext {
  courseTitle?: string
  courseDescription?: string
  department?: string
  difficulty?: string
  audience?: string
  sectionTitle?: string
  sectionSummary?: string
  siblingTitles?: string[]
  childLessonTitles?: string[]
  language?: string
}

export interface AISuggestionResult {
  fieldType: MissingFieldType
  suggestedValue: string
  confidence: AIConfidenceLevel
  rationale: string
  targetId: string // section ID or block ID
  parentSectionId?: string
}

export interface AIImprovementPlan {
  totalSuggestions: number
  safeAutoApplyCount: number
  suggestions: AISuggestionResult[]
  improvedSections: TrainingSection[]
  improvedTitle?: string
  improvedDescription?: string
}

// ---------------------------------------------------------------------------
// Single Field Generation with Hierarchical Context
// ---------------------------------------------------------------------------

/**
 * Generates an appropriate, context-aware value for a missing field in the training hierarchy.
 */
export async function generateMissingField(
  fieldType: MissingFieldType,
  context: HierarchyContext
): Promise<{ text: string; confidence: AIConfidenceLevel; rationale: string }> {
  const language = context.language || 'English'
  const isArabic = language.toLowerCase().includes('ar') || language.toLowerCase().includes('arabic')
  const department = context.department || 'Hotel Operations'

  // Context gathering
  const surroundingLessons = (context.childLessonTitles || []).filter(Boolean).join(', ')
  const siblingTopics = (context.siblingTitles || []).filter(Boolean).join(', ')

  let systemPrompt = ''
  let userPrompt = ''

  switch (fieldType) {
    case 'module_title':
      userPrompt = isArabic
        ? `اقترح عنواناً احترافياً موجزاً وجذاباً لبرنامج تدريبي فندقي فاخر.
القسم: ${department}
موضوعات الدورة التدريبية: ${surroundingLessons || siblingTopics || 'خدمة النزلاء والتميز التشغيلي'}
أجب بالعنوان فقط بدون علامات اقتباس وبدون أي شرح إضافي.`
        : `Generate a concise, professional title for a luxury hotel training course.
Department: ${department}
Topics covered: ${surroundingLessons || siblingTopics || 'Guest service excellence and standard operations'}
Respond ONLY with the title text, with no quotes or extra commentary.`
      break

    case 'module_description':
      userPrompt = isArabic
        ? `اكتب وصفاً تدريبياً احترافياً وموجزاً (فقرة من 3-4 جمل) لدورة "${context.courseTitle || 'التميز الفندقي'}".
القسم: ${department}
الجمهور المستهدف: ${context.audience || 'جميع موظفي الفندق'}
الدروس المتضمنة: ${surroundingLessons || siblingTopics}
يجب أن يوضح الوصف المهارات المكتسبة والنتائج التشغيلية المتوقعة. أجب بنص الوصف فقط.`
        : `Write a professional course description (3-4 sentences) for "${context.courseTitle || 'Hotel Operations Excellence'}".
Department: ${department}
Target Audience: ${context.audience || 'Hotel associates'}
Lessons included: ${surroundingLessons || siblingTopics}
Explain the operational purpose, key competencies developed, and guest impact. Respond ONLY with the description text.`
      break

    case 'section_title':
      userPrompt = isArabic
        ? `اقترح عنواناً واضحاً وموجزاً لقسم تدريبي يحتوي على الدروس التالية:
الدورة: "${context.courseTitle || 'التدريب الفندقي'}"
الدروس: ${surroundingLessons || 'إجراءات الخدمة والمعايير'}
أجب بالعنوان فقط بدون علامات اقتباس.`
        : `Generate a clear, professional title for a training section containing these lessons:
Course: "${context.courseTitle || 'Hospitality Training'}"
Lessons: ${surroundingLessons || 'Service workflows and standards'}
Respond ONLY with the section title.`
      break

    case 'section_description':
      userPrompt = isArabic
        ? `اكتب ملخصاً تمهيدياً موجزاً (جملتان) لقسم "${context.sectionTitle}" ضمن دورة "${context.courseTitle}".
الدروس: ${surroundingLessons}
أجب بالنص فقط.`
        : `Write a brief introductory overview (2 sentences) for the section "${context.sectionTitle}" in the course "${context.courseTitle}".
Lessons: ${surroundingLessons}
Respond ONLY with the overview text.`
      break

    case 'learning_objectives':
      userPrompt = isArabic
        ? `اكتب 3 أهداف تعليمية سلوكية وقابلة للقياس (تبدأ بأفعال مثل: يحدد، يطبق، ينفذ، يشرح) لقسم "${context.sectionTitle || context.courseTitle}".
الدروس: ${surroundingLessons}
نسق الأهداف كقائمة نقطية HTML دلالية <ul><li>...</li></ul>.`
        : `Write 3 measurable, action-oriented learning objectives (starting with verbs like: Identify, Demonstrate, Apply, Execute) for "${context.sectionTitle || context.courseTitle}".
Lessons: ${surroundingLessons}
Format as semantic HTML bullet list <ul><li>...</li></ul>.`
      break

    default:
      userPrompt = `Provide professional luxury hospitality training content for ${fieldType} in ${department}.`
      break
  }

  try {
    const rawResult = await aiService.generateText({
      prompt: userPrompt,
      systemInstruction: isArabic
        ? 'أنت خبير تدريب وتطوير ضيافة فاخرة في فنادق 5 نجوم. إجاباتك محددة وعملية ومباشرة.'
        : 'You are an elite luxury hospitality training and development director. Your responses are highly specific, professional, and direct.',
    })

    const cleanResult = (rawResult || '').trim().replace(/^["']|["']$/g, '')
    if (cleanResult) {
      const confidence: AIConfidenceLevel = surroundingLessons.length > 5 ? 'HIGH' : 'MEDIUM'
      return {
        text: cleanResult,
        confidence,
        rationale: `Synthesized from department (${department}) and surrounding curriculum context.`,
      }
    }
  } catch (error) {
    console.warn(`AI field generation failed for ${fieldType}, engaging heuristic fallback:`, error)
  }

  // Smart Contextual Heuristic Fallback
  let fallbackText = ''
  switch (fieldType) {
    case 'module_title':
      fallbackText = isArabic
        ? `${department} - التميز التشغيلي والإجراءات القياسية`
        : `${department} Standard Operational Excellence & Procedures`
      break
    case 'module_description':
      fallbackText = isArabic
        ? `برنامج تدريبي تشغيلي شامل يغطي الإجراءات القياسية ومعايير الجودة الفندقية لقسم ${department}. يكتسب المتدربون الكفاءات العملية الأساسية لضمان تجربة ضيافة استثنائية.`
        : `Comprehensive operational training module covering standard operating procedures and quality benchmarks for ${department}. Trainees will develop core practical competencies aligned with 5-star hotel operational standards.`
      break
    case 'section_title':
      fallbackText = surroundingLessons
        ? (isArabic ? `إجراءات ${surroundingLessons.split(',')[0].trim()}` : `${surroundingLessons.split(',')[0].trim()} Workflow & Guidelines`)
        : (isArabic ? 'المعايير التشغيلية والإجراءات القياسية' : 'Standard Operating Procedures & Guidelines')
      break
    case 'section_description':
      fallbackText = isArabic
        ? `مراجعة تفصيلية لإجراءات العمل التشغيلية القياسية وبروتوكولات تنفيذ الخدمة للقسم.`
        : `Detailed review of standard operational workflows and service execution protocols.`
      break
    case 'learning_objectives':
      fallbackText = isArabic
        ? `<ul><li>إتقان الإجراءات التشغيلية القياسية الخاصة بالقسم</li><li>تنفيذ مهام العمل وفقاً لمعايير الجودة الفندقية الفاخرة</li><li>التعرف على التحديات التشغيلية الشائعة ومعالجتها استباقياً</li></ul>`
        : `<ul><li>Demonstrate mastery of departmental standard operating procedures</li><li>Execute task workflows according to 5-star quality benchmarks</li><li>Identify and resolve common operational exceptions proactively</li></ul>`
      break
    default:
      fallbackText = isArabic ? 'المعايير والإرشادات التشغيلية المعتمدة' : 'Approved standard operating guidelines and procedures'
  }

  return {
    text: fallbackText,
    confidence: 'MEDIUM',
    rationale: `Generated via contextual hotel operations heuristic fallback.`,
  }
}

// ---------------------------------------------------------------------------
// Hierarchical AI Audit & Optimization Plan
// ---------------------------------------------------------------------------

/**
 * Scans the complete course structure and produces an actionable AI improvement plan
 * while strictly protecting user-authored content.
 */
export async function buildAIImprovementPlan(params: {
  title: string
  description?: string
  category?: string
  difficultyLevel?: string
  audience?: string
  sections: TrainingSection[]
  language?: string
}): Promise<AIImprovementPlan> {
  const { title, description, category, difficultyLevel, audience, sections, language } = params
  const suggestions: AISuggestionResult[] = []
  let improvedTitle = title
  let improvedDescription = description

  // 1. Check Module Title
  if (!title || title.trim().length === 0 || title.toLowerCase().startsWith('new training')) {
    const allLessonTitles = sections.flatMap((s) => (s.items || []).map((i) => i.title)).filter(Boolean)
    const gen = await generateMissingField('module_title', {
      childLessonTitles: allLessonTitles,
      department: category,
      language,
    })
    if (gen.text) {
      improvedTitle = gen.text
      suggestions.push({
        fieldType: 'module_title',
        suggestedValue: gen.text,
        confidence: gen.confidence,
        rationale: gen.rationale,
        targetId: 'module-title',
      })
    }
  }

  // 2. Check Module Description
  if (!description || description.trim().length < 20) {
    const allLessonTitles = sections.flatMap((s) => (s.items || []).map((i) => i.title)).filter(Boolean)
    const gen = await generateMissingField('module_description', {
      courseTitle: improvedTitle,
      childLessonTitles: allLessonTitles,
      department: category,
      audience,
      language,
    })
    if (gen.text) {
      improvedDescription = gen.text
      suggestions.push({
        fieldType: 'module_description',
        suggestedValue: gen.text,
        confidence: gen.confidence,
        rationale: gen.rationale,
        targetId: 'module-description',
      })
    }
  }

  // 3. Check Sections & Lessons
  const improvedSections: TrainingSection[] = []

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx]
    const childLessonTitles = (sec.items || []).map((i) => i.title).filter(Boolean)
    let newSecTitle = sec.title
    let newSecDesc = sec.description || ''

    // Section Title
    if (!sec.title || sec.title.trim().length === 0 || sec.title.toLowerCase().startsWith('untitled')) {
      const gen = await generateMissingField('section_title', {
        courseTitle: improvedTitle,
        childLessonTitles,
        department: category,
        language,
      })
      if (gen.text) {
        newSecTitle = gen.text
        suggestions.push({
          fieldType: 'section_title',
          suggestedValue: gen.text,
          confidence: gen.confidence,
          rationale: gen.rationale,
          targetId: sec.id,
        })
      }
    }

    // Section Description
    if (!sec.description || sec.description.trim().length === 0) {
      const gen = await generateMissingField('section_description', {
        courseTitle: improvedTitle,
        sectionTitle: newSecTitle,
        childLessonTitles,
        department: category,
        language,
      })
      if (gen.text) {
        newSecDesc = gen.text
        suggestions.push({
          fieldType: 'section_description',
          suggestedValue: gen.text,
          confidence: gen.confidence,
          rationale: gen.rationale,
          targetId: sec.id,
        })
      }
    }

    improvedSections.push({
      ...sec,
      title: newSecTitle,
      description: newSecDesc,
    })
  }

  const safeAutoApplyCount = suggestions.filter((s) => s.confidence === 'HIGH').length

  return {
    totalSuggestions: suggestions.length,
    safeAutoApplyCount,
    suggestions,
    improvedSections,
    improvedTitle,
    improvedDescription,
  }
}
