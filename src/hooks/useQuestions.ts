/**
 * useQuestions Hooks
 * 
 * React Query hooks for Knowledge Questions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as QuestionService from '@/services/questionService'
import type {
    KnowledgeQuestion,
    QuestionFormData,
    AnswerSubmission,
    QuestionFilters,
    QuestionUsageType,
    AIQuestionGenerationRequest,
    GeneratedQuestion
} from '@/types/questions'
import { toast } from 'sonner'
import { crudToasts } from '@/lib/toastHelpers'

// ============================================================================
// QUESTIONS QUERIES
// ============================================================================

export function useQuestions(filters: QuestionService.QuestionFilters = {}, page = 1, pageSize = 20) {
    return useQuery({
        queryKey: ['questions', filters, page, pageSize],
        queryFn: () => QuestionService.getQuestions(filters, page, pageSize)
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
    return useQuery({
        queryKey: ['questions-published', sopId],
        queryFn: () => QuestionService.getQuestions({
            status: 'published',
            sop_id: sopId
        }, 1, 100)
    })
}

export function usePendingReviewQuestions() {
    return useQuery({
        queryKey: ['questions-pending-review'],
        queryFn: () => QuestionService.getQuestions({ status: 'pending_review' }, 1, 100)
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
    return useQuery({
        queryKey: ['daily-challenge', new Date().toDateString()],
        queryFn: async () => {
            // Get 3 random published questions for daily challenge
            const { questions } = await QuestionService.getQuestions({ status: 'published' }, 1, 20)
            // Shuffle and take 3
            const shuffled = questions.sort(() => Math.random() - 0.5)
            return shuffled.slice(0, 3)
        },
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
