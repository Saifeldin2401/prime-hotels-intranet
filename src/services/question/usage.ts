import { supabase } from '@/lib/supabase'
import type { KnowledgeQuestion, QuestionUsage } from '@/types/questions'
import { mapAttemptRowToKnowledgeQuestion } from './core'

// Taking/rendering context only. Fetches the ordered question_id list from
// the usage join table, then the render-safe question data via the same
// safe RPC as getQuestionsByIds - no answer key until grading.
export async function getQuestionsForContext(
    usageType: QuestionUsage['usage_type'],
    entityId: string
): Promise<KnowledgeQuestion[]> {
    const { data: usages, error: usageError } = await supabase
        .from('unified_question_usages')
        .select('question_id, display_order')
        .eq('usage_type', usageType)
        .eq('usage_entity_id', entityId)
        .order('display_order')

    if (usageError) throw usageError
    if (!usages || usages.length === 0) return []

    const orderedIds = usages.map(u => u.question_id)
    const { data: questions, error: questionsError } = await supabase.rpc('get_questions_for_attempt', {
        p_question_ids: orderedIds,
    })
    if (questionsError) throw questionsError

    const byId = new Map((questions || []).map((q: { id: string }) => [q.id, q]))
    return orderedIds
        .map(id => byId.get(id))
        .filter((q): q is NonNullable<typeof q> => !!q)
        .map(mapAttemptRowToKnowledgeQuestion)
}

// Write directly to unified_question_usages
export async function linkQuestionToContext(
    questionId: string,
    usageType: QuestionUsage['usage_type'],
    entityId: string,
    options?: { displayOrder?: number; isRequired?: boolean; weight?: number }
): Promise<void> {
    const { error } = await supabase
        .from('unified_question_usages')
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

// Write directly to unified_question_usages
export async function unlinkQuestionFromContext(
    questionId: string,
    usageType: QuestionUsage['usage_type'],
    entityId: string
): Promise<void> {
    const { error } = await supabase
        .from('unified_question_usages')
        .delete()
        .eq('question_id', questionId)
        .eq('usage_type', usageType)
        .eq('usage_entity_id', entityId)

    if (error) throw error
}
