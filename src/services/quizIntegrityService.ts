import { aiService } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

type SupportedQuestionType =
  | 'mcq'
  | 'mcq_multi'
  | 'true_false'
  | 'fill_blank'
  | 'scenario'
  | 'ordering'
  | 'matching'
  | 'short_answer'
  | 'long_answer'

type QuizOptionRow = {
  id: string
  option_text: string
  is_correct: boolean
  display_order: number
  feedback?: string | null
}

type QuizQuestionRow = {
  id: string
  question_text?: string | null
  question_type?: string | null
  status?: string | null
  correct_answer?: string | null
  explanation?: string | null
  hint?: string | null
  options?: QuizOptionRow[] | null
}

type QuizQuestionLinkRow = {
  id: string
  question_id: string
  display_order: number
  question?: QuizQuestionRow | null
}

type QuizDefinitionRow = {
  id: string
  title: string
  status?: string | null
  questions?: QuizQuestionLinkRow[] | null
}

type RepairPayload = {
  question_id: string
  question_text: string
  question_type: SupportedQuestionType
  options?: Array<{
    text: string
    is_correct: boolean
  }>
  correct_answer?: string | null
  explanation?: string | null
  hint?: string | null
}

export interface QuizIntegrityIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  questionId?: string
  questionOrder?: number
  fixable: boolean
}

export interface QuizIntegrityReport {
  quizId: string
  quizTitle: string
  valid: boolean
  issues: QuizIntegrityIssue[]
  errorCount: number
  warningCount: number
  repairedQuestionIds: string[]
  autoPublished: boolean
}

const OPTION_BASED_TYPES = new Set<SupportedQuestionType>(['mcq', 'mcq_multi', 'true_false', 'scenario'])
const SINGLE_CORRECT_TYPES = new Set<SupportedQuestionType>(['mcq', 'true_false', 'scenario'])
const SEQUENCE_BASED_TYPES = new Set<SupportedQuestionType>(['ordering', 'matching'])
const SUPPORTED_TYPES = new Set<SupportedQuestionType>([
  'mcq',
  'mcq_multi',
  'true_false',
  'fill_blank',
  'scenario',
  'ordering',
  'matching',
  'short_answer',
  'long_answer',
])

function normalizeText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function normalizeOptionText(value?: string | null) {
  return normalizeText(value)
}

function normalizeQuestionType(value?: string | null): SupportedQuestionType | null {
  const normalized = normalizeText(value).toLowerCase()
  if (SUPPORTED_TYPES.has(normalized as SupportedQuestionType)) {
    return normalized as SupportedQuestionType
  }
  if (normalized === 'multiple_choice') return 'mcq'
  if (normalized === 'multiple_select') return 'mcq_multi'
  if (normalized === 'boolean' || normalized === 'yes_no') return 'true_false'
  if (normalized === 'order' || normalized === 'sequence' || normalized === 'ranking') return 'ordering'
  if (normalized === 'match' || normalized === 'pairing') return 'matching'
  if (normalized === 'fill_in_the_blank' || normalized === 'fill-in-the-blank' || normalized === 'fill_in_blank') return 'fill_blank'
  if (normalized === 'short_answer_text') return 'short_answer'
  if (normalized === 'long_answer_text' || normalized === 'essay') return 'long_answer'
  return null
}

function formatQuestionRef(order?: number) {
  return typeof order === 'number' ? `Question ${order + 1}` : 'Question'
}

function sortQuizLinks(links: QuizQuestionLinkRow[]) {
  return [...links].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
}

function dedupeOptions(options: Array<{ text: string; is_correct: boolean }>) {
  const seen = new Set<string>()
  const deduped: Array<{ text: string; is_correct: boolean }> = []

  for (const option of options) {
    const text = normalizeOptionText(option.text)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push({
      text,
      is_correct: !!option.is_correct
    })
  }

  return deduped
}

function getEffectiveOptions(question?: QuizQuestionRow | null) {
  return (question?.options || [])
    .map(option => ({
      text: normalizeOptionText(option.option_text),
      is_correct: !!option.is_correct
    }))
    .filter(option => option.text.length > 0)
}

function validateQuestionLink(link: QuizQuestionLinkRow) {
  const issues: QuizIntegrityIssue[] = []
  const question = link.question
  const label = formatQuestionRef(link.display_order)

  if (!question) {
    issues.push({
      code: 'missing_question_row',
      severity: 'error',
      message: `${label} is linked to a missing question record.`,
      questionId: link.question_id,
      questionOrder: link.display_order,
      fixable: false
    })
    return issues
  }

  const questionText = normalizeText(question.question_text)
  const questionType = normalizeQuestionType(question.question_type)
  const questionStatus = normalizeText(question.status).toLowerCase()
  const options = getEffectiveOptions(question)
  const correctOptions = options.filter(option => option.is_correct)
  const correctAnswer = normalizeText(question.correct_answer)
  const duplicateOptionCount = options.length - new Set(options.map(option => option.text.toLowerCase())).size

  if (questionStatus !== 'published') {
    issues.push({
      code: 'question_not_published',
      severity: 'warning',
      message: `${label} is not published yet.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: false
    })
  }

  if (!questionText) {
    issues.push({
      code: 'missing_question_text',
      severity: 'error',
      message: `${label} is missing question text.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: true
    })
  } else if (questionText.length < 12) {
    issues.push({
      code: 'weak_question_text',
      severity: 'warning',
      message: `${label} is too short and may be unclear to learners.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: true
    })
  }

  if (!questionType) {
    issues.push({
      code: 'unsupported_question_type',
      severity: 'error',
      message: `${label} uses an unsupported question type.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: false
    })
    return issues
  }

  if (OPTION_BASED_TYPES.has(questionType)) {
    if (options.length < 2) {
      issues.push({
        code: 'not_enough_options',
        severity: 'error',
        message: `${label} needs at least two non-empty answer options.`,
        questionId: question.id,
        questionOrder: link.display_order,
        fixable: true
      })
    }

    if (duplicateOptionCount > 0) {
      issues.push({
        code: 'duplicate_options',
        severity: 'warning',
        message: `${label} contains duplicate answer options.`,
        questionId: question.id,
        questionOrder: link.display_order,
        fixable: true
      })
    }

    if (SINGLE_CORRECT_TYPES.has(questionType) && correctOptions.length !== 1) {
      issues.push({
        code: 'single_correct_mismatch',
        severity: 'error',
        message: `${label} must have exactly one correct option.`,
        questionId: question.id,
        questionOrder: link.display_order,
        fixable: true
      })
    }

    if (questionType === 'mcq_multi' && correctOptions.length < 1) {
      issues.push({
        code: 'missing_correct_option',
        severity: 'error',
        message: `${label} must have at least one correct option.`,
        questionId: question.id,
        questionOrder: link.display_order,
        fixable: true
      })
    }

    if (correctAnswer && correctOptions.length > 0) {
      const normalizedCorrectOptions = correctOptions.map(option => option.text.toLowerCase())
      if (!normalizedCorrectOptions.includes(correctAnswer.toLowerCase())) {
        issues.push({
          code: 'correct_answer_mismatch',
          severity: 'warning',
          message: `${label} has a stored correct answer that does not match the marked correct option.`,
          questionId: question.id,
          questionOrder: link.display_order,
          fixable: true
        })
      }
    }

    if (questionType === 'true_false') {
      const labels = new Set(options.map(option => option.text.toLowerCase()))
      if (!(labels.has('true') && labels.has('false') && options.length === 2)) {
        issues.push({
          code: 'true_false_options_invalid',
          severity: 'warning',
          message: `${label} should use canonical True/False options.`,
          questionId: question.id,
          questionOrder: link.display_order,
          fixable: true
        })
      }
    }
  }

  if (SEQUENCE_BASED_TYPES.has(questionType)) {
    if (options.length < 2) {
      issues.push({
        code: 'not_enough_sequence_items',
        severity: 'error',
        message: `${label} needs at least two steps or items to order/match.`,
        questionId: question.id,
        questionOrder: link.display_order,
        fixable: true
      })
    }
  }

  if (questionType === 'fill_blank' && !correctAnswer) {
    issues.push({
      code: 'missing_fill_blank_answer',
      severity: 'error',
      message: `${label} is missing the correct answer for its blank.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: true
    })
  }

  if (questionType === 'short_answer' && !correctAnswer) {
    issues.push({
      code: 'missing_short_answer',
      severity: 'warning',
      message: `${label} is missing a model answer key for auto-grading.`,
      questionId: question.id,
      questionOrder: link.display_order,
      fixable: true
    })
  }

  return issues
}

function validateQuizDefinition(quiz: QuizDefinitionRow) {
  const issues: QuizIntegrityIssue[] = []
  const links = sortQuizLinks(quiz.questions || [])

  if (links.length === 0) {
    issues.push({
      code: 'quiz_has_no_questions',
      severity: 'error',
      message: `Quiz "${quiz.title}" has no linked questions.`,
      fixable: true
    })
    return issues
  }

  for (const link of links) {
    issues.push(...validateQuestionLink(link))
  }

  return issues
}

async function autoRepairEmptyQuiz(
  quiz: QuizDefinitionRow,
  options?: {
    moduleTitle?: string
    moduleContext?: string
  },
  repairedQuestionIds?: Set<string>
) {
  const promptContext = options?.moduleContext || options?.moduleTitle || quiz.title
  let generatedQuestions: Array<{
    question_text: string
    question_type: string
    options?: Array<{ text: string; is_correct: boolean }>
    correct_answer?: string | null
    explanation?: string | null
    hint?: string | null
  }> = []

  try {
    const aiQuestions = await aiService.generateQuiz({
      sopContent: promptContext,
      count: 3,
      types: ['mcq', 'true_false'],
      difficulty: 'medium',
      includeHints: true,
      includeExplanations: true
    })
    if (aiQuestions && aiQuestions.length > 0) {
      generatedQuestions = aiQuestions.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: Array.isArray(q.options)
          ? q.options.map(opt => ({
              text: typeof opt === 'string' ? opt : ((opt as unknown) as { text?: string })?.text || String(opt),
              is_correct: typeof opt === 'string'
                ? opt.trim().toLowerCase() === (q.correct_answer || '').trim().toLowerCase()
                : Boolean(((opt as unknown) as { is_correct?: boolean })?.is_correct)
            }))
          : undefined,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        hint: q.hint
      }))
    }
  } catch (err) {
    console.warn('AI question generation for empty quiz failed, using fallback questions:', err)
  }

  if (generatedQuestions.length === 0) {
    const topic = options?.moduleTitle || quiz.title || 'Standard Operating Procedures'
    generatedQuestions = [
      {
        question_text: `Which of the following best describes the primary objective of ${topic}?`,
        question_type: 'mcq',
        options: [
          { text: `To ensure consistent service quality and compliance with ${topic} standards.`, is_correct: true },
          { text: 'To bypass established departmental procedures during peak operational hours.', is_correct: false },
          { text: 'To reduce communication between team members during daily operations.', is_correct: false },
          { text: 'To eliminate the need for documentation and record keeping.', is_correct: false }
        ],
        correct_answer: `To ensure consistent service quality and compliance with ${topic} standards.`,
        explanation: `Adhering to ${topic} ensures high service standards, guest satisfaction, and operational consistency across all properties.`,
        hint: 'Think about consistency, guest satisfaction, and quality standards.'
      },
      {
        question_text: `True or False: Staff members must follow the standard safety and quality guidelines outlined in ${topic}.`,
        question_type: 'true_false',
        options: [
          { text: 'True', is_correct: true },
          { text: 'False', is_correct: false }
        ],
        correct_answer: 'True',
        explanation: 'Following safety and quality guidelines is mandatory for all hotel operations and staff members.',
        hint: 'Compliance with hotel SOPs is obligatory.'
      },
      {
        question_text: `What is the expected protocol when an issue or exception arises during ${topic} operations?`,
        question_type: 'mcq',
        options: [
          { text: 'Report the issue immediately to the department supervisor and log the occurrence.', is_correct: true },
          { text: 'Ignore the discrepancy if guest service is not immediately impacted.', is_correct: false },
          { text: 'Delay reporting until the weekly departmental team meeting.', is_correct: false },
          { text: 'Attempt to modify standard procedures without prior approval.', is_correct: false }
        ],
        correct_answer: 'Report the issue immediately to the department supervisor and log the occurrence.',
        explanation: 'Prompt reporting and proper documentation ensure rapid resolution and prevent operational disruption.',
        hint: 'Timely communication with management is key.'
      }
    ]
  }

  const timestamp = new Date().toISOString()
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id

  for (let i = 0; i < generatedQuestions.length; i++) {
    const q = generatedQuestions[i]
    const { data: questionRecord, error: qError } = await supabase
      .from('unified_questions')
      .insert({
        source_domain: 'knowledge',
        question_text: q.question_text,
        question_type: (q.question_type as Database['public']['Enums']['question_type']) || 'mcq',
        difficulty: 'medium' as const,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        hint: q.hint || null,
        status: 'published' as const,
        created_by: userId,
        updated_at: timestamp
      })
      .select('id')
      .single()

    if (qError || !questionRecord) {
      console.error('Failed to insert question during auto-repair:', qError)
      continue
    }

    if (q.options && q.options.length > 0) {
      await supabase.from('unified_question_options').insert(
        q.options.map((opt, idx) => ({
          question_id: questionRecord.id,
          option_text: opt.text,
          is_correct: opt.is_correct,
          display_order: idx
        }))
      )
    }

    await supabase.from('unified_quiz_questions').insert({
      quiz_id: quiz.id,
      question_id: questionRecord.id,
      display_order: i + 1
    })

    if (repairedQuestionIds) {
      repairedQuestionIds.add(questionRecord.id)
    }
  }
}

async function fetchQuizDefinition(quizId: string) {
  const { data, error } = await supabase
    .from('learning_quizzes')
    .select(`
      id,
      title,
      status,
      questions:learning_quiz_questions(
        id,
        question_id,
        display_order,
        question:knowledge_questions(
          id,
          question_text,
          question_type,
          status,
          correct_answer,
          explanation,
          hint,
          options:knowledge_question_options(
            id,
            option_text,
            is_correct,
            display_order,
            feedback
          )
        )
      )
    `)
    .eq('id', quizId)
    .single()

  if (error) throw error
  return data as unknown as QuizDefinitionRow
}

function buildRepairInputs(quiz: QuizDefinitionRow, issues: QuizIntegrityIssue[]) {
  const fixableIssuesByQuestion = new Map<string, string[]>()

  for (const issue of issues) {
    if (!issue.fixable || !issue.questionId) continue
    const existing = fixableIssuesByQuestion.get(issue.questionId) || []
    existing.push(issue.message)
    fixableIssuesByQuestion.set(issue.questionId, existing)
  }

  const payload: Array<{
    question_id: string
    question_text: string
    question_type: string
    options?: Array<{ text: string; is_correct: boolean }>
    correct_answer?: string | null
    explanation?: string | null
    hint?: string | null
    issues: string[]
  }> = []

  for (const link of sortQuizLinks(quiz.questions || [])) {
    const question = link.question
    if (!question) continue
    const questionIssues = fixableIssuesByQuestion.get(question.id)
    if (!questionIssues || questionIssues.length === 0) continue

    payload.push({
      question_id: question.id,
      question_text: normalizeText(question.question_text),
      question_type: normalizeQuestionType(question.question_type) || 'mcq',
      options: getEffectiveOptions(question),
      correct_answer: normalizeText(question.correct_answer) || null,
      explanation: normalizeText(question.explanation) || null,
      hint: normalizeText(question.hint) || null,
      issues: questionIssues
    })
  }

  return payload
}

function buildHeuristicRepair(question: QuizQuestionRow): RepairPayload | null {
  const questionId = question.id
  const questionType = normalizeQuestionType(question.question_type)
  const questionText = normalizeText(question.question_text)

  if (!questionId || !questionType || !questionText) {
    return null
  }

  let options = dedupeOptions(getEffectiveOptions(question))
  let correctAnswer = normalizeText(question.correct_answer) || null

  if (questionType === 'true_false') {
    const existingCorrectOption = options.find(option => option.is_correct)?.text.toLowerCase()
    const normalizedCorrect = correctAnswer.toLowerCase() || existingCorrectOption || 'true'
    const correctIsFalse = normalizedCorrect === 'false'
    options = [
      { text: 'True', is_correct: !correctIsFalse },
      { text: 'False', is_correct: correctIsFalse }
    ]
    correctAnswer = correctIsFalse ? 'False' : 'True'
  } else if (SEQUENCE_BASED_TYPES.has(questionType)) {
    if (options.length < 2) {
      return null
    }
    return {
      question_id: questionId,
      question_text: questionText,
      question_type: questionType,
      options: options.map(opt => ({ ...opt, is_correct: true })),
      correct_answer: correctAnswer || options.map(o => o.text).join(' -> '),
      explanation: normalizeText(question.explanation) || null,
      hint: normalizeText(question.hint) || null
    }
  } else if (OPTION_BASED_TYPES.has(questionType)) {
    if (options.length > 0 && options.every(option => !option.is_correct) && correctAnswer) {
      options = options.map(option => ({
        ...option,
        is_correct: option.text.toLowerCase() === correctAnswer?.toLowerCase()
      }))
    }

    if (SINGLE_CORRECT_TYPES.has(questionType)) {
      let foundCorrect = false
      options = options.map(option => {
        if (option.is_correct && !foundCorrect) {
          foundCorrect = true
          return option
        }
        if (option.is_correct) {
          return { ...option, is_correct: false }
        }
        return option
      })

      const primaryCorrect = options.find(option => option.is_correct)
      correctAnswer = primaryCorrect?.text || null
    } else {
      correctAnswer = null
    }
  }

  if (questionType === 'fill_blank' && !correctAnswer) {
    return null
  }

  if (OPTION_BASED_TYPES.has(questionType) && options.length < 2) {
    return null
  }

  return {
    question_id: questionId,
    question_text: questionText,
    question_type: questionType,
    options: OPTION_BASED_TYPES.has(questionType) || SEQUENCE_BASED_TYPES.has(questionType) ? options : undefined,
    correct_answer: correctAnswer,
    explanation: normalizeText(question.explanation) || null,
    hint: normalizeText(question.hint) || null
  }
}

function normalizeRepairPayload(payload: RepairPayload): RepairPayload | null {
  const questionType = normalizeQuestionType(payload.question_type)
  const questionText = normalizeText(payload.question_text)

  if (!payload.question_id || !questionType || !questionText) {
    return null
  }

  let options = dedupeOptions(payload.options || [])
  let correctAnswer = normalizeText(payload.correct_answer) || null

  if (questionType === 'true_false') {
    const existingCorrectOption = options.find(option => option.is_correct)?.text.toLowerCase()
    const normalizedCorrect = (correctAnswer || existingCorrectOption || 'true').toLowerCase() === 'false' ? 'False' : 'True'
    options = [
      { text: 'True', is_correct: normalizedCorrect === 'True' },
      { text: 'False', is_correct: normalizedCorrect === 'False' }
    ]
    correctAnswer = normalizedCorrect
  } else if (SEQUENCE_BASED_TYPES.has(questionType)) {
    if (options.length < 2) return null
    return {
      question_id: payload.question_id,
      question_text: questionText,
      question_type: questionType,
      options: options.map(opt => ({ ...opt, is_correct: true })),
      correct_answer: correctAnswer || options.map(o => o.text).join(' -> '),
      explanation: normalizeText(payload.explanation) || null,
      hint: normalizeText(payload.hint) || null
    }
  } else if (OPTION_BASED_TYPES.has(questionType)) {
    if (options.length < 2) return null

    if (SINGLE_CORRECT_TYPES.has(questionType)) {
      const correctOptions = options.filter(option => option.is_correct)
      if (correctOptions.length !== 1) return null
      correctAnswer = correctOptions[0].text
    } else {
      if (options.filter(option => option.is_correct).length < 1) return null
      correctAnswer = null
    }
  } else {
    options = []
    if (!correctAnswer && questionType === 'fill_blank') return null
  }

  return {
    question_id: payload.question_id,
    question_text: questionText,
    question_type: questionType,
    options: OPTION_BASED_TYPES.has(questionType) || SEQUENCE_BASED_TYPES.has(questionType) ? options : undefined,
    correct_answer: correctAnswer,
    explanation: normalizeText(payload.explanation) || null,
    hint: normalizeText(payload.hint) || null
  }
}

async function applyQuestionRepair(payload: RepairPayload) {
  const normalized = normalizeRepairPayload(payload)
  if (!normalized) {
    return false
  }

  // Write to unified_questions (source_domain='knowledge')
  const { error: questionError } = await supabase
    .from('unified_questions')
    .update({
      question_text: normalized.question_text,
      question_type: normalized.question_type,
      correct_answer: normalized.correct_answer,
      explanation: normalized.explanation,
      hint: normalized.hint,
      updated_at: new Date().toISOString()
    })
    .eq('id', normalized.question_id)

  if (questionError) throw questionError

  const { error: deleteOptionsError } = await supabase
    .from('unified_question_options')
    .delete()
    .eq('question_id', normalized.question_id)

  if (deleteOptionsError) throw deleteOptionsError

  const nextOptions = normalized.options || []
  if (nextOptions.length > 0) {
    const { error: insertOptionsError } = await supabase
      .from('unified_question_options')
      .insert(
        nextOptions.map((option, index) => ({
          question_id: normalized.question_id,
          option_text: option.text,
          is_correct: option.is_correct,
          display_order: index,
          feedback: option.is_correct ? normalized.explanation : null
        }))
      )

    if (insertOptionsError) throw insertOptionsError
  }

  return true
}

async function publishQuizAndQuestions(quizId: string, questionIds: string[]) {
  const timestamp = new Date().toISOString()

  const { error: quizError } = await supabase
    .from('learning_quizzes')
    .update({
      status: 'published',
      updated_at: timestamp
    })
    .eq('id', quizId)

  if (quizError) throw quizError

  if (questionIds.length > 0) {
    const { error: questionError } = await supabase
      .from('unified_questions')
      .update({
        status: 'published',
        updated_at: timestamp
      })
      .in('id', questionIds)

    if (questionError) throw questionError
  }
}

export const quizIntegrityService = {
  async inspectQuiz(quizId: string): Promise<QuizIntegrityReport> {
    const quiz = await fetchQuizDefinition(quizId)
    const issues = validateQuizDefinition(quiz)

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      valid: !issues.some(issue => issue.severity === 'error'),
      issues,
      errorCount: issues.filter(issue => issue.severity === 'error').length,
      warningCount: issues.filter(issue => issue.severity === 'warning').length,
      repairedQuestionIds: [],
      autoPublished: false
    }
  },

  async ensureQuizIntegrity(
    quizId: string,
    options?: {
      autoRepair?: boolean
      autoPublish?: boolean
      moduleTitle?: string
      moduleContext?: string
    }
  ): Promise<QuizIntegrityReport> {
    let quiz = await fetchQuizDefinition(quizId)
    let issues = validateQuizDefinition(quiz)
    const repairedQuestionIds = new Set<string>()
    let autoPublished = false

    if (options?.autoRepair && issues.some(issue => issue.code === 'quiz_has_no_questions')) {
      await autoRepairEmptyQuiz(quiz, options, repairedQuestionIds)
      quiz = await fetchQuizDefinition(quizId)
      issues = validateQuizDefinition(quiz)
    }

    if (options?.autoRepair && issues.some(issue => issue.fixable && issue.questionId)) {
      const repairInputs = buildRepairInputs(quiz, issues)
      let repairs = await aiService.repairQuizQuestions({
        quizTitle: quiz.title,
        moduleTitle: options.moduleTitle,
        moduleContext: options.moduleContext,
        questions: repairInputs
      })

      if (repairs.length === 0) {
        repairs = repairInputs
          .map(input => {
            const sourceQuestion = (quiz.questions || []).find(link => link.question?.id === input.question_id)?.question
            return sourceQuestion ? buildHeuristicRepair(sourceQuestion) : null
          })
          .filter((repair): repair is RepairPayload => !!repair)
      }

      for (const repair of repairs) {
        const updated = await applyQuestionRepair({
          question_id: repair.question_id,
          question_text: repair.question_text,
          question_type: repair.question_type as SupportedQuestionType,
          options: repair.options,
          correct_answer: repair.correct_answer,
          explanation: repair.explanation,
          hint: repair.hint
        })

        if (updated) {
          repairedQuestionIds.add(repair.question_id)
        }
      }

      quiz = await fetchQuizDefinition(quizId)
      issues = validateQuizDefinition(quiz)
    }

    const questionIds = (quiz.questions || [])
      .map(link => link.question?.id)
      .filter((questionId): questionId is string => !!questionId)
    const hasUnpublishedQuestions = (quiz.questions || []).some(
      (link) => normalizeText(link.question?.status).toLowerCase() !== 'published'
    )

    if (
      options?.autoPublish &&
      !issues.some(issue => issue.severity === 'error') &&
      (quiz.status !== 'published' || hasUnpublishedQuestions)
    ) {
      await publishQuizAndQuestions(quiz.id, questionIds)
      autoPublished = true

      quiz = await fetchQuizDefinition(quizId)
      issues = validateQuizDefinition(quiz)
    }

    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      valid: !issues.some(issue => issue.severity === 'error'),
      issues,
      errorCount: issues.filter(issue => issue.severity === 'error').length,
      warningCount: issues.filter(issue => issue.severity === 'warning').length,
      repairedQuestionIds: [...repairedQuestionIds],
      autoPublished
    }
  }
}
