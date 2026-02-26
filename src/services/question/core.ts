import { supabase } from '@/lib/supabase'
import type {
    KnowledgeQuestion,
    QuestionFormData,
    QuestionStatus,
    QuestionType,
    QuestionDifficulty
} from '@/types/questions'

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
