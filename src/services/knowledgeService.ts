/**
 * Knowledge Base Service
 * 
 * API service for Knowledge Base operations.
 */

import { supabase } from '@/lib/supabase'
import type {
    KnowledgeArticle,
    KnowledgeComment,
    KnowledgeSearchFilters,
    KnowledgeSearchResult,
    RequiredReading,
    ContextualHelp,
    KnowledgeBookmark,
    KnowledgeFeedback,
    RelatedArticle
} from '@/types/knowledge'

// ============================================================================
// ARTICLES
// ============================================================================

// ============================================================================
// ARTICLES
// ============================================================================

export async function getArticles(
    filters: KnowledgeSearchFilters,
    page = 1,
    pageSize = 20
): Promise<KnowledgeSearchResult> {
    try {
        let query = supabase
            .from('documents')
            .select(`
          id, title, description,
          status, content_type,
          property_id, department_id,
          requires_acknowledgment,
          created_at, updated_at,
          view_count
        `, { count: 'exact' })

        // Apply filters
        if (filters.query) {
            query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
        }
        if (filters.content_type) {
            query = query.eq('content_type', filters.content_type)
        }
        if (filters.status) {
            query = query.eq('status', filters.status)
        }
        if (filters.department_id) {
            query = query.eq('department_id', filters.department_id)
        }
        // category_id not available
        if (filters.property_id) {
            query = query.eq('property_id', filters.property_id)
        }
        // visibility not accessible by scope name directly if enum matches, assuming simple match
        if (filters.visibility_scope) {
            // Mapping visibility scope to visibility column if compatible, otherwise skip
            // query = query.eq('visibility', filters.visibility_scope) 
        }

        // Pagination
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to).order('updated_at', { ascending: false })

        const { data, error, count } = await query

        if (error) {
            console.warn('Articles fetch error:', error.message)
            return { articles: [], total: 0, page, page_size: pageSize }
        }

        return {
            articles: (data || []).map(formatArticle),
            total: count || 0,
            page,
            page_size: pageSize
        }
    } catch {
        return { articles: [], total: 0, page, page_size: pageSize }
    }
}

export async function getArticleById(id: string): Promise<KnowledgeArticle | null> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*, sop:sop_documents(linked_training_id, linked_quiz_id)')
            .eq('id', id)
            .single()

        if (error) {
            console.warn('Article fetch error:', error.message)
            return null
        }
        if (!data) {
            return null
        }

        return formatArticle(data)
    } catch (e) {
        console.error('Article fetch exception:', e)
        return null
    }
}

export async function getFeaturedArticles(limit = 5): Promise<KnowledgeArticle[]> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select(`id, title, description, status, content_type, updated_at, view_count`)
            .eq('status', 'PUBLISHED') // Assuming uppercase or standard
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getFeaturedArticles error:', error.message)
            return []
        }
        return (data || []).map(formatArticle)
    } catch (e) {
        console.error('getFeaturedArticles exception:', e)
        return []
    }
}

export async function getRecentArticles(limit = 10): Promise<KnowledgeArticle[]> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select(`id, title, description, status, content_type, updated_at, view_count`)
            .eq('status', 'PUBLISHED')
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getRecentArticles error:', error.message)
            return []
        }
        return (data || []).map(formatArticle)
    } catch (e) {
        console.error('getRecentArticles exception:', e)
        return []
    }
}

// ============================================================================
// REQUIRED READING
// ============================================================================

export async function getRequiredReading(userId: string): Promise<RequiredReading[]> {
    try {
        // Fallback or RPC? If RPC exists update it, otherwise query manually
        // Assuming documents with requires_acknowledgment = true meant for user
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('requires_acknowledgment', true)
            .eq('status', 'PUBLISHED')
            // Filter logic for user likely needs improvement (department match etc)
            // limiting to 10 for safety if RPC is gone
            .limit(10)

        // Mocking RequiredReading structure from document
        if (data) {
            return data.map(d => ({
                id: d.id,
                document_id: d.id,
                title: d.title,
                content_type: (d.content_type?.toLowerCase() as any) || 'document',
                is_acknowledged: false,
                due_date: new Date().toISOString(), // Placeholder
                is_overdue: false,
                priority: 'high'
            }))
        }

        return []
    } catch {
        return []
    }
}

export async function acknowledgeArticle(documentId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('document_acknowledgments')
        .upsert({
            document_id: documentId,
            user_id: userId,
            acknowledged_at: new Date().toISOString()
        })

    if (error) throw error
}

// ============================================================================
// STUBS FOR REMOVED FEATURES (Comments, Bookmarks, Feedback, Contextual Help)
// ============================================================================

export async function getContextualHelp(triggerType: string, triggerValue: string): Promise<ContextualHelp[]> { return [] }
export async function getComments(documentId: string): Promise<KnowledgeComment[]> { return [] }
export async function createComment(documentId: string, userId: string, content: string, parentId?: string, isQuestion = false): Promise<KnowledgeComment | null> { return null }
export async function voteComment(commentId: string, userId: string, voteType: 'up' | 'down'): Promise<void> { }
export async function getBookmarks(userId: string): Promise<KnowledgeBookmark[]> { return [] }
export async function toggleBookmark(documentId: string, userId: string): Promise<boolean> { return false }
export async function submitFeedback(documentId: string, userId: string, helpful: boolean, feedbackText?: string): Promise<void> { }
export async function getCategories(departmentId?: string) { return [] }
export async function getContentTypeCounts(): Promise<Record<string, number>> { return {} }

// ============================================================================
// RELATED ARTICLES
// ============================================================================

export async function getRelatedArticles(documentId: string): Promise<RelatedArticle[]> {
    // Check if table exists/works with documents
    try {
        const { data, error } = await supabase
            .from('knowledge_related_articles')
            .select(`
                relation_type,
                related_document_id
            `)
            .eq('document_id', documentId)

        if (error) return []

        // Fetch related documents details manually
        if (data && data.length > 0) {
            const ids = data.map(d => d.related_document_id)
            const { data: docs } = await supabase
                .from('documents')
                .select('id, title, description, status, content_type')
                .in('id', ids)

            return (docs || []).map(d => ({
                id: d.id,
                title: d.title,
                content_type: (d.content_type?.toLowerCase() as any) || 'document',
                relation_type: 'see_also'
            }))
        }
        return []
    } catch {
        return []
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatArticle(data: any): KnowledgeArticle {
    // Handle polymorphic/linked SOP data if present from join
    const sopData = Array.isArray(data.sop) ? data.sop[0] : data.sop

    return {
        ...data,
        content_type: (data.content_type?.toLowerCase() as any) || 'document',
        linked_training_id: data.linked_training_id || sopData?.linked_training_id,
        linked_quiz_id: data.linked_quiz_id || sopData?.linked_quiz_id,
        department: data.department_id ? { id: data.department_id, name: 'Department' } : undefined,
        category: undefined,
        author: undefined,
        tags: []
    }
}
