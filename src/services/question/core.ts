import { supabase } from '@/lib/supabase'
import type {
    KnowledgeQuestion,
    QuestionDifficulty,
    QuestionFormData,
    QuestionStatus,
    QuestionType
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

// Read via backward-compat view (knowledge_questions → unified_questions WHERE source_domain='knowledge')
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
      created_by_profile:profiles!unified_questions_created_by_fkey(id, full_name)
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

// Read directly from unified_questions (domain-agnostic -- the knowledge_questions view
// filters to source_domain='knowledge' only, which would silently drop e.g. training-domain
// questions such as those used by the adaptive daily challenge).
export async function getQuestionsByIds(ids: string[]): Promise<KnowledgeQuestion[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase
        .from('unified_questions')
        .select(`
      id, question_text, question_text_ar, question_type,
      difficulty_level:difficulty,
      correct_answer, accepted_answers, explanation, explanation_ar, hint, hint_ar,
      linked_sop_id, linked_sop_section, tags, estimated_time_seconds, points,
      ai_generated, ai_model_used, ai_confidence_score, ai_prompt_used,
      status, version, reviewed_by, reviewed_at, review_notes,
      created_by, created_at, updated_at, training_module_id, training_section_id,
      options:unified_question_options(*)
    `)
        .in('id', ids)

    if (error) throw error
    return (data || []) as unknown as KnowledgeQuestion[]
}

// Read via backward-compat view
export async function getQuestionById(id: string): Promise<KnowledgeQuestion | null> {
    const { data, error } = await supabase
        .from('knowledge_questions')
        .select(`
      *,
      options:knowledge_question_options(*),
      linked_sop:documents(id, title),
      created_by_profile:profiles!unified_questions_created_by_fkey(id, full_name),
      reviewed_by_profile:profiles!unified_questions_reviewed_by_fkey(id, full_name)
    `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

// Write directly to unified_questions (source_domain='knowledge')
export async function createQuestion(
    formData: QuestionFormData,
    userId: string,
    aiGenerated = false
): Promise<KnowledgeQuestion> {
    const { options, ...questionData } = formData

    // Insert question into unified_questions
    const { data: question, error: qError } = await supabase
        .from('unified_questions')
        .insert({
            ...questionData,
            source_domain: 'knowledge',
            created_by: userId,
            ai_generated: aiGenerated,
            status: 'draft' as QuestionStatus
        })
        .select()
        .single()

    if (qError) throw qError

    // Insert options if MCQ into unified_question_options
    if (options.length > 0 && (formData.question_type === 'mcq' || formData.question_type === 'mcq_multi')) {
        const optionsWithQuestionId = options.map((opt, idx) => ({
            ...opt,
            question_id: question.id,
            display_order: idx
        }))

        const { error: optError } = await supabase
            .from('unified_question_options')
            .insert(optionsWithQuestionId)

        if (optError) throw optError
    }

    return question
}

// Write directly to unified_questions
export async function updateQuestion(
    id: string,
    formData: Partial<QuestionFormData>,
    _userId: string
): Promise<KnowledgeQuestion> {
    const { options, ...questionData } = formData

    // Update question
    const { data: question, error: qError } = await supabase
        .from('unified_questions')
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
            .from('unified_question_options')
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
                .from('unified_question_options')
                .insert(optionsWithQuestionId)

            if (optError) throw optError
        }
    }

    return question
}

// Write directly to unified_questions
export async function deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
        .from('unified_questions')
        .delete()
        .eq('id', id)

    if (error) throw error
}
