import { supabase } from '@/lib/supabase'
import type { QuestionStatus } from '@/types/questions'

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
