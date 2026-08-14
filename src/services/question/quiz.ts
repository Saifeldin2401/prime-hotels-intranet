import { supabase } from '@/lib/supabase';
import type { AnswerSubmission, QuestionAttempt, QuestionGradeResult, QuizSession } from '@/types/questions';

export async function recordAttempt(
    _userId: string,
    submission: AnswerSubmission
): Promise<QuestionGradeResult> {
    // Server-side grading via SECURITY DEFINER RPC.
    // The server reads the answer key, grades, records the attempt in
    // unified_question_attempts, and returns is_correct + the reveal data
    // (correct answer, explanation, per-option correctness/feedback) - none
    // of which the client had access to before this call.
    const { data, error } = await supabase.rpc('grade_question_attempt', {
        p_question_id: submission.question_id,
        p_selected_answer: submission.selected_answer || null,
        p_selected_options: submission.selected_options || null,
        p_session_id: submission.session_id || null,
        p_context_type: submission.context_type || null,
        p_context_entity_id: submission.context_entity_id || null,
        p_time_spent_seconds: submission.time_spent_seconds ?? null,
        p_hint_used: submission.hint_used ?? false,
    })

    if (error) throw error

    const result = data as {
        is_correct: boolean
        attempt_number: number
        explanation?: string | null
        explanation_ar?: string | null
        correct_answer?: string | null
        options?: Array<{ id: string; option_text: string; is_correct: boolean; feedback?: string | null; display_order: number }> | null
    }

    return {
        isCorrect: result.is_correct,
        feedback: result.explanation || undefined,
        correctAnswer: result.correct_answer || undefined,
        explanation: result.explanation || undefined,
        options: (result.options || []).map(o => ({
            id: o.id,
            is_correct: o.is_correct,
            feedback: o.feedback || undefined,
        })),
    }
}

export async function getUserAttempts(
    userId: string,
    questionId?: string,
    limit = 50
): Promise<QuestionAttempt[]> {
    // Read via backward-compat view (knowledge_question_attempts → unified_question_attempts)
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
    // Write directly to unified_quiz_sessions
    const { data, error } = await supabase
        .from('unified_quiz_sessions')
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

    // Get session to check passing score from unified_quiz_sessions
    const { data: session } = await supabase
        .from('unified_quiz_sessions')
        .select('passing_score')
        .eq('id', sessionId)
        .single()

    const passed = session?.passing_score
        ? scorePercentage >= session.passing_score
        : scorePercentage >= 70

    const { data, error } = await supabase
        .from('unified_quiz_sessions')
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
