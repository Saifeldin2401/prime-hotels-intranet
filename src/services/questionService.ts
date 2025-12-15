/**
 * Question Service
 * 
 * Backend service for Knowledge Questions CRUD, AI generation, and analytics.
 */

import { supabase } from '@/lib/supabase'
import { aiService } from '@/lib/gemini'
import type {
    KnowledgeQuestion,
    QuestionOption,
    QuestionAttempt,
    QuestionUsage,
    QuizSession,
    QuestionFormData,
    AnswerSubmission,
    QuestionStatus,
    QuestionType,
    QuestionDifficulty,
    AIQuestionGenerationRequest,
    GeneratedQuestion
} from '@/types/questions'

// ============================================================================
// QUESTIONS CRUD
// ============================================================================

export interface QuestionFilters {
    status?: QuestionStatus
    type?: QuestionType
    difficulty?: QuestionDifficulty
    sop_id?: string
    // category_id removed
    ai_generated?: boolean
    search?: string
    tags?: string[]
}

export async function getQuestions(
    filters: QuestionFilters = {},
    page = 1,
    pageSize = 20
): Promise<{ questions: KnowledgeQuestion[]; total: number }> {
    let query = supabase
        .from('knowledge_questions')
        .select(`
      *,
      options:knowledge_question_options(*),
      linked_sop:documents(id, title),
      created_by_profile:profiles!knowledge_questions_created_by_fkey(id, full_name)
    `, { count: 'exact' })

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('question_type', filters.type)
    if (filters.difficulty) query = query.eq('difficulty_level', filters.difficulty)
    if (filters.sop_id) query = query.eq('linked_sop_id', filters.sop_id)
    // category_id filter removed
    if (filters.ai_generated !== undefined) query = query.eq('ai_generated', filters.ai_generated)
    if (filters.search) query = query.ilike('question_text', `%${filters.search}%`)
    if (filters.tags?.length) query = query.overlaps('tags', filters.tags)

    // Pagination
    const from = (page - 1) * pageSize
    query = query
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
        questions: data || [],
        total: count || 0
    }
}

export async function getQuestionById(id: string): Promise<KnowledgeQuestion | null> {
    const { data, error } = await supabase
        .from('knowledge_questions')
        .select(`
      *,
      options:knowledge_question_options(*),
      linked_sop:documents(id, title),
      created_by_profile:profiles!knowledge_questions_created_by_fkey(id, full_name),
      reviewed_by_profile:profiles!knowledge_questions_reviewed_by_fkey(id, full_name)
    `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

export async function createQuestion(
    formData: QuestionFormData,
    userId: string,
    aiGenerated = false
): Promise<KnowledgeQuestion> {
    const { options, ...questionData } = formData

    // Insert question
    const { data: question, error: qError } = await supabase
        .from('knowledge_questions')
        .insert({
            ...questionData,
            created_by: userId,
            ai_generated: aiGenerated,
            status: 'draft' as QuestionStatus
        })
        .select()
        .single()

    if (qError) throw qError

    // Insert options if MCQ
    if (options.length > 0 && (formData.question_type === 'mcq' || formData.question_type === 'mcq_multi')) {
        const optionsWithQuestionId = options.map((opt, idx) => ({
            ...opt,
            question_id: question.id,
            display_order: idx
        }))

        const { error: optError } = await supabase
            .from('knowledge_question_options')
            .insert(optionsWithQuestionId)

        if (optError) throw optError
    }

    return question
}

export async function updateQuestion(
    id: string,
    formData: Partial<QuestionFormData>,
    userId: string
): Promise<KnowledgeQuestion> {
    const { options, ...questionData } = formData

    // Update question
    const { data: question, error: qError } = await supabase
        .from('knowledge_questions')
        .update({
            ...questionData,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (qError) throw qError

    // Update options if provided
    if (options !== undefined) {
        // Delete existing options
        await supabase
            .from('knowledge_question_options')
            .delete()
            .eq('question_id', id)

        // Insert new options
        if (options.length > 0) {
            const optionsWithQuestionId = options.map((opt, idx) => ({
                ...opt,
                question_id: id,
                display_order: idx
            }))

            const { error: optError } = await supabase
                .from('knowledge_question_options')
                .insert(optionsWithQuestionId)

            if (optError) throw optError
        }
    }

    return question
}

export async function deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
        .from('knowledge_questions')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============================================================================
// REVIEW WORKFLOW
// ============================================================================

export async function submitForReview(id: string): Promise<void> {
    const { error } = await supabase
        .from('knowledge_questions')
        .update({ status: 'pending_review' as QuestionStatus })
        .eq('id', id)

    if (error) throw error
}

export async function approveQuestion(
    id: string,
    reviewerId: string,
    notes?: string
): Promise<void> {
    const { error } = await supabase
        .from('knowledge_questions')
        .update({
            status: 'published' as QuestionStatus,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes
        })
        .eq('id', id)

    if (error) throw error
}

export async function rejectQuestion(
    id: string,
    reviewerId: string,
    notes: string
): Promise<void> {
    const { error } = await supabase
        .from('knowledge_questions')
        .update({
            status: 'draft' as QuestionStatus,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes
        })
        .eq('id', id)

    if (error) throw error
}

export async function archiveQuestion(id: string): Promise<void> {
    const { error } = await supabase
        .from('knowledge_questions')
        .update({ status: 'archived' as QuestionStatus })
        .eq('id', id)

    if (error) throw error
}

// ============================================================================
// QUESTION USAGES
// ============================================================================

export async function getQuestionsForContext(
    usageType: QuestionUsage['usage_type'],
    entityId: string
): Promise<KnowledgeQuestion[]> {
    const { data, error } = await supabase
        .from('knowledge_question_usages')
        .select(`
      *,
      question:knowledge_questions(
        *,
        options:knowledge_question_options(*)
      )
    `)
        .eq('usage_type', usageType)
        .eq('usage_entity_id', entityId)
        .order('display_order')

    if (error) throw error
    return data?.map(u => u.question).filter(Boolean) || []
}

export async function linkQuestionToContext(
    questionId: string,
    usageType: QuestionUsage['usage_type'],
    entityId: string,
    options?: { displayOrder?: number; isRequired?: boolean; weight?: number }
): Promise<void> {
    const { error } = await supabase
        .from('knowledge_question_usages')
        .insert({
            question_id: questionId,
            usage_type: usageType,
            usage_entity_id: entityId,
            display_order: options?.displayOrder ?? 0,
            is_required: options?.isRequired ?? true,
            weight: options?.weight ?? 1.0
        })

    if (error) throw error
}

export async function unlinkQuestionFromContext(
    questionId: string,
    usageType: QuestionUsage['usage_type'],
    entityId: string
): Promise<void> {
    const { error } = await supabase
        .from('knowledge_question_usages')
        .delete()
        .eq('question_id', questionId)
        .eq('usage_type', usageType)
        .eq('usage_entity_id', entityId)

    if (error) throw error
}

// ============================================================================
// ATTEMPTS & SCORING
// ============================================================================

export async function recordAttempt(
    userId: string,
    submission: AnswerSubmission
): Promise<{ isCorrect: boolean; feedback?: string }> {
    // Get the question with options
    const question = await getQuestionById(submission.question_id)
    if (!question) throw new Error('Question not found')

    // Validate answer
    let isCorrect = false
    let feedback: string | undefined

    switch (question.question_type) {
        case 'true_false':
            isCorrect = submission.selected_answer === question.correct_answer
            break
        case 'fill_blank':
            // Case-insensitive, trimmed comparison
            const userAnswer = (submission.selected_answer || '').trim().toLowerCase()
            const correctAnswer = (question.correct_answer || '').trim().toLowerCase()
            isCorrect = userAnswer === correctAnswer
            break
        case 'mcq':
            const selectedOption = question.options?.find(o => o.id === submission.selected_answer)
            isCorrect = selectedOption?.is_correct ?? false
            feedback = selectedOption?.feedback
            break
        case 'mcq_multi':
            const correctOptions = question.options?.filter(o => o.is_correct).map(o => o.id) || []
            const selectedOptions = submission.selected_options || []
            isCorrect =
                correctOptions.length === selectedOptions.length &&
                correctOptions.every(id => selectedOptions.includes(id))
            break
    }

    // Get attempt number
    const { count } = await supabase
        .from('knowledge_question_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('question_id', submission.question_id)

    // Record the attempt
    const { error } = await supabase
        .from('knowledge_question_attempts')
        .insert({
            user_id: userId,
            question_id: submission.question_id,
            session_id: submission.session_id,
            selected_answer: submission.selected_answer,
            selected_options: submission.selected_options,
            is_correct: isCorrect,
            context_type: submission.context_type,
            context_entity_id: submission.context_entity_id,
            time_spent_seconds: submission.time_spent_seconds,
            hint_used: submission.hint_used,
            attempt_number: (count || 0) + 1
        })

    if (error) throw error

    return {
        isCorrect,
        feedback: isCorrect ? question.explanation : feedback
    }
}

export async function getUserAttempts(
    userId: string,
    questionId?: string,
    limit = 50
): Promise<QuestionAttempt[]> {
    let query = supabase
        .from('knowledge_question_attempts')
        .select(`
      *,
      question:knowledge_questions(id, question_text, question_type)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (questionId) {
        query = query.eq('question_id', questionId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
}

// ============================================================================
// QUIZ SESSIONS
// ============================================================================

export async function startQuizSession(
    userId: string,
    quizType: QuizSession['quiz_type'],
    entityId?: string,
    settings?: { timeLimit?: number; passingScore?: number }
): Promise<QuizSession> {
    const { data, error } = await supabase
        .from('knowledge_quiz_sessions')
        .insert({
            user_id: userId,
            quiz_type: quizType,
            quiz_entity_id: entityId,
            time_limit_seconds: settings?.timeLimit,
            passing_score: settings?.passingScore
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function completeQuizSession(
    sessionId: string,
    results: {
        totalQuestions: number
        correctAnswers: number
        totalPoints: number
        earnedPoints: number
    }
): Promise<QuizSession> {
    const scorePercentage = results.totalPoints > 0
        ? (results.earnedPoints / results.totalPoints) * 100
        : 0

    // Get session to check passing score
    const { data: session } = await supabase
        .from('knowledge_quiz_sessions')
        .select('passing_score')
        .eq('id', sessionId)
        .single()

    const passed = session?.passing_score
        ? scorePercentage >= session.passing_score
        : scorePercentage >= 70

    const { data, error } = await supabase
        .from('knowledge_quiz_sessions')
        .update({
            completed_at: new Date().toISOString(),
            total_questions: results.totalQuestions,
            correct_answers: results.correctAnswers,
            total_points: results.totalPoints,
            earned_points: results.earnedPoints,
            score_percentage: scorePercentage,
            passed
        })
        .eq('id', sessionId)
        .select()
        .single()

    if (error) throw error
    return data
}

// ============================================================================
// AI QUESTION GENERATION
// ============================================================================

export async function generateQuestionsWithAI(
    request: AIQuestionGenerationRequest
): Promise<GeneratedQuestion[]> {
    // Use the robust aiService which handles model redundancy and local fallback
    try {
        const aiQuestions = await aiService.generateQuiz(request.sop_content)

        // Map to GeneratedQuestion format
        return aiQuestions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type as QuestionType,
            difficulty_level: 'medium',
            options: q.options?.map(opt => ({
                text: opt,
                is_correct: opt === q.correct_answer,
                feedback: opt === q.correct_answer ? 'Correct!' : undefined
            })),
            correct_answer: q.correct_answer,
            explanation: 'Generated by AI',
            confidence_score: 0.9,
            tags: ['ai-generated']
        }))
    } catch (error) {
        console.error('AI generation failed:', error)
        throw new Error('Failed to generate questions')
    }
}

function buildQuestionGenerationPrompt(request: AIQuestionGenerationRequest): string {
    const types = request.types?.join(', ') || 'mcq, true_false, fill_blank'
    const difficulty = request.difficulty || 'medium'
    const count = request.count || 5

    return `Generate ${count} quiz questions based on the following content.

REQUIREMENTS:
- Question types: ${types}
- Difficulty: ${difficulty}
- Include ${request.include_hints ? 'hints' : 'no hints'}
- Include ${request.include_explanations ? 'explanations' : 'no explanations'}

OUTPUT FORMAT (JSON array):
[
  {
    "question_text": "Question text here",
    "question_type": "mcq|true_false|fill_blank",
    "difficulty_level": "easy|medium|hard|expert",
    "options": [
      {"text": "Option A", "is_correct": false, "feedback": "Why this is wrong"},
      {"text": "Option B", "is_correct": true, "feedback": "Why this is correct"}
    ],
    "correct_answer": "For true_false: true|false, for fill_blank: the answer",
    "explanation": "Explanation after answering",
    "hint": "Optional hint",
    "linked_section": "Section reference from the content",
    "tags": ["tag1", "tag2"]
  }
]

CONTENT TO BASE QUESTIONS ON:
${request.sop_content}

Generate exactly ${count} questions as a JSON array:`
}

function parseAIQuestionResponse(response: string): GeneratedQuestion[] {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
        throw new Error('No JSON array found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and normalize
    return parsed.map((q: any) => ({
        question_text: q.question_text || q.text,
        question_type: normalizeQuestionType(q.question_type || q.type),
        difficulty_level: normalizeDifficulty(q.difficulty_level || q.difficulty),
        options: q.options?.map((o: any) => ({
            text: o.text,
            is_correct: o.is_correct ?? false,
            feedback: o.feedback
        })),
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        hint: q.hint,
        linked_section: q.linked_section,
        tags: q.tags || [],
        confidence_score: q.confidence_score
    }))
}

function normalizeQuestionType(type: string): QuestionType {
    const typeMap: Record<string, QuestionType> = {
        'mcq': 'mcq',
        'multiple_choice': 'mcq',
        'mcq_multi': 'mcq_multi',
        'multiple_select': 'mcq_multi',
        'true_false': 'true_false',
        'boolean': 'true_false',
        'fill_blank': 'fill_blank',
        'fill_in_blank': 'fill_blank',
        'fill-in-blank': 'fill_blank',
        'scenario': 'scenario'
    }
    return typeMap[type.toLowerCase()] || 'mcq'
}

function normalizeDifficulty(diff: string): QuestionDifficulty {
    const diffMap: Record<string, QuestionDifficulty> = {
        'easy': 'easy',
        'simple': 'easy',
        'medium': 'medium',
        'moderate': 'medium',
        'hard': 'hard',
        'difficult': 'hard',
        'expert': 'expert',
        'advanced': 'expert'
    }
    return diffMap[diff?.toLowerCase()] || 'medium'
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getQuestionAnalytics(questionId: string): Promise<{
    totalAttempts: number
    correctAttempts: number
    accuracyRate: number
    avgTimeSeconds: number
    hintUsageRate: number
}> {
    const { data, error } = await supabase
        .from('knowledge_question_attempts')
        .select('is_correct, time_spent_seconds, hint_used')
        .eq('question_id', questionId)

    if (error) throw error

    const attempts = data || []
    const total = attempts.length
    const correct = attempts.filter(a => a.is_correct).length
    const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0)
    const hintsUsed = attempts.filter(a => a.hint_used).length

    return {
        totalAttempts: total,
        correctAttempts: correct,
        accuracyRate: total > 0 ? (correct / total) * 100 : 0,
        avgTimeSeconds: total > 0 ? totalTime / total : 0,
        hintUsageRate: total > 0 ? (hintsUsed / total) * 100 : 0
    }
}

export async function getUserQuestionStats(userId: string): Promise<{
    totalAttempts: number
    correctAnswers: number
    accuracyRate: number
    recentStreak: number
}> {
    const { data, error } = await supabase
        .from('knowledge_question_attempts')
        .select('is_correct, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    const attempts = data || []
    const total = attempts.length
    const correct = attempts.filter(a => a.is_correct).length

    // Calculate Daily Streak (consecutive days with activity)
    // We normalize dates to YYYY-MM-DD strings
    const activityDates = new Set<string>()
    attempts.forEach(a => {
        activityDates.add(new Date(a.created_at).toISOString().split('T')[0])
    })

    const sortedDates = Array.from(activityDates).sort().reverse() // Newest first
    let streak = 0

    // Check if we have activity today
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // If no activity today or yesterday, streak is broken (0) unless we just started
    // Actually, widespread standard: streak is unbroken if you played yesterday OR today.
    // If newest date is older than yesterday, streak is 0.

    if (sortedDates.length > 0) {
        const newest = sortedDates[0]
        if (newest === today || newest === yesterday) {
            streak = 1
            // Check previous days
            let currentDate = new Date(newest)

            for (let i = 1; i < sortedDates.length; i++) {
                currentDate.setDate(currentDate.getDate() - 1)
                const expectedDate = currentDate.toISOString().split('T')[0]

                if (sortedDates[i] === expectedDate) {
                    streak++
                } else {
                    break
                }
            }
        }
    }

    return {
        totalAttempts: total,
        correctAnswers: correct,
        accuracyRate: total > 0 ? (correct / total) * 100 : 0,
        recentStreak: streak
    }
}

export async function getDailyChallengeStatus(userId: string): Promise<{ completed: boolean }> {
    const today = new Date().toISOString().split('T')[0]

    // Check for attempts with context 'daily_challenge' created today
    const { count, error } = await supabase
        .from('knowledge_question_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('context_type', 'daily_challenge')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

    if (error) throw error

    // Consider completed if at least 1 attempt made (or maybe 3? but for now 1 is safer to prevent infinite retries)
    // Actually typically a daily challenge is a set of X questions. 
    // If the widget fetches 3 questions, we should check if they did 3.
    // But keeping it simple: if they did ANY daily challenge today, we mark as visited/in-progress.
    // Ideally we track 'completed' specifically.

    return {
        completed: (count || 0) >= 3
    }
}
