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
    ai_generated?: boolean
    organization_id?: string
    hotel_id?: string
    brand_id?: string
    scope_type?: string
    is_master_template?: boolean
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
      created_by_profile:profiles!unified_questions_created_by_fkey(id, full_name)
    `, { count: 'exact' })

    // Apply filters
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.type) query = query.eq('question_type', filters.type as any)
    if (filters.difficulty) query = query.eq('difficulty_level', filters.difficulty)
    if (filters.sop_id) query = query.eq('linked_sop_id', filters.sop_id)
    if (filters.organization_id) query = query.or(`organization_id.eq.${filters.organization_id},organization_id.is.null,is_master_template.eq.true`)
    if (filters.is_master_template !== undefined) query = query.eq('is_master_template', filters.is_master_template)
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
        questions: (data || []) as KnowledgeQuestion[],
        total: count || 0
    }
}

// Row shape returned by the get_questions_for_attempt RPC: render-safe fields
// only - no correct_answer/accepted_answers/explanation/is_correct. Those are
// revealed exclusively by grade_question_attempt, after grading.
export interface AttemptQuestionRow {
    id: string
    question_text: string
    question_text_ar?: string | null
    question_type: QuestionType
    difficulty?: QuestionDifficulty | null
    points: number
    estimated_time_seconds: number
    tags?: string[] | null
    hint?: string | null
    hint_ar?: string | null
    linked_sop_id?: string | null
    linked_sop?: { id: string; title: string } | null
    options?: Array<{
        id: string
        option_text: string
        option_text_ar?: string | null
        display_order: number
    }> | null
}

// Maps a render-safe attempt row to the KnowledgeQuestion shape the taking UI
// (QuestionRenderer et al.) already expects. is_correct on each option is a
// placeholder (false) - it is never populated here and must come from a
// grading RPC response after the learner answers.
export function mapAttemptRowToKnowledgeQuestion(row: AttemptQuestionRow): KnowledgeQuestion {
    return {
        id: row.id,
        question_text: row.question_text,
        question_text_ar: row.question_text_ar || undefined,
        question_type: row.question_type,
        difficulty_level: row.difficulty || 'medium',
        hint: row.hint || undefined,
        hint_ar: row.hint_ar || undefined,
        linked_sop_id: row.linked_sop_id || undefined,
        linked_sop: row.linked_sop || undefined,
        tags: row.tags || [],
        estimated_time_seconds: row.estimated_time_seconds,
        points: row.points,
        ai_generated: false,
        status: 'published',
        version: 1,
        created_at: '',
        updated_at: '',
        options: (row.options || []).map(o => ({
            id: o.id,
            question_id: row.id,
            option_text: o.option_text,
            option_text_ar: o.option_text_ar || undefined,
            is_correct: false,
            display_order: o.display_order,
            created_at: '',
        })),
    }
}

// Taking/rendering context only - goes through the safe RPC, which never
// returns is_correct/correct_answer/explanation. Do not use this for the
// question editor; it fetches an intentionally incomplete record.
export async function getQuestionsByIds(ids: string[]): Promise<KnowledgeQuestion[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase.rpc('get_questions_for_attempt', { p_question_ids: ids })
    if (error) throw error

    return ((data || []) as unknown as AttemptQuestionRow[]).map(mapAttemptRowToKnowledgeQuestion)
}

// Read via backward-compat view
export async function getQuestionById(id: string): Promise<KnowledgeQuestion | null> {
    const { data, error } = await supabase
        .from('knowledge_questions')
        .select(`
      *,
      options:knowledge_question_options(*),
      created_by_profile:profiles!unified_questions_created_by_fkey(id, full_name),
      reviewed_by_profile:profiles!unified_questions_reviewed_by_fkey(id, full_name)
    `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as KnowledgeQuestion | null
}

// Write directly to unified_questions (source_domain='knowledge')
export async function createQuestion(
    formData: QuestionFormData,
    userId: string,
    aiGenerated = false
): Promise<KnowledgeQuestion> {
    const { options, difficulty_level, ...questionData } = formData

    // Insert question into unified_questions
    // Note: QuestionFormData uses `difficulty_level` (matches the read-side alias exposed by
    // the knowledge_questions VIEW), but the actual column on unified_questions is `difficulty`.
    const { data: question, error: qError } = await supabase
        .from('unified_questions')
        .insert({
            ...questionData,
            difficulty: difficulty_level,
            source_domain: 'knowledge',
            created_by: userId,
            ai_generated: aiGenerated,
            status: 'draft' as QuestionStatus
        } as any)
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

    return {
        ...question,
        difficulty_level: question.difficulty,
        tags: question.tags || [],
        estimated_time_seconds: question.estimated_time_seconds || 60,
        points: question.points || 10,
        version: question.version || 1,
        created_at: question.created_at || new Date().toISOString(),
        updated_at: question.updated_at || new Date().toISOString(),
    } as KnowledgeQuestion
}

// Write directly to unified_questions
export async function updateQuestion(
    id: string,
    formData: Partial<QuestionFormData>,
    _userId: string
): Promise<KnowledgeQuestion> {
    const { options, difficulty_level, ...questionData } = formData

    // Update question
    // Note: QuestionFormData uses `difficulty_level` (matches the read-side alias exposed by
    // the knowledge_questions VIEW), but the actual column on unified_questions is `difficulty`.
    const { data: question, error: qError } = await supabase
        .from('unified_questions')
        .update({
            ...questionData,
            ...(difficulty_level !== undefined ? { difficulty: difficulty_level } : {}),
            updated_at: new Date().toISOString()
        } as any)
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

    return {
        ...question,
        difficulty_level: question.difficulty,
        tags: question.tags || [],
        estimated_time_seconds: question.estimated_time_seconds || 60,
        points: question.points || 10,
        version: question.version || 1,
        created_at: question.created_at || new Date().toISOString(),
        updated_at: question.updated_at || new Date().toISOString(),
    } as KnowledgeQuestion
}

// Write directly to unified_questions
export async function deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
        .from('unified_questions')
        .delete()
        .eq('id', id)

    if (error) throw error
}
