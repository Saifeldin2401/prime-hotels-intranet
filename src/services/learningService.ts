import { supabase } from '@/lib/supabase'
import type {
    LearningQuiz,
    LearningAssignment,
    CreateQuizDTO,
    CreateAssignmentDTO,
    LearningProgress,
    LearningQuizQuestion
} from '@/types/learning'
import type { QuestionStatus } from '@/types/questions'

export const learningService = {
    // ==========================================
    // QUIZZES
    // ==========================================

    async getQuizzes(status?: QuestionStatus) {
        let query = supabase
            .from('learning_quizzes')
            .select(`
                *,
                questions:learning_quiz_questions(count)
            `)
            .order('created_at', { ascending: false })
            .eq('is_deleted', false)

        if (status) {
            query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) throw error

        return data.map(q => ({
            ...q,
            question_count: q.questions[0]?.count || 0
        })) as LearningQuiz[]
    },

    async getQuiz(id: string) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .select(`
                *,
                questions:learning_quiz_questions(
                    *,
                    question:knowledge_questions(
                        *,
                        options:knowledge_question_options(*)
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error

        // Sort questions by display_order
        if (data.questions) {
            data.questions.sort((a: any, b: any) => a.display_order - b.display_order)
        }

        return data as LearningQuiz
    },

    async createQuiz(quiz: CreateQuizDTO) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .insert(quiz)
            .select()
            .single()

        if (error) throw error
        return data as LearningQuiz
    },

    async updateQuiz(id: string, updates: Partial<CreateQuizDTO>) {
        const { data, error } = await supabase
            .from('learning_quizzes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // If publishing the quiz, also publish all linked questions to ensure visibility
        if (updates.status === 'published') {
            // Find all questions linked to this quiz
            const { data: links } = await supabase
                .from('learning_quiz_questions')
                .select('question_id')
                .eq('quiz_id', id)

            if (links && links.length > 0) {
                const questionIds = links.map(l => l.question_id)
                await supabase
                    .from('knowledge_questions')
                    .update({ status: 'published' })
                    .in('id', questionIds)
            }
        }

        return data as LearningQuiz
    },

    async deleteQuiz(id: string) {
        const { error } = await supabase
            .from('learning_quizzes')
            .update({ is_deleted: true })
            .eq('id', id)

        if (error) throw error
    },

    // ==========================================
    // QUIZ QUESTIONS
    // ==========================================

    async addQuestionToQuiz(quizId: string, questionId: string, order: number) {
        const { data, error } = await supabase
            .from('learning_quiz_questions')
            .insert({
                quiz_id: quizId,
                question_id: questionId,
                display_order: order
            })
            .select()
            .single()

        if (error) throw error
        return data as LearningQuizQuestion
    },

    async removeQuestionFromQuiz(quizId: string, questionId: string) {
        const { error } = await supabase
            .from('learning_quiz_questions')
            .delete()
            .eq('quiz_id', quizId)
            .eq('question_id', questionId)

        if (error) throw error
    },

    async reorderQuizQuestions(quizId: string, questionIds: string[]) {
        // Upsert all with new orders
        const updates = questionIds.map((qId, index) => ({
            quiz_id: quizId,
            question_id: qId,
            display_order: index
        }))

        const { error } = await supabase
            .from('learning_quiz_questions')
            .upsert(updates, { onConflict: 'quiz_id,question_id' })

        if (error) throw error
    },

    // ==========================================
    // ASSIGNMENTS
    // ==========================================

    async createAssignment(assignment: CreateAssignmentDTO) {
        const { data, error } = await supabase
            .from('learning_assignments')
            .insert(assignment)
            .select()
            .single()

        if (error) throw error
        return data as LearningAssignment
    },

    async getAssignments(targetId?: string, targetType?: string) {
        let query = supabase
            .from('learning_assignments')
            .select('*')
            .order('created_at', { ascending: false })
            .eq('is_deleted', false)

        if (targetId) query = query.eq('target_id', targetId)
        if (targetType) query = query.eq('target_type', targetType)

        const { data, error } = await query
        if (error) throw error
        return data as LearningAssignment[]
    },

    // ==========================================
    // MY LEARNING
    // ==========================================

    async getMyAssignments() {
        // Get current user ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // This is complex because of hierarchical targeting
        // For now, simpler fetch via RLS which filters for us
        const { data, error } = await supabase
            .from('learning_assignments')
            .select(`
                *,
                progress:learning_progress(*)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Also fetch quiz titles manually since simple join might not work dynamically for polymorphic content
        // Or we can fetch content details in a second step
        const assignments = data as LearningAssignment[]

        // Filter progress to only include current user's progress
        assignments.forEach(a => {
            if (Array.isArray(a.progress)) {
                // Find this user's progress entry
                const userProgress = a.progress.find(p => p.user_id === user.id)
                a.progress = userProgress || null
            }
        })

        // Enrich with titles
        // Enrich with titles and details
        const quizIds = assignments
            .filter(a => a.content_type === 'quiz')
            .map(a => a.content_id)

        const moduleIds = assignments
            .filter(a => a.content_type === 'module')
            .map(a => a.content_id)

        if (quizIds.length > 0) {
            // Only fetch published quizzes - users shouldn't see draft content
            const { data: quizzes, error: quizError } = await supabase
                .from('learning_quizzes')
                .select('id, title, description, time_limit_minutes, status')
                .in('id', quizIds)
                .eq('status', 'published')

            if (quizError) console.error('Error fetching quizzes:', quizError)

            const quizMap = new Map(quizzes?.map(q => [q.id, q]))

            assignments.forEach(a => {
                if (a.content_type === 'quiz') {
                    const q = quizMap.get(a.content_id)
                    if (q) {
                        a.content_title = q.title
                        a.content_metadata = {
                            description: q.description,
                            duration: q.time_limit_minutes,
                            // question_count not available in direct fetch
                        }
                    }
                }
            })
        }

        if (moduleIds.length > 0) {
            // Fetch active modules - training_modules uses is_active not status
            const { data: modules } = await supabase
                .from('training_modules')
                .select('id, title, description, estimated_duration_minutes, status, is_active')
                .in('id', moduleIds)
                .eq('is_active', true)
                .eq('is_deleted', false)

            const moduleMap = new Map(modules?.map(m => [m.id, m]))

            assignments.forEach(a => {
                if (a.content_type === 'module') {
                    const m = moduleMap.get(a.content_id)
                    if (m) {
                        a.content_title = m.title
                        a.content_metadata = {
                            description: m.description,
                            duration: m.estimated_duration_minutes
                        }
                    }
                }
            })
        }

        // Filter out assignments where content could not be resolved (e.g. deleted or RLS restricted draft)
        const validAssignments = assignments.filter(a => {
            if (a.content_type === 'quiz' || a.content_type === 'module') {
                return !!a.content_title
            }
            return true // Keep other types if any
        })

        return validAssignments
    },

    // ==========================================
    // PROGRESS & SUBMISSION
    // ==========================================

    async getAssignmentProgress(assignmentId: string) {
        const { data, error } = await supabase
            .from('learning_progress')
            .select(`
                *,
                user:profiles!learning_progress_user_id_fkey(full_name, job_title)
            `)
            .eq('assignment_id', assignmentId)
            .order('updated_at', { ascending: false })

        if (error) throw error
        return data as LearningProgress[]
    },

    async submitQuizProgress(progress: Partial<LearningProgress>) {
        // Use upsert with the unique constraint to avoid 409 conflicts
        // The unique constraint is on (user_id, content_type, content_id)

        const progressData = {
            ...progress,
            updated_at: new Date().toISOString()
        }

        // First try to find existing record
        let existingId = null

        if (progress.assignment_id && progress.content_type) {
            const { data } = await supabase
                .from('learning_progress')
                .select('id')
                .eq('user_id', progress.user_id)
                .eq('assignment_id', progress.assignment_id)
                .eq('content_type', progress.content_type)
                .maybeSingle()
            existingId = data?.id
        }

        if (!existingId && progress.content_id && progress.content_type) {
            const { data } = await supabase
                .from('learning_progress')
                .select('id')
                .eq('user_id', progress.user_id)
                .eq('content_id', progress.content_id)
                .eq('content_type', progress.content_type)
                .maybeSingle()
            existingId = data?.id
        }

        if (existingId) {
            // Update existing record
            const { data, error } = await supabase
                .from('learning_progress')
                .update(progressData)
                .eq('id', existingId)
                .select()
                .single()
            if (error) throw error
            return data as LearningProgress
        } else {
            // Insert new record
            const { data, error } = await supabase
                .from('learning_progress')
                .insert(progressData)
                .select()
                .single()
            if (error) {
                // If conflict error, try to update instead
                if (error.code === '23505') {
                    // Unique constraint violation - try update
                    const { data: existing } = await supabase
                        .from('learning_progress')
                        .select('id')
                        .eq('user_id', progress.user_id)
                        .eq('content_id', progress.content_id)
                        .eq('content_type', progress.content_type)
                        .maybeSingle()

                    if (existing) {
                        const { data: updated, error: upError } = await supabase
                            .from('learning_progress')
                            .update(progressData)
                            .eq('id', existing.id)
                            .select()
                            .single()
                        if (upError) throw upError
                        return updated as LearningProgress
                    }
                }
                throw error
            }
            return data as LearningProgress
        }
    },
}
