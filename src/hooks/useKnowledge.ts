/**
 * useKnowledge Hook
 * 
 * React Query hooks for Knowledge Base data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as KnowledgeService from '@/services/knowledgeService'
import type {
    KnowledgeSearchFilters,
    KnowledgeComment,
    KnowledgeContentType
} from '@/types/knowledge'
import { toast } from 'sonner'

// ============================================================================
// ARTICLES
// ============================================================================

export function useKnowledgeArticles(filters: KnowledgeSearchFilters, page = 1, pageSize = 20) {
    return useQuery({
        queryKey: ['knowledge-articles', filters, page, pageSize],
        queryFn: () => KnowledgeService.getArticles(filters, page, pageSize)
    })
}

// Simplified alias for common usage
export function useArticles(options?: { search?: string; type?: string; limit?: number; departmentId?: string }) {
    return useQuery({
        queryKey: ['knowledge-articles', options],
        queryFn: async () => {
            const filters: KnowledgeSearchFilters = {
                query: options?.search,
                content_type: options?.type as KnowledgeContentType | undefined,
                department_id: options?.departmentId
            }
            const result = await KnowledgeService.getArticles(filters, 1, options?.limit || 50)
            return result.articles
        }
    })
}

export function useKnowledgeArticle(id: string | undefined) {
    return useQuery({
        queryKey: ['knowledge-article', id],
        queryFn: () => KnowledgeService.getArticleById(id!),
        enabled: !!id
    })
}

export function useFeaturedArticles(limit = 5) {
    return useQuery({
        queryKey: ['knowledge-featured', limit],
        queryFn: () => KnowledgeService.getFeaturedArticles(limit)
    })
}

export function useRecentArticles(limit = 10) {
    return useQuery({
        queryKey: ['knowledge-recent', limit],
        queryFn: () => KnowledgeService.getRecentArticles(limit)
    })
}

// ============================================================================
// REQUIRED READING
// ============================================================================

export function useRequiredReading() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['knowledge-required', user?.id],
        queryFn: () => KnowledgeService.getRequiredReading(user!.id),
        enabled: !!user?.id
    })
}

export function useAcknowledgeArticle() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: (documentId: string) =>
            KnowledgeService.acknowledgeArticle(documentId, user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-required'] })
            toast.success('Article acknowledged')
        },
        onError: () => {
            toast.error('Failed to acknowledge article')
        }
    })
}

// ============================================================================
// CONTEXTUAL HELP
// ============================================================================

export function useContextualHelp(triggerType: string, triggerValue: string) {
    return useQuery({
        queryKey: ['knowledge-contextual', triggerType, triggerValue],
        queryFn: () => KnowledgeService.getContextualHelp(triggerType, triggerValue),
        enabled: !!triggerType && !!triggerValue,
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    })
}

// ============================================================================
// COMMENTS
// ============================================================================

export function useComments(documentId: string | undefined) {
    return useQuery({
        queryKey: ['knowledge-comments', documentId],
        queryFn: () => KnowledgeService.getComments(documentId!),
        enabled: !!documentId
    })
}

export function useCreateComment() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({
            documentId,
            content,
            parentId,
            isQuestion
        }: {
            documentId: string
            content: string
            parentId?: string
            isQuestion?: boolean
        }) => KnowledgeService.createComment(documentId, user!.id, content, parentId, isQuestion),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-comments', variables.documentId] })
            toast.success('Comment posted')
        },
        onError: () => {
            toast.error('Failed to post comment')
        }
    })
}

export function useVoteComment() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({ commentId, voteType }: { commentId: string; voteType: 'up' | 'down' }) =>
            KnowledgeService.voteComment(commentId, user!.id, voteType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-comments'] })
        }
    })
}

// ============================================================================
// BOOKMARKS
// ============================================================================

export function useBookmarks() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['knowledge-bookmarks', user?.id],
        queryFn: () => KnowledgeService.getBookmarks(user!.id),
        enabled: !!user?.id
    })
}

export function useToggleBookmark() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: (documentId: string) =>
            KnowledgeService.toggleBookmark(documentId, user!.id),
        onSuccess: (isBookmarked) => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-bookmarks'] })
            toast.success(isBookmarked ? 'Bookmarked' : 'Bookmark removed')
        },
        onError: () => {
            toast.error('Failed to update bookmark')
        }
    })
}

// ============================================================================
// FEEDBACK
// ============================================================================

export function useSubmitFeedback() {
    const { user } = useAuth()

    return useMutation({
        mutationFn: ({
            documentId,
            helpful,
            feedbackText
        }: {
            documentId: string
            helpful: boolean
            feedbackText?: string
        }) => KnowledgeService.submitFeedback(documentId, user!.id, helpful, feedbackText),
        onSuccess: () => {
            toast.success('Thank you for your feedback!')
        },
        onError: () => {
            toast.error('Failed to submit feedback')
        }
    })
}

// ============================================================================
// CATEGORIES
// ============================================================================

export function useCategories(departmentId?: string) {
    return useQuery({
        queryKey: ['knowledge-categories', departmentId],
        queryFn: () => KnowledgeService.getCategories(departmentId)
    })
}

// ============================================================================
// CONTENT TYPE COUNTS
// ============================================================================

export function useContentTypeCounts() {
    return useQuery({
        queryKey: ['knowledge-type-counts'],
        queryFn: () => KnowledgeService.getContentTypeCounts(),
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    })
}

// ============================================================================
// DEPARTMENT-SPECIFIC CONTENT
// ============================================================================

export function useDepartmentContentCounts() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['knowledge-department-counts-global', user?.id],
        queryFn: async () => {
            if (!user?.id) return {}

            const { supabase } = await import('@/lib/supabase')

            // Get counts by department and type for ALL visible documents (RLS applied)
            const { data: documents } = await supabase
                .from('documents')
                .select('department_id, content_type, departments(id, name)')
                .not('department_id', 'is', null)
                .eq('status', 'PUBLISHED') // Uppercase match enum
                .eq('is_deleted', false)

            if (!documents) return {}

            // Group by department
            const byDepartment = documents.reduce((acc: any, doc: any) => {
                const deptId = doc.department_id
                // Handle cases where departments might be null due to joins/deletes
                if (!deptId || !doc.departments) return acc

                const deptName = doc.departments.name

                if (!acc[deptId]) {
                    acc[deptId] = {
                        id: deptId,
                        name: deptName,
                        counts: {},
                        total: 0
                    }
                }

                const contentType = doc.content_type || 'document'
                acc[deptId].counts[contentType] =
                    (acc[deptId].counts[contentType] || 0) + 1
                acc[deptId].total++

                return acc
            }, {})

            return byDepartment
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    })
}


// ============================================================================
// RELATED ARTICLES
// ============================================================================

export function useRelatedArticles(documentId: string | undefined) {
    return useQuery({
        queryKey: ['knowledge-related', documentId],
        queryFn: () => KnowledgeService.getRelatedArticles(documentId!),
        enabled: !!documentId
    })
}
