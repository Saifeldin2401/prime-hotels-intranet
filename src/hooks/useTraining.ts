import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  TrainingModule,
  TrainingAssignment,
  TrainingProgress,
  TrainingContentBlock,
  TrainingQuiz,
  TrainingQuizAttempt
} from '@/lib/types'
import { learningService } from '@/services/learningService'
import type { QuestionStatus } from '@/types/questions'


// Training Modules
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
          *,
          profiles!training_modules_created_by_fkey(
            full_name,
            email
          ),
          training_content_blocks(
            id,
            type,
            order,
            is_mandatory
          ),
          training_quizzes(
            id,
            type,
            order
          )
        `)
        .order('created_at', { ascending: false })
        .eq('is_deleted', false)

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error

      return data as (TrainingModule & {
        profiles?: { full_name: string; email: string }
        training_content_blocks?: TrainingContentBlock[]
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
          ),
          training_content_blocks(
            *,
            order
          ),
          training_quizzes(
            *,
            order
          )
        `)
        .eq('id', moduleId)
        .eq('is_deleted', false)
        .single()

      if (error) throw error

      return data as TrainingModule & {
        profiles?: { full_name: string; email: string }
        training_content_blocks?: TrainingContentBlock[]
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
    mutationFn: async (module: Partial<TrainingModule>) => {
      if (!user) throw new Error('User must be authenticated')

      const { data, error } = await supabase
        .from('training_modules')
        .insert({
          ...module,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
    },
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
    },
  })
}

// Training Content Blocks
export function useCreateContentBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (block: Partial<TrainingContentBlock>) => {
      const { data, error } = await supabase
        .from('training_content_blocks')
        .insert(block)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_module_id] })
      queryClient.invalidateQueries({ queryKey: ['training-modules'] })
    },
  })
}

export function useUpdateContentBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingContentBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_content_blocks')
        .update(updates)
        .eq('id', id)
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
      // First get the block to know which module to invalidate
      const { data: block } = await supabase
        .from('training_content_blocks')
        .select('training_module_id')
        .eq('id', blockId)
        .single()

      const { error } = await supabase
        .from('training_content_blocks')
        .update({ is_deleted: true })
        .eq('id', blockId)

      if (error) throw error
      return block?.training_module_id
    },
    onSuccess: (moduleId) => {
      if (moduleId) {
        queryClient.invalidateQueries({ queryKey: ['training-module', moduleId] })
      }
    },
  })
}

// Training Quizzes
export function useCreateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (quiz: Partial<TrainingQuiz>) => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .insert(quiz)
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

export function useUpdateQuiz() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingQuiz> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_quizzes')
        .update(updates)
        .eq('id', id)
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

// Training Assignments
export function useTrainingAssignments(filters?: {
  assigned_to_user_id?: string
  assigned_to_department_id?: string
  assigned_to_property_id?: string
  training_module_id?: string
}) {
  return useQuery({
    queryKey: ['training-assignments', filters],
    queryFn: async () => {
      let query = supabase
        .from('learning_assignments')
        .select(`
          *,
          profiles!learning_assignments_assigned_by_fkey(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.assigned_to_user_id) {
        query = query.eq('target_type', 'user').eq('target_id', filters.assigned_to_user_id)
      }
      if (filters?.assigned_to_department_id) {
        query = query.eq('target_type', 'department').eq('target_id', filters.assigned_to_department_id)
      }
      if (filters?.assigned_to_property_id) {
        query = query.eq('target_type', 'property').eq('target_id', filters.assigned_to_property_id)
      }
      if (filters?.training_module_id) {
        query = query.eq('content_type', 'module').eq('content_id', filters.training_module_id)
      }

      const { data: assignments, error } = await query
      if (error) throw error

      // Manual join for modules
      if (assignments && assignments.length > 0) {
        const moduleIds = assignments
          .filter((a: any) => a.content_type === 'module')
          .map((a: any) => a.content_id)

        if (moduleIds.length > 0) {
          const { data: modules } = await supabase
            .from('training_modules')
            .select('id, title, description, estimated_duration_minutes')
            .in('id', moduleIds)

          if (modules) {
            const moduleMap = new Map(modules.map(m => [m.id, m]))
            return assignments.map((a: any) => ({
              ...a,
              training_modules: a.content_type === 'module' ? moduleMap.get(a.content_id) : null
            })) as (TrainingAssignment & {
              training_modules?: TrainingModule
              profiles?: { full_name: string; email: string }
            })[]
          }
        }
      }

      return assignments as (TrainingAssignment & {
        training_modules?: TrainingModule
        profiles?: { full_name: string; email: string }
      })[]
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
        .from('learning_assignments')
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
    },
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
          *,
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

      return data as (TrainingProgress & {
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
          quiz_score: quizScore || null,
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
      if (data && data.training_modules) {
        try {
          // Get user info for certificate
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single()

            // Create certificate
            await supabase.from('certificates').insert({
              user_id: user.id,
              recipient_name: profile?.full_name || user.email || 'Participant',
              recipient_email: user.email,
              certificate_type: 'training',
              title: data.training_modules.title,
              completion_date: new Date().toISOString(),
              score: quizScore,
              training_module_id: data.training_modules.id,
              training_progress_id: progressId
            })
          }
        } catch (certError) {
          console.error('Certificate generation failed:', certError)
          // Don't throw - training completion should succeed even if cert fails
        }
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-progress'] })
      queryClient.invalidateQueries({ queryKey: ['my-training'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', data.training_id] })
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
    },
  })
}

// Quiz Attempts
export function useCreateQuizAttempt() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (attempt: {
      moduleId: string
      answers: Record<string, string>
    }) => {
      if (!user) throw new Error('User must be authenticated')

      // Get the quiz questions for this module
      const { data: quizzes } = await supabase
        .from('training_quizzes')
        .select('*')
        .eq('training_module_id', attempt.moduleId)
        .order('order')

      if (!quizzes) throw new Error('No quizzes found for this module')

      // Calculate score
      let correctCount = 0
      quizzes.forEach((quiz) => {
        if (attempt.answers[quiz.id] === quiz.correct_answer) {
          correctCount++
        }
      })

      const score = correctCount
      const maxScore = quizzes.length
      const passed = (score / maxScore) >= 0.8 // 80% passing threshold

      // Get attempt number
      const { data, error } = await supabase
        .from('training_quiz_attempts')
        .select('attempt_number')
        .eq('user_id', user.id)
        .eq('module_id', attempt.moduleId)
        .order('attempt_number', { ascending: false })
        .limit(1)

      const nextAttemptNumber = (data?.[0]?.attempt_number || 0) + 1

      // Create attempt record
      const { data: attemptData, error: attemptError } = await supabase
        .from('training_quiz_attempts')
        .insert({
          user_id: user.id,
          module_id: attempt.moduleId,
          score,
          max_score: maxScore,
          passed,
          attempt_number: nextAttemptNumber,
        })
        .select()
        .single()

      if (attemptError) throw attemptError
      return attemptData
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] })
      queryClient.invalidateQueries({ queryKey: ['training-module', data.module_id] })
    },
  })
}

export function useQuizAttempts(moduleId?: string, userId?: string) {
  return useQuery({
    queryKey: ['quiz-attempts', moduleId, userId],
    queryFn: async () => {
      let query = supabase
        .from('training_quiz_attempts')
        .select('*')
        .order('created_at', { ascending: false })

      if (moduleId) {
        query = query.eq('module_id', moduleId)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error

      return data as TrainingQuizAttempt[]
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
        .from('learning_assignments')
        .select('due_date, content_id')
        .eq('target_id', user.id)
        .eq('target_type', 'user')

      const stats = {
        totalAssigned: assignments?.length || 0,
        inProgress: progress?.filter(p => p.status === 'in_progress').length || 0,
        completed: progress?.filter(p => p.status === 'completed').length || 0,
        overdue: assignments?.filter((a: any) =>
          a.due_date && new Date(a.due_date) < new Date() &&
          !progress?.find(p => p.training_id === a.content_id && p.status === 'completed')
        ).length || 0,
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

  return useQuery({
    queryKey: ['my-assignments', user?.id],
    queryFn: () => learningService.getMyAssignments(),
    enabled: !!user?.id
  })
}
