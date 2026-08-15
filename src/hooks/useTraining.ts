import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { crudToasts, showErrorToast, showSuccessToast } from '@/lib/toastHelpers'
import type {
    TrainingAssignment,
    TrainingContentBlock,
    TrainingModule,
    TrainingProgress,
    TrainingQuiz,
    TrainingQuizAttempt
} from '@/lib/types'
import { escapeSearchQuery } from '@/lib/utils'
import { learningService } from '@/services/learningService'
import type {
    LearningAssignment
} from '@/types/learning'
import type { Json } from '@/types/database.generated'
import type { QuestionStatus } from '@/types/questions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// Default pagination limit for training modules
const DEFAULT_MODULES_LIMIT = 50

// Training Modules with Pagination (RECOMMENDED)
export interface UseTrainingModulesPaginatedOptions {
  created_by?: string
  search?: string
  cursor?: string | null // For cursor-based pagination
  limit?: number
}

export interface TrainingModulesPaginatedResult {
  modules: (TrainingModule & {
    profiles?: { full_name: string; email: string }
    // training_content_blocks are now stored in documents (content_type='training_block').
    // Fetch them separately with: supabase.from('documents').eq('content_type','training_block').eq('training_module_id', id)
    training_quizzes?: TrainingQuiz[]
  })[]
  nextCursor: string | null
  hasMore: boolean
}

export function useTrainingModulesPaginated(options?: UseTrainingModulesPaginatedOptions) {
  const limit = options?.limit || DEFAULT_MODULES_LIMIT
  
  return useQuery({
    queryKey: ['training-modules-paginated', options],
    queryFn: async (): Promise<TrainingModulesPaginatedResult> => {
      let query = supabase
        .from('training_modules')
        .select(`
          id,
          title,
          description,
          estimated_duration_minutes,
          difficulty_level,
          status,
          created_by,
          created_at,
          updated_at,
          is_deleted,
          certificate_enabled,
          profiles!training_modules_created_by_fkey(
            full_name,
            email
          ),
          training_quizzes(
            id,
            type,
            order
          )
        `)
        // training_content_blocks removed – now in documents (content_type='training_block').
        // Fetch per-module blocks separately when needed.
        .order('created_at', { ascending: false })
        .eq('is_deleted', false)
        .limit(limit)

      // Apply cursor-based pagination
      if (options?.cursor) {
        query = query.lt('created_at', options.cursor)
      }

      if (options?.created_by) {
        query = query.eq('created_by', options.created_by)
      }
      if (options?.search) {
        const escaped = escapeSearchQuery(options.search)
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
      }

      const { data, error } = await query
      if (error) throw error

      const modules = data as unknown as (TrainingModule & {
        profiles?: { full_name: string; email: string }
        training_quizzes?: TrainingQuiz[]
      })[]

      // Determine if there are more results
      const hasMore = modules.length === limit
      const nextCursor = hasMore && modules.length > 0 
        ? modules[modules.length - 1].created_at 
        : null

      return {
        modules,
        nextCursor,
        hasMore
      }
    },
  })
}

// Training Modules (Legacy - kept for backward compatibility)
// WARNING: This fetches ALL modules. Use useTrainingModulesPaginated for better performance.
export function useTrainingModules(filters?: {
  created_by?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['training-modules', filters],
    queryFn: async () => {
      let query = supabase
        .from('training_modules')
        .select(`
          id,
          title,
          description,
          estimated_duration_minutes,
          difficulty_level,
          status,
          created_by,
          created_at,
          updated_at,
          is_deleted,
          certificate_enabled,
          profiles!training_modules_created_by_fkey(
            full_name,
            email
          ),
          training_quizzes(
            id,
            type,
            order
          )
        `)
        // training_content_blocks removed – now in documents (content_type='training_block').
        .order('created_at', { ascending: false })
        .eq('is_deleted', false)

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }
      if (filters?.search) {
        const escaped = escapeSearchQuery(filters.search)
        query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
      }

      const { data, error } = await query
      if (error) throw error

      return data as unknown as (TrainingModule & {
        profiles?: { full_name: string; email: string }
        // training_content_blocks now live in documents (content_type='training_block')
        training_quizzes?: TrainingQuiz[]
      })[]
    },
  })
}

export function useTrainingModule(moduleId: string) {
  return useQuery({
    queryKey: ['training-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_modules')
        .select(`
          *,
          profiles!training_modules_created_by_fkey(
            full_name,
            email
          )
        `)
        // training_content_blocks removed – now in documents (content_type='training_block').
        // Fetch blocks separately: supabase.from('documents').eq('content_type','training_block').eq('training_module_id', moduleId)
        .eq('id', moduleId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error

      return data as TrainingModule & {
        profiles?: { full_name: string; email: string }
        // training_content_blocks now in documents with content_type='training_block'
        training_quizzes?: TrainingQuiz[]
      }
    },
    enabled: !!moduleId,
  })
}

export function useCreateTrainingModule() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (module: Partial<TrainingModule> & { title: string }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('training_modules')
        .insert({
          ...module,
          title: module.title,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      crudToasts.create.success('Training module')
    },
    onError: () => crudToasts.create.error('training module')
  })
}

export function useUpdateTrainingModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingModule> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', data.id] })
      crudToasts.update.success('Training module')
    },
    onError: () => crudToasts.update.error('training module')
  })
}

// Training Content Blocks
// These are now stored in documents with content_type='training_block'.
// The block-specific fields map as: type→block_type, order→block_order.
export function useCreateContentBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (block: Partial<TrainingContentBlock> & { training_module_id: string; title?: string }) => {
      const { type, order, title, ...rest } = block as Record<string, unknown>
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...(rest as Record<string, Json>),
          title: typeof title === 'string' && title ? title : 'Untitled Block',
          training_module_id: block.training_module_id,
          content_type: 'training_block',
          block_type: typeof type === 'string' ? type : 'text',
          block_order: typeof order === 'number' ? order : 0,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_module_id] })
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
      crudToasts.create.success('Content block')
    },
    onError: () => crudToasts.create.error('content block')
  })
}

export function useUpdateContentBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingContentBlock> & { id: string }) => {
      const { type, order, ...rest } = updates as Record<string, unknown>
      const mapped: Record<string, unknown> = { ...rest }
      if (type !== undefined) mapped.block_type = type
      if (order !== undefined) mapped.block_order = order
      const { data, error } = await supabase
        .from('documents')
        .update(mapped)
        .eq('id', id)
        .eq('content_type', 'training_block')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_module_id] })
    },
  })
}

export function useDeleteContentBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blockId: string) => {
      // training_content_blocks consolidated into documents (content_type='training_block').
      const { data: block } = await supabase
        .from('documents')
        .select('training_module_id')
        .eq('id', blockId)
        .eq('content_type', 'training_block')
        .single()

      const { error } = await supabase
        .from('documents')
        .update({ is_deleted: true })
        .eq('id', blockId)
        .eq('content_type', 'training_block')

      if (error) throw error
      return block?.training_module_id
    },
    onSuccess: (moduleId) => {
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: ['training-module', moduleId] })
      }
      crudToasts.delete.success('Content block')
    },
    onError: () => crudToasts.delete.error('content block')
  })
}

// Training Quizzes
// Write operations target unified_questions (source_domain = 'training').
// The training_quizzes view provides backward-compatible reads.
export function useCreateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quiz: Partial<TrainingQuiz>) => {
      const { data, error } = await supabase
        .from('unified_questions')
        .insert({
          source_domain: 'training',
          question_text: quiz.question ?? '',
          question_type: (quiz.type as string) as Parameters<typeof supabase.from>[0] extends never ? never : 'mcq',
          correct_answer: quiz.correct_answer,
          training_module_id: quiz.training_module_id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_module_id] })
      crudToasts.create.success('Quiz')
    },
    onError: () => crudToasts.create.error('quiz')
  })
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingQuiz> & { id: string }) => {
      const payload: Record<string, unknown> = {}
      if (updates.question !== undefined) payload.question_text = updates.question
      if (updates.type !== undefined) payload.question_type = updates.type
      if (updates.correct_answer !== undefined) payload.correct_answer = updates.correct_answer
      if (updates.training_module_id !== undefined) payload.training_module_id = updates.training_module_id
      payload.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('unified_questions')
        .update(payload)
        .eq('id', id)
        .eq('source_domain', 'training')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_module_id] })
    },
  })
}

export function useCreateTrainingAssignment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (assignment: Partial<TrainingAssignment>) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('training_assignment_rules')
        .insert({
          ...assignment,
          assigned_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
      crudToasts.create.success('Assignment')
    },
    onError: () => crudToasts.create.error('assignment')
  })
}

// Training Progress
export function useTrainingProgress(userId?: string, trainingId?: string) {
  return useQuery({
    queryKey: ['training-progress', userId, trainingId],
    queryFn: async () => {
      let query = supabase
        .from('training_progress')
        .select(`
          id,
          user_id,
          training_id:training_module_id,
          assignment_id,
          status,
          completed_at,
          progress_percentage,
          score_percentage,
          is_deleted,
          created_at,
          updated_at,
          training_modules(
            id,
            title,
            description,
            estimated_duration_minutes
          ),
          learning_assignments(
            id,
            due_date
          )
        `)
        .order('created_at', { ascending: false })
        .eq('is_deleted', false)

      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (trainingId) {
        query = query.eq('training_id', trainingId)
      }

      const { data, error } = await query
      if (error) throw error

      return (data as any[]).map(progress => ({
        ...progress,
        training_modules: Array.isArray(progress.training_modules) ? progress.training_modules[0] : progress.training_modules,
        learning_assignments: Array.isArray(progress.learning_assignments) ? progress.learning_assignments[0] : progress.learning_assignments
      })) as unknown as (TrainingProgress & {
        training_modules?: TrainingModule
        learning_assignments?: LearningAssignment
      })[]
    },
  })
}

export function useUpdateTrainingProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TrainingProgress> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_progress')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_id] })
    },
  })
}

export function useStartTraining() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      trainingId,
      assignmentId
    }: {
      trainingId: string
      assignmentId?: string
    }) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('training_progress')
        .insert({
          user_id: user.id,
          training_id: trainingId,
          assignment_id: assignmentId || null,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
    },
    onError: () => showErrorToast('Failed to start training')
  })
}

export function useCompleteTraining() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      progressId,
      quizScore
    }: {
      progressId: string
      quizScore?: number
    }) => {
      // Update progress to completed
      const { data, error } = await supabase
        .from('training_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          quiz_score: quizScore ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', progressId)
        .select(`
          *,
          training_modules(id, title)
        `)
        .single()

      if (error) throw error

      // Auto-generate certificate
      let certificateGenerated = false
      let certificateError: string | null = null

      if (data && data.training_modules) {
        const moduleInfo = Array.isArray(data.training_modules) ? data.training_modules[0] : data.training_modules
        try {
          // Get user info for certificate
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single()

            const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
            const verificationCode = `V-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

            // Create certificate
            const { error: certInsertError } = await supabase.from('certificates').insert({
              certificate_number: certNumber,
              verification_code: verificationCode,
              user_id: user.id,
              recipient_name: profile?.full_name || user.email || 'Participant',
              recipient_email: user.email,
              certificate_type: 'training',
              title: moduleInfo?.title || 'Training Completion Certificate',
              completion_date: new Date().toISOString(),
              score: quizScore,
              training_module_id: moduleInfo?.id || data.training_id,
              training_progress_id: progressId
            })

            if (certInsertError) {
              throw certInsertError
            }
            certificateGenerated = true
          }
        } catch (certError: unknown) {
          console.error('Certificate generation failed:', certError)
          certificateError = (certError instanceof Error ? certError.message : 'Certificate generation failed')
          // Don't throw - training completion should succeed even if cert fails
          // But we'll communicate the issue to the user via toast
        }
      }

      return {
        ...data,
        certificateGenerated,
        certificateError
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', result.training_id] })
      queryClient.invalidateQueries({ queryKey: ['certificates'] })

      if (result.certificateGenerated) {
        showSuccessToast('Training Completed!', 'Great job! Your certificate has been generated.')
      } else if (result.certificateError) {
        showSuccessToast('Training Completed!', 'Your certificate will be generated shortly.')
        // Also show a warning toast about the certificate issue
        console.warn('Certificate will be retried:', result.certificateError)
      } else {
        showSuccessToast('Training Completed!', 'Great job on finishing this module.')
      }
    },
    onError: () => showErrorToast('Failed to complete training')
  })
}

// Quiz Attempts
// Canonical storage: unified_quiz_sessions (one row per attempt) +
// unified_question_attempts (one row per answered question). Questions come from
// unified_questions. The legacy quizzes/quiz_attempts tables have been removed.
export function useCreateQuizAttempt() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (attempt: {
      moduleId: string
      answers: Record<string, string>
    }) => {
      if (!user) throw new Error('User must be authenticated')

      // Get the quiz questions for this module from the unified table
      const { data: questions } = await supabase
        .from('unified_questions')
        .select('*')
        .eq('source_domain', 'training')
        .eq('training_module_id', attempt.moduleId)
        .order('created_at')

      if (!questions) throw new Error('No quizzes found for this module')

      // Calculate score
      let correctCount = 0
      questions.forEach((question) => {
        if (attempt.answers[question.id] === question.correct_answer) {
          correctCount++
        }
      })

      const score = correctCount
      const maxScore = questions.length
      const passed = maxScore > 0 ? (score / maxScore) >= 0.8 : false // 80% passing threshold
      const nowIso = new Date().toISOString()

      // Attempt number = prior training sessions for this module + 1
      const { data: priorSessions } = await supabase
        .from('unified_quiz_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('quiz_type', 'training')
        .eq('quiz_entity_id', attempt.moduleId)

      const nextAttemptNumber = (priorSessions?.length || 0) + 1

      // Create the session (one row per quiz attempt)
      const { data: session, error: sessionError } = await supabase
        .from('unified_quiz_sessions')
        .insert({
          user_id: user.id,
          quiz_type: 'training',
          quiz_entity_id: attempt.moduleId,
          started_at: nowIso,
          completed_at: nowIso,
          total_questions: maxScore,
          correct_answers: score,
          score_percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
          passed,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Persist per-question answers (canonical attempt records)
      if (questions.length > 0) {
        const attemptRows = questions.map((question) => ({
          user_id: user.id,
          question_id: question.id,
          session_id: session.id,
          selected_answer: attempt.answers[question.id] ?? null,
          is_correct: attempt.answers[question.id] === question.correct_answer,
          context_type: 'training',
          context_entity_id: attempt.moduleId,
          attempt_number: nextAttemptNumber,
        }))
        await supabase.from('unified_question_attempts').insert(attemptRows)
      }

      return { ...session, module_id: attempt.moduleId, score, max_score: maxScore, passed, attempt_number: nextAttemptNumber }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', data.module_id] })
      if (data.passed) {
        showSuccessToast('Quiz Passed!', `You scored ${data.score}/${data.max_score}`)
      } else {
        showErrorToast('Quiz Failed', `You scored ${data.score}/${data.max_score}. Please try again.`)
      }
    },
    onError: () => showErrorToast('Failed to submit quiz')
  })
}

export function useQuizAttempts(moduleId?: string, userId?: string) {
  return useQuery({
    queryKey: ['quiz-attempts', moduleId, userId],
    queryFn: async () => {
      // Read training attempts from unified_quiz_sessions (quiz_type='training')
      let query = supabase
        .from('unified_quiz_sessions')
        .select('*')
        .eq('quiz_type', 'training')
        .order('started_at', { ascending: false })

      if (moduleId) {
        query = query.eq('quiz_entity_id', moduleId)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error

      // Map session rows to the TrainingQuizAttempt shape consumers expect
      return (data || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        module_id: row.quiz_entity_id,
        score: row.correct_answers ?? 0,
        max_score: row.total_questions ?? 0,
        passed: row.passed ?? false,
        attempt_number: 1,
        started_at: row.started_at,
        completed_at: row.completed_at,
        answers: null,
      })) as TrainingQuizAttempt[]
    },
  })
}

// Learning Quizzes (Standalone)
export function useLearningQuizzes(status?: QuestionStatus) {
  return useQuery({
    queryKey: ['learning-quizzes', status],
    queryFn: () => learningService.getQuizzes(status)
  })
}

// Training Stats
export function useTrainingStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['training-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Get user's training progress
      const { data: progress } = await supabase
        .from('training_progress')
        .select('status, started_at, completed_at, training_id')
        .eq('user_id', user.id)

      // Get user's assignments
      const { data: assignments } = await supabase
        .from('training_assignment_rules')
        .select('due_date, content_id')
        .eq('target_id', user.id)
        .eq('target_type', 'user')

      const typedProgress = (progress || []) as Partial<TrainingProgress>[]
      const typedAssignments = (assignments || []) as Partial<LearningAssignment>[]

      const stats = {
        totalAssigned: typedAssignments.length,
        inProgress: typedProgress.filter(p => p.status === 'in_progress').length,
        completed: typedProgress.filter(p => p.status === 'completed').length,
        overdue: typedAssignments.filter((a) =>
          a.due_date && new Date(a.due_date) < new Date() &&
          !typedProgress.find(p => p.training_id === a.content_id && p.status === 'completed')
        ).length,
        averageScore: 0, // Could calculate from quiz attempts
      }

      return stats
    },
  })
}

// Assignment Progress
export function useAssignmentProgress(assignmentId: string | null) {
  return useQuery({
    queryKey: ['assignment-progress', assignmentId],
    queryFn: () => learningService.getAssignmentProgress(assignmentId!),
    enabled: !!assignmentId
  })
}

export function useMyAssignments() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return

    const invalidateMyAssignments = () => {
      queryClient.invalidateQueries({ queryKey: ['my-assignments', user.id] })
    }

    const channel = supabase
      .channel(`my-assignments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_assignment_rules' },
        invalidateMyAssignments
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_progress', filter: `user_id=eq.${user.id}` },
        invalidateMyAssignments
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'learning_assignment_exemptions', filter: `user_id=eq.${user.id}` },
        invalidateMyAssignments
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'learning_assignment_user_overrides', filter: `user_id=eq.${user.id}` },
        invalidateMyAssignments
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: () => learningService.getMyAssignments(),
    enabled: !!user?.id,
    staleTime: 0,
    refetchInterval: 300000, // 5 min fallback (Realtime handles immediate updates above)
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  })
}
