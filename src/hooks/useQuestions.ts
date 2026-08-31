/**
 * useQuestions Hooks
 * 
 * React Query hooks for Knowledge Questions.
 */

import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { crudToasts } from '@/lib/toastHelpers'
import { supabase } from '@/lib/supabase'
import * as QuestionService from '@/services/questionService'
import type {
    AIQuestionGenerationRequest,
    AnswerSubmission,
    QuestionFormData,
    QuestionUsageType
} from '@/types/questions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ============================================================================
// QUESTIONS QUERIES
// ============================================================================

export function useQuestions(filters: QuestionService.QuestionFilters = {}, page = 1, pageSize = 20) {
    const { currentOrganization } = useTenant()
    const mergedFilters: QuestionService.QuestionFilters = {
        organization_id: filters.organization_id !== undefined ? filters.organization_id : currentOrganization?.id,
        ...filters
    }
    return useQuery({
        queryKey: ['questions', mergedFilters, page, pageSize],
        queryFn: () => QuestionService.getQuestions(mergedFilters, page, pageSize)
    })
}

export function useQuestion(id: string | undefined) {
    return useQuery({
        queryKey: ['question', id],
        queryFn: () => QuestionService.getQuestionById(id!),
        enabled: !!id
    })
}

export function useQuestionsForContext(usageType: QuestionUsageType, entityId: string | undefined) {
    return useQuery({
        queryKey: ['questions-context', usageType, entityId],
        queryFn: () => QuestionService.getQuestionsForContext(usageType, entityId!),
        enabled: !!entityId
    })
}

export function usePublishedQuestions(sopId?: string) {
    const { currentOrganization } = useTenant()
    return useQuery({
        queryKey: ['questions-published', sopId, currentOrganization?.id],
        queryFn: () => QuestionService.getQuestions({
            status: 'published',
            sop_id: sopId,
            organization_id: currentOrganization?.id
        }, 1, 100)
    })
}

export function usePendingReviewQuestions() {
    const { currentOrganization } = useTenant()
    return useQuery({
        queryKey: ['questions-pending-review', currentOrganization?.id],
        queryFn: () => QuestionService.getQuestions({
            status: 'pending_review',
            organization_id: currentOrganization?.id
        }, 1, 100)
    })
}

// ============================================================================
// QUESTION MUTATIONS
// ============================================================================

export function useCreateQuestion() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({ formData, aiGenerated }: { formData: QuestionFormData; aiGenerated?: boolean }) =>
            QuestionService.createQuestion(formData, user!.id, aiGenerated),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            crudToasts.create.success('Question')
        },
        onError: (error) => {
            console.error('Create question error:', error)
            crudToasts.create.error('question')
        }
    })
}

export function useUpdateQuestion() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({ id, formData }: { id: string; formData: Partial<QuestionFormData> }) =>
            QuestionService.updateQuestion(id, formData, user!.id),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            queryClient.invalidateQueries({ queryKey: ['question', id] })
            crudToasts.update.success('Question')
        },
        onError: (error) => {
            console.error('Update question error:', error)
            crudToasts.update.error('question')
        }
    })
}

export function useDeleteQuestion() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => QuestionService.deleteQuestion(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            crudToasts.delete.success('Question')
        },
        onError: () => {
            crudToasts.delete.error('question')
        }
    })
}

// ============================================================================
// REVIEW WORKFLOW
// ============================================================================

export function useSubmitForReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => QuestionService.submitForReview(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            queryClient.invalidateQueries({ queryKey: ['question', id] })
            crudToasts.submit.success('Question')
        },
        onError: () => {
            crudToasts.submit.error('question')
        }
    })
}

export function useApproveQuestion() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
            QuestionService.approveQuestion(id, user!.id, notes),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            queryClient.invalidateQueries({ queryKey: ['question', id] })
            queryClient.invalidateQueries({ queryKey: ['questions-pending-review'] })
            crudToasts.approve.success('Question')
        },
        onError: () => {
            crudToasts.approve.error('question')
        }
    })
}

export function useRejectQuestion() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({ id, notes }: { id: string; notes: string }) =>
            QuestionService.rejectQuestion(id, user!.id, notes),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            queryClient.invalidateQueries({ queryKey: ['question', id] })
            queryClient.invalidateQueries({ queryKey: ['questions-pending-review'] })
            crudToasts.reject.success('Question')
        },
        onError: () => {
            crudToasts.reject.error('question')
        }
    })
}

export function useArchiveQuestion() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => QuestionService.archiveQuestion(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] })
            crudToasts.update.success('Question archived')
        },
        onError: () => {
            crudToasts.update.error('archive question')
        }
    })
}

// ============================================================================
// QUESTION LINKING
// ============================================================================

export function useLinkQuestion() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            questionId,
            usageType,
            entityId,
            options
        }: {
            questionId: string
            usageType: QuestionUsageType
            entityId: string
            options?: { displayOrder?: number; isRequired?: boolean; weight?: number }
        }) => QuestionService.linkQuestionToContext(questionId, usageType, entityId, options),
        onSuccess: (_, { usageType, entityId }) => {
            queryClient.invalidateQueries({ queryKey: ['questions-context', usageType, entityId] })
            crudToasts.create.success('Question link')
        },
        onError: () => {
            crudToasts.create.error('link question')
        }
    })
}

export function useUnlinkQuestion() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            questionId,
            usageType,
            entityId
        }: {
            questionId: string
            usageType: QuestionUsageType
            entityId: string
        }) => QuestionService.unlinkQuestionFromContext(questionId, usageType, entityId),
        onSuccess: (_, { usageType, entityId }) => {
            queryClient.invalidateQueries({ queryKey: ['questions-context', usageType, entityId] })
            crudToasts.delete.success('Question link')
        },
        onError: () => {
            crudToasts.delete.error('unlink question')
        }
    })
}

// ============================================================================
// ATTEMPTS & SCORING
// ============================================================================

export function useRecordAttempt() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: (submission: AnswerSubmission) =>
            QuestionService.recordAttempt(user!.id, submission),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-attempts'] })
            queryClient.invalidateQueries({ queryKey: ['user-question-stats'] })
        }
    })
}

export function useUserAttempts(questionId?: string, limit = 50) {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['user-attempts', user?.id, questionId, limit],
        queryFn: () => QuestionService.getUserAttempts(user!.id, questionId, limit),
        enabled: !!user?.id
    })
}

// ============================================================================
// QUIZ SESSIONS
// ============================================================================

export function useStartQuizSession() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({
            quizType,
            entityId,
            settings
        }: {
            quizType: QuestionUsageType
            entityId?: string
            settings?: { timeLimit?: number; passingScore?: number }
        }) => QuestionService.startQuizSession(user!.id, quizType, entityId, settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] })
        }
    })
}

export function useCompleteQuizSession() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            sessionId,
            results
        }: {
            sessionId: string
            results: {
                totalQuestions: number
                correctAnswers: number
                totalPoints: number
                earnedPoints: number
            }
        }) => QuestionService.completeQuizSession(sessionId, results),
        onSuccess: (session) => {
            queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] })
            if (session.passed) {
                toast.success(`Quiz completed! Score: ${session.score_percentage?.toFixed(0)}%`)
            } else {
                toast.info(`Quiz completed. Score: ${session.score_percentage?.toFixed(0)}%. Keep practicing!`)
            }
        }
    })
}

// ============================================================================
// AI GENERATION
// ============================================================================

export function useGenerateQuestions() {
    return useMutation({
        mutationFn: (request: AIQuestionGenerationRequest) =>
            QuestionService.generateQuestionsWithAI(request),
        onSuccess: (questions) => {
            toast.success(`Generated ${questions.length} questions`)
        },
        onError: (error) => {
            toast.error('Failed to generate questions')
            console.error('AI generation error:', error)
        }
    })
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function useQuestionAnalytics(questionId: string | undefined) {
    return useQuery({
        queryKey: ['question-analytics', questionId],
        queryFn: () => QuestionService.getQuestionAnalytics(questionId!),
        enabled: !!questionId
    })
}

export function useQuestionsPassRates(questionIds: string[]) {
    const sortedIds = [...questionIds].sort()
    return useQuery({
        queryKey: ['questions-pass-rates', sortedIds],
        queryFn: () => QuestionService.getQuestionsPassRates(sortedIds),
        enabled: sortedIds.length > 0
    })
}

export function useUserQuestionStats() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['user-question-stats', user?.id],
        queryFn: () => QuestionService.getUserQuestionStats(user!.id),
        enabled: !!user?.id
    })
}

// ============================================================================
// DAILY CHALLENGE
// ============================================================================

export function useDailyChallenge() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['daily-challenge', user?.id, new Date().toDateString()],
        queryFn: async () => {
            // Adaptive selection: prioritizes never-attempted and previously-missed
            // questions over recently-mastered ones (see get_daily_challenge_question_ids),
            // instead of shuffling within the first 20 published questions in the bank.
            const { data: ranked, error } = await supabase.rpc('get_daily_challenge_question_ids', { p_count: 3 })
            if (error) throw error

            const ids = (ranked || []).map(r => r.id)
            if (ids.length === 0) return []

            const questions = await QuestionService.getQuestionsByIds(ids)
            const byId = new Map(questions.map(q => [q.id, q]))
            return ids.map(id => byId.get(id)).filter((q): q is NonNullable<typeof q> => !!q)
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 60 * 24 // Cache for 24 hours
    })
}

export function useDailyChallengeStatus() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['daily-challenge-status', user?.id, new Date().toDateString()],
        queryFn: () => QuestionService.getDailyChallengeStatus(user!.id),
        enabled: !!user?.id
    })
}
