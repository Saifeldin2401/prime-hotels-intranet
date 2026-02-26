import { supabase } from '@/lib/supabase'
import type { KnowledgeQuestion, QuestionUsage } from '@/types/questions'

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
