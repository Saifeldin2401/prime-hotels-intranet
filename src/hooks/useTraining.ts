import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import type {
    TrainingModule,
    TrainingProgress,
    TrainingQuiz
} from '@/lib/types'
import { escapeSearchQuery } from '@/lib/utils'
import { learningService } from '@/services/learningService'
import type {
    LearningAssignment
} from '@/types/learning'
import type { QuestionStatus } from '@/types/questions'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

// Default pagination limit for training modules
// Training Modules with Pagination (RECOMMENDED)
// Training Modules (Legacy - kept for backward compatibility)
// WARNING: This fetches ALL modules. Use useTrainingModulesPaginated for better performance.
export function useTrainingModules(filters?: {
  created_by?: string
  search?: string
  organization_id?: string
}) {
  const { currentOrganization } = useTenant()
  const orgId = filters?.organization_id || currentOrganization?.id

  return useQuery({
    queryKey: ['training-modules', orgId, filters],
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

      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},is_master_template.eq.true`)
      } else {
        query = query.eq('is_master_template', true)
      }

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
    enabled: !!orgId,
  })
}

// Training Content Blocks
// These are now stored in documents with content_type='training_block'.
// The block-specific fields map as: type→block_type, order→block_order.
// Training Quizzes
// Write operations target unified_questions (source_domain = 'training').
// The training_quizzes view provides backward-compatible reads.
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

// Quiz Attempts
// Canonical storage: unified_quiz_sessions (one row per attempt) +
// unified_question_attempts (one row per answered question). Questions come from
// unified_questions. The legacy quizzes/quiz_attempts tables have been removed.
// Learning Quizzes (Standalone)
export function useLearningQuizzes(status?: QuestionStatus) {
  return useQuery({
    queryKey: ['learning-quizzes', status],
    queryFn: () => learningService.getQuizzes(status)
  })
}

// Training Stats
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
        { event: '*', schema: 'public', table: 'learning_assignments', filter: `user_id=eq.${user.id}` },
        invalidateMyAssignments
      )
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
