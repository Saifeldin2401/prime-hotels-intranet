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

function hashSeed(input: string): number {
    let hash = 2166136261
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

function seededShuffleArray<T>(items: T[], seedInput: string): T[] {
    const result = [...items]
    let seed = hashSeed(seedInput)
    const nextRandom = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        return seed / 4294967296
    }

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(nextRandom() * (i + 1))
        const temp = result[i]
        result[i] = result[j]
        result[j] = temp
    }

    return result
}

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

        // Respect quiz setting: randomize question order in player when enabled.
        if (data.questions) {
            if (data.randomize_questions) {
                const { data: authData } = await supabase.auth.getUser()
                const userSeed = authData?.user?.id || 'anonymous'
                data.questions = seededShuffleArray(data.questions, `${id}:${userSeed}`)
            } else {
                data.questions.sort((a: LearningQuizQuestion, b: LearningQuizQuestion) => (a.display_order || 0) - (b.display_order || 0))
            }
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

    async updateAssignment(id: string, updates: Partial<CreateAssignmentDTO>) {
        const { data, error } = await supabase
            .from('learning_assignments')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as LearningAssignment
    },

    async deleteAssignment(id: string) {
        const { error } = await supabase
            .from('learning_assignments')
            .update({ is_deleted: true })
            .eq('id', id)

        if (error) throw error
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

        const [rolesResult, departmentsResult, propertiesResult] = await Promise.all([
            supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id),
            supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', user.id),
            supabase
                .from('user_properties')
                .select('property_id')
                .eq('user_id', user.id)
        ])

        if (rolesResult.error) throw rolesResult.error
        if (departmentsResult.error) throw departmentsResult.error
        if (propertiesResult.error) throw propertiesResult.error

        const roleIds = (rolesResult.data || [])
            .map((row: { role?: string | null }) => row.role)
            .filter((role): role is string => typeof role === 'string' && role.length > 0)

        const departmentIds = (departmentsResult.data || [])
            .map((row: { department_id?: string | null }) => row.department_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)

        const propertyIds = (propertiesResult.data || [])
            .map((row: { property_id?: string | null }) => row.property_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)

        const notDeletedFilter = 'or(is_deleted.is.null,is_deleted.eq.false)'
        const orSegments: string[] = []

        orSegments.push(`and(target_type.eq.everyone,${notDeletedFilter})`)
        orSegments.push(`and(target_type.eq.user,target_id.eq.${user.id},${notDeletedFilter})`)

        roleIds.forEach((role) => {
            orSegments.push(`and(target_type.eq.role,target_id.eq.${role},${notDeletedFilter})`)
        })

        departmentIds.forEach((departmentId) => {
            orSegments.push(`and(target_type.eq.department,target_id.eq.${departmentId},${notDeletedFilter})`)
        })

        propertyIds.forEach((propertyId) => {
            orSegments.push(`and(target_type.eq.property,target_id.eq.${propertyId},${notDeletedFilter})`)
        })

        const { data, error } = await supabase
            .from('learning_assignments')
            .select('*')
            .or(orSegments.join(','))
            .order('created_at', { ascending: false })

        if (error) throw error

        // Also fetch quiz titles manually since simple join might not work dynamically for polymorphic content
        // Or we can fetch content details in a second step
        const assignments = (data || []) as LearningAssignment[]

        // Fetch only current user's progress (avoid loading all progress rows)
        const contentIds = assignments.map(a => a.content_id).filter(Boolean)
        if (contentIds.length > 0) {
            const { data: progressRows, error: progressError } = await supabase
                .from('learning_progress')
                .select('*')
                .eq('user_id', user.id)
                .in('content_id', contentIds)

            if (progressError) throw progressError

            const progressByContent = new Map(
                (progressRows || []).map((p: LearningProgress) => [`${p.content_type}:${p.content_id}`, p])
            )

            assignments.forEach(a => {
                a.progress = progressByContent.get(`${a.content_type}:${a.content_id}`) || null
            })
        } else {
            assignments.forEach(a => {
                a.progress = null
            })
        }

        // Enrich with titles
        // Enrich with titles and details
        const quizIds = assignments
            .filter(a => a.content_type === 'quiz')
            .map(a => a.content_id)

        const moduleIds = assignments
            .filter(a => a.content_type === 'module')
            .map(a => a.content_id)

        const [quizResult, moduleResult] = await Promise.all([
            quizIds.length > 0
                ? supabase
                    .from('learning_quizzes')
                    .select('id, title, description, time_limit_minutes, status')
                    .in('id', quizIds)
                    .eq('status', 'published')
                : Promise.resolve({ data: [], error: null }),
            moduleIds.length > 0
                ? supabase
                    .from('training_modules')
                    .select('id, title, description, estimated_duration_minutes, status, is_active')
                    .in('id', moduleIds)
                    .eq('is_active', true)
                    .eq('is_deleted', false)
                : Promise.resolve({ data: [], error: null })
        ])

        if (quizResult?.error) console.error('Error fetching quizzes:', quizResult.error)
        if (moduleResult?.error) console.error('Error fetching modules:', moduleResult.error)

        const quizMap = new Map((quizResult?.data || []).map((q: any) => [q.id, q]))
        const moduleMap = new Map((moduleResult?.data || []).map((m: any) => [m.id, m]))

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

        // Filter out assignments where content could not be resolved (e.g. deleted or RLS restricted draft)
        const validAssignments = assignments.filter(a => {
            if (a.content_type === 'quiz' || a.content_type === 'module') {
                return !!a.content_title
            }
            return true // Keep other types if any
        })

        // De-duplicate assignments per user/content (user completes content once)
        const priorityScore: Record<string, number> = {
            compliance: 0,
            high: 1,
            normal: 2
        }

        const deduped = new Map<string, LearningAssignment>()
        validAssignments.forEach((assignment) => {
            const key = `${assignment.content_type}:${assignment.content_id}`
            const existing = deduped.get(key)

            if (!existing) {
                deduped.set(key, assignment)
                return
            }

            const existingPriority = priorityScore[existing.priority] ?? 99
            const nextPriority = priorityScore[assignment.priority] ?? 99

            if (nextPriority < existingPriority) {
                deduped.set(key, assignment)
                return
            }

            if (nextPriority === existingPriority) {
                const existingDue = existing.due_date ? new Date(existing.due_date).getTime() : Number.POSITIVE_INFINITY
                const nextDue = assignment.due_date ? new Date(assignment.due_date).getTime() : Number.POSITIVE_INFINITY
                if (nextDue < existingDue) {
                    deduped.set(key, assignment)
                    return
                }

                const existingCreated = new Date(existing.created_at).getTime()
                const nextCreated = new Date(assignment.created_at).getTime()
                if (nextCreated > existingCreated) {
                    deduped.set(key, assignment)
                }
            }
        })

        return Array.from(deduped.values())
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
        if (!progress.user_id || !progress.content_id || !progress.content_type) {
            throw new Error('Missing required progress keys (user_id, content_id, content_type)')
        }

        const { data: existingRow, error: existingError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', progress.user_id)
            .eq('content_type', progress.content_type)
            .eq('content_id', progress.content_id)
            .maybeSingle()

        if (existingError) throw existingError

        const existingScore = typeof existingRow?.score_percentage === 'number' ? existingRow.score_percentage : null
        const nextScore = typeof progress.score_percentage === 'number' ? progress.score_percentage : null
        const existingProgress = typeof existingRow?.progress_percentage === 'number' ? existingRow.progress_percentage : null
        const nextProgress = typeof progress.progress_percentage === 'number' ? progress.progress_percentage : null

        const keepExistingScore =
            existingScore !== null &&
            nextScore !== null &&
            Number.isFinite(existingScore) &&
            Number.isFinite(nextScore) &&
            existingScore > nextScore

        const mergedMetadata = (
            existingRow?.metadata &&
            typeof existingRow.metadata === 'object' &&
            !Array.isArray(existingRow.metadata)
        )
            ? { ...(existingRow.metadata as Record<string, unknown>) }
            : {}

        if (progress.metadata && typeof progress.metadata === 'object' && !Array.isArray(progress.metadata)) {
            Object.assign(mergedMetadata, progress.metadata as Record<string, unknown>)
        }

        const bestProgressPercentage =
            existingProgress !== null && nextProgress !== null
                ? Math.max(existingProgress, nextProgress)
                : (nextProgress ?? existingProgress)
        const resolvedProgressPercentage = progress.status === 'completed'
            ? 100
            : bestProgressPercentage

        const bestScorePercentage = keepExistingScore ? existingRow?.score_percentage : progress.score_percentage
        const bestPassed = keepExistingScore ? existingRow?.passed : progress.passed
        const bestCompletedAt = keepExistingScore ? (existingRow?.completed_at ?? progress.completed_at) : (progress.completed_at ?? existingRow?.completed_at)

        const progressData = {
            ...progress,
            progress_percentage: resolvedProgressPercentage,
            score_percentage: bestScorePercentage,
            passed: bestPassed,
            completed_at: bestCompletedAt,
            training_module_id: progress.content_type === 'module'
                ? progress.content_id
                : (progress.training_module_id ?? existingRow?.training_module_id ?? null),
            metadata: Object.keys(mergedMetadata).length ? mergedMetadata : progress.metadata,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('learning_progress')
            .upsert(progressData, { onConflict: 'user_id,content_type,content_id' })
            .select()
            .single()

        if (error) throw error
        return data as LearningProgress
    },
}
