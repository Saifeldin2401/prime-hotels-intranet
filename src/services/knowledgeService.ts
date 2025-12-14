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

export async function getArticles(
    filters: KnowledgeSearchFilters,
    page = 1,
    pageSize = 20
): Promise<KnowledgeSearchResult> {
    try {
        let query = supabase
            .from('sop_documents')
            .select(`
          id, code, title, title_ar, description, description_ar,
          content_type, status, version, visibility_scope,
          property_id, department_id, category_id,
          requires_acknowledgment, estimated_read_time,
          created_at, updated_at, published_at, next_review_date
        `, { count: 'exact' })

        // Apply filters
        if (filters.query) {
            query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,code.ilike.%${filters.query}%`)
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
        if (filters.category_id) {
            query = query.eq('category_id', filters.category_id)
        }
        if (filters.property_id) {
            query = query.eq('property_id', filters.property_id)
        }
        if (filters.visibility_scope) {
            query = query.eq('visibility_scope', filters.visibility_scope)
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
        console.log('getArticleById called with id:', id)
        const { data, error } = await supabase
            .from('sop_documents')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.warn('Article fetch error:', error.message, error)
            return null
        }
        if (!data) {
            console.warn('Article not found for id:', id)
            return null
        }

        console.log('Article found:', data.title, data.status)
        return formatArticle(data)
    } catch (e) {
        console.error('Article fetch exception:', e)
        return null
    }
}

export async function getFeaturedArticles(limit = 5): Promise<KnowledgeArticle[]> {
    try {
        console.log('getFeaturedArticles called with limit:', limit)
        const { data, error } = await supabase
            .from('sop_documents')
            .select(`id, code, title, description, content_type, status, updated_at`)
            .eq('status', 'published')
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getFeaturedArticles error:', error.message)
            return []
        }
        console.log('getFeaturedArticles found:', data?.length, 'articles')
        return (data || []).map(formatArticle)
    } catch (e) {
        console.error('getFeaturedArticles exception:', e)
        return []
    }
}

export async function getRecentArticles(limit = 10): Promise<KnowledgeArticle[]> {
    try {
        console.log('getRecentArticles called with limit:', limit)
        const { data, error } = await supabase
            .from('sop_documents')
            .select(`id, code, title, description, content_type, status, updated_at`)
            .eq('status', 'published')
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getRecentArticles error:', error.message)
            return []
        }
        console.log('getRecentArticles found:', data?.length, 'articles')
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
        const { data, error } = await supabase
            .rpc('get_required_reading', { p_user_id: userId })

        if (error) {
            console.warn('get_required_reading RPC not available:', error.message)
            return []
        }
        return data || []
    } catch {
        return []
    }
}

export async function acknowledgeArticle(documentId: string, userId: string): Promise<void> {
    // Get current version
    const { data: article } = await supabase
        .from('sop_documents')
        .select('current_version_id')
        .eq('id', documentId)
        .single()

    const { error } = await supabase
        .from('sop_acknowledgments')
        .upsert({
            document_id: documentId,
            version_id: article?.current_version_id,
            user_id: userId,
            acknowledged_at: new Date().toISOString()
        })

    if (error) throw error
}

// ============================================================================
// CONTEXTUAL HELP
// ============================================================================

export async function getContextualHelp(
    triggerType: string,
    triggerValue: string
): Promise<ContextualHelp[]> {
    try {
        const { data, error } = await supabase
            .rpc('get_contextual_help', {
                p_trigger_type: triggerType,
                p_trigger_value: triggerValue
            })

        if (error) {
            console.warn('get_contextual_help RPC not available:', error.message)
            return []
        }
        return data || []
    } catch {
        return []
    }
}

// ============================================================================
// COMMENTS
// ============================================================================

export async function getComments(documentId: string): Promise<KnowledgeComment[]> {
    try {
        const { data, error } = await supabase
            .from('sop_comments')
            .select('*')
            .eq('document_id', documentId)
            .is('parent_id', null)
            .order('created_at', { ascending: false })

        if (error) {
            console.warn('Comments fetch error:', error.message)
            return []
        }

        return data || []
    } catch {
        return []
    }
}

export async function createComment(
    documentId: string,
    userId: string,
    content: string,
    parentId?: string,
    isQuestion = false
): Promise<KnowledgeComment | null> {
    try {
        const { data, error } = await supabase
            .from('sop_comments')
            .insert({
                document_id: documentId,
                user_id: userId,
                content,
                parent_id: parentId,
                is_question: isQuestion
            })
            .select('*')
            .single()

        if (error) {
            console.warn('Create comment error:', error.message)
            return null
        }
        return data
    } catch {
        return null
    }
}

export async function voteComment(
    commentId: string,
    userId: string,
    voteType: 'up' | 'down'
): Promise<void> {
    const { error } = await supabase
        .from('sop_comment_votes')
        .upsert({
            comment_id: commentId,
            user_id: userId,
            vote_type: voteType
        })

    if (error) throw error

    // Update upvotes count
    const { data: votes } = await supabase
        .from('sop_comment_votes')
        .select('vote_type')
        .eq('comment_id', commentId)

    const upvotes = votes?.filter(v => v.vote_type === 'up').length || 0
    const downvotes = votes?.filter(v => v.vote_type === 'down').length || 0

    await supabase
        .from('sop_comments')
        .update({ upvotes: upvotes - downvotes })
        .eq('id', commentId)
}

// ============================================================================
// BOOKMARKS
// ============================================================================

export async function getBookmarks(userId: string): Promise<KnowledgeBookmark[]> {
    try {
        const { data, error } = await supabase
            .from('sop_bookmarks')
            .select(`
              *,
              article:sop_documents (id, code, title, description, content_type, status, updated_at)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.warn('Bookmarks fetch error:', error.message)
            return []
        }
        return (data || []).map(b => ({
            ...b,
            article: b.article ? formatArticle(b.article) : undefined
        }))
    } catch {
        return []
    }
}

export async function toggleBookmark(
    documentId: string,
    userId: string
): Promise<boolean> {
    // Check if already bookmarked
    const { data: existing } = await supabase
        .from('sop_bookmarks')
        .select('user_id')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .single()

    if (existing) {
        await supabase
            .from('sop_bookmarks')
            .delete()
            .eq('document_id', documentId)
            .eq('user_id', userId)
        return false
    } else {
        await supabase
            .from('sop_bookmarks')
            .insert({ document_id: documentId, user_id: userId })
        return true
    }
}

// ============================================================================
// FEEDBACK
// ============================================================================

export async function submitFeedback(
    documentId: string,
    userId: string,
    helpful: boolean,
    feedbackText?: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('sop_feedback')
            .upsert(
                {
                    document_id: documentId,
                    user_id: userId,
                    helpful,
                    feedback_text: feedbackText
                },
                { onConflict: 'document_id,user_id' }
            )

        if (error) {
            console.warn('Submit feedback error:', error.message)
        }
    } catch {
        // Table may not exist, fail silently
    }
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function getCategories(departmentId?: string) {
    try {
        let query = supabase
            .from('sop_categories')
            .select('id, name, name_ar, description, description_ar, parent_id, department_id')
            .is('parent_id', null)
            .order('name')

        if (departmentId) {
            query = query.eq('department_id', departmentId)
        }

        const { data, error } = await query

        if (error) {
            console.warn('Categories fetch error:', error.message)
            return []
        }
        return data || []
    } catch {
        return []
    }
}

// ============================================================================
// CONTENT TYPE COUNTS
// ============================================================================

export async function getContentTypeCounts(): Promise<Record<string, number>> {
    try {
        const { data, error } = await supabase
            .from('sop_documents')
            .select('content_type')
            .eq('status', 'published')

        if (error) {
            console.warn('Content type counts error:', error.message)
            return {}
        }

        // Count occurrences of each content type
        const counts: Record<string, number> = {}
        for (const doc of data || []) {
            counts[doc.content_type] = (counts[doc.content_type] || 0) + 1
        }
        return counts
    } catch {
        return {}
    }
}

// ============================================================================
// RELATED ARTICLES
// ============================================================================


export async function getRelatedArticles(documentId: string): Promise<RelatedArticle[]> {
    const { data, error } = await supabase
        .from('knowledge_related_articles')
        .select(`
            relation_type,
            related:sop_documents!knowledge_related_articles_related_document_id_fkey (
                id, code, title, description, content_type, status
            )
        `)
        .eq('document_id', documentId)

    if (error) throw error

    return (data || []).map(item => {
        // Supabase returns related as array when using foreign key relation  
        const related = Array.isArray(item.related) ? item.related[0] : item.related
        return {
            id: related?.id || '',
            title: related?.title || '',
            content_type: related?.content_type as any,
            relation_type: item.relation_type as 'see_also' | 'prerequisite' | 'supersedes' | 'updated_by'
        }
    }).filter(a => a.id) // Filter out any empty entries
}

// ============================================================================
// HELPERS
// ============================================================================

function formatArticle(data: any): KnowledgeArticle {
    return {
        ...data,
        department: Array.isArray(data.departments) ? data.departments[0] : data.departments,
        category: Array.isArray(data.sop_categories) ? data.sop_categories[0] : data.sop_categories,
        author: Array.isArray(data.author) ? data.author[0] : data.author,
        tags: data.sop_document_tags?.map((dt: any) => dt.tag) || []
    }
}
