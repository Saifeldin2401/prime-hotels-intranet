/**
 * useKnowledge Hook
 * 
 * React Query hooks for Knowledge Base data fetching.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import * as KnowledgeService from '@/services/knowledgeService'
import type {
    KnowledgeSearchFilters,
    KnowledgeComment,
    KnowledgeContentType
} from '@/types/knowledge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

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
export function useArticles(options?: {
    search?: string
    type?: string
    limit?: number
    departmentId?: string
    required?: boolean
}) {
    return useQuery({
        queryKey: ['knowledge-articles', options],
        queryFn: async () => {
            const filters: KnowledgeSearchFilters = {
                query: options?.search,
                content_type: options?.type as KnowledgeContentType | undefined,
                department_id: options?.departmentId,
                requires_acknowledgment: options?.required
            }
            const result = await KnowledgeService.getArticles(filters, 1, options?.limit || 50)
            return result.articles
        }
    })
}

export function useKnowledgeArticle(id: string | undefined) {
    const { user } = useAuth()
    return useQuery({
        queryKey: ['knowledge-article', id, user?.id],
        queryFn: () => KnowledgeService.getArticleById(id!, user?.id),
        enabled: !!id,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false
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
        onSuccess: (_data, documentId) => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-required'] })
            queryClient.invalidateQueries({ queryKey: ['knowledge-article', documentId] })
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
    const queryClient = useQueryClient()

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
            queryClient.invalidateQueries({ queryKey: ['knowledge-feedback'] })
            toast.success('Thank you for your feedback!')
        },
        onError: (error: any) => {
            toast.error(`Failed to submit feedback: ${error.message}`)
        }
    })
}

export function useFeedbackStats() {
    return useQuery({
        queryKey: ['knowledge-feedback-stats'],
        queryFn: () => KnowledgeService.getFeedbackStats()
    })
}

export function useRecentFeedback(limit = 10) {
    return useQuery({
        queryKey: ['knowledge-recent-feedback', limit],
        queryFn: () => KnowledgeService.getRecentFeedback(limit)
    })
}

export function useFeedbackTrends(days = 30) {
    return useQuery({
        queryKey: ['knowledge-feedback-trends', days],
        queryFn: () => KnowledgeService.getFeedbackTrends(days)
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
        staleTime: 1000 * 60, // Keep reasonably fresh for sidebar badges
        refetchOnWindowFocus: false,
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

            // Get counts by department and type for ALL visible documents (RLS applied)
            const { data: documents, error: docsError } = await supabase
                .from('documents')
                .select('department_id, content_type, visibility, departments(id, name)')
                .not('department_id', 'is', null)
                .eq('is_deleted', false)

            if (docsError || !documents || documents.length === 0) return {}

            const departmentIds = Array.from(new Set(
                documents
                    .map((doc: any) => doc.department_id)
                    .filter((id: string | null): id is string => !!id)
            ))

            const departmentNameById: Record<string, string> = {}
            if (departmentIds.length > 0) {
                const { data: departmentRows } = await supabase
                    .from('departments')
                    .select('id, name')
                    .in('id', departmentIds)

                for (const row of departmentRows || []) {
                    if (row?.id && row?.name) {
                        departmentNameById[row.id] = row.name
                    }
                }
            }

            // Group by normalized department name to merge same-named departments across properties.
            const byName = documents.reduce((acc: any, doc: any) => {
                const deptId = doc.department_id
                const joinedDept = Array.isArray(doc.departments) ? doc.departments[0] : doc.departments
                if (!deptId) return acc

                const deptName = joinedDept?.name || departmentNameById[deptId] || `Department ${deptId.slice(0, 8)}`

                const key = deptName.trim().toLowerCase()
                if (!acc[key]) {
                    acc[key] = {
                        id: joinedDept?.id || deptId,
                        name: deptName,
                        counts: {},
                        total: 0,
                        departmentIds: new Set<string>()
                    }
                }

                acc[key].departmentIds.add(deptId)

                const contentType = doc.content_type || 'document'
                acc[key].counts[contentType] =
                    (acc[key].counts[contentType] || 0) + 1
                acc[key].total++

                return acc
            }, {})

            // Convert to object keyed by stable id for sidebar URL params.
            // Prefer IDs that resolve through departments table to keep matching search filters stable.
            return Object.values(byName)
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .reduce((acc: any, dept: any) => {
                    const allIds = Array.from(dept.departmentIds || []) as string[]
                    const knownIds = allIds.filter(id => !!departmentNameById[id])
                    const stableId = (knownIds.length > 0 ? knownIds : allIds).sort()[0] || dept.id

                    acc[stableId] = {
                        id: stableId,
                        name: dept.name,
                        counts: dept.counts,
                        total: dept.total
                    }
                    return acc
                }, {})
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60, // Keep reasonably fresh for sidebar badges
        refetchOnWindowFocus: false,
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

export function useTrackRelatedClick() {
    return useMutation({
        mutationFn: ({ sourceId, relatedId, userId, position }: { sourceId: string, relatedId: string, userId?: string, position?: number }) =>
            KnowledgeService.trackRelatedClick(sourceId, relatedId, userId, position)
    })
}

export function useTrackRelatedImpressions() {
    return useMutation({
        mutationFn: ({ sourceId, relatedIds }: { sourceId: string, relatedIds: string[] }) =>
            KnowledgeService.trackRelatedImpressions(sourceId, relatedIds)
    })
}
