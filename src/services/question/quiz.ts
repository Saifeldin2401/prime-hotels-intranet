import { supabase } from '@/lib/supabase';
import type { AnswerSubmission, QuestionGradeResult } from '@/types/questions';

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
