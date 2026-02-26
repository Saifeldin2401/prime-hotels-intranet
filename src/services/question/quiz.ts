import { supabase } from '@/lib/supabase'
import { getQuestionById } from './core'
import type { AnswerSubmission, QuestionAttempt, QuizSession } from '@/types/questions'

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
        case 'true_false': {
            isCorrect = submission.selected_answer === question.correct_answer
            break
        }
        case 'fill_blank': {
            // Case-insensitive, trimmed comparison
            const userAnswer = (submission.selected_answer || '').trim().toLowerCase()
            const correctAnswer = (question.correct_answer || '').trim().toLowerCase()
            isCorrect = userAnswer === correctAnswer
            break
        }
        case 'mcq': {
            const selectedOption = question.options?.find(o => o.id === submission.selected_answer)
            isCorrect = selectedOption?.is_correct ?? false
            feedback = selectedOption?.feedback
            break
        }
        case 'mcq_multi': {
            const correctOptions = question.options?.filter(o => o.is_correct).map(o => o.id) || []
            const selectedOptions = submission.selected_options || []
            isCorrect =
                correctOptions.length === selectedOptions.length &&
                correctOptions.every(id => selectedOptions.includes(id))
            break
        }
        case 'scenario': {
            const hasOptions = (question.options?.length || 0) > 0
            if (hasOptions) {
                const selectedOption = question.options?.find(o => o.id === submission.selected_answer)
                isCorrect = selectedOption?.is_correct ?? false
                feedback = selectedOption?.feedback
            } else {
                const userAnswer = (submission.selected_answer || '').trim().toLowerCase()
                const correctAnswer = (question.correct_answer || '').trim().toLowerCase()
                isCorrect = userAnswer === correctAnswer
            }
            break
        }
        default: {
            isCorrect = false
        }
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
