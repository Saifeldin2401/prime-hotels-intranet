import { aiService } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

type SupportedQuestionType = 'mcq' | 'mcq_multi' | 'true_false' | 'fill_blank' | 'scenario'

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
const SUPPORTED_TYPES = new Set<SupportedQuestionType>(['mcq', 'mcq_multi', 'true_false', 'fill_blank', 'scenario'])

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
  if (normalized === 'boolean') return 'true_false'
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
      fixable: false
    })
    return issues
  }

  for (const link of links) {
    issues.push(...validateQuestionLink(link))
  }

  return issues
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
  return data as QuizDefinitionRow
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
    options: OPTION_BASED_TYPES.has(questionType) ? options : undefined,
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
  }

  if (OPTION_BASED_TYPES.has(questionType)) {
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
    if (!correctAnswer) return null
  }

  return {
    question_id: payload.question_id,
    question_text: questionText,
    question_type: questionType,
    options: OPTION_BASED_TYPES.has(questionType) ? options : undefined,
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

  const { error: questionError } = await supabase
    .from('knowledge_questions')
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
    .from('knowledge_question_options')
    .delete()
    .eq('question_id', normalized.question_id)

  if (deleteOptionsError) throw deleteOptionsError

  const nextOptions = normalized.options || []
  if (nextOptions.length > 0) {
    const { error: insertOptionsError } = await supabase
      .from('knowledge_question_options')
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
      .from('knowledge_questions')
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
          question_type: repair.question_type,
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
