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
// SEARCH SYNONYMS - Map hotel jargon to full terms for better search
// ============================================================================

const SEARCH_SYNONYMS: Record<string, string[]> = {
    // Common abbreviations
    'lc': ['late checkout', 'late check out'],
    'ec': ['early checkin', 'early check in'],
    'ooo': ['out of order'],
    'oos': ['out of service'],
    'dnr': ['do not return', 'blacklist'],
    'vip': ['very important person', 'vip guest'],
    'fo': ['front office', 'reception'],
    'hk': ['housekeeping'],
    'fb': ['food and beverage', 'f&b'],
    'gm': ['general manager'],
    'dnd': ['do not disturb'],
    'mu': ['make up room'],
    'nc': ['no show', 'no-show'],
    'pm': ['preventive maintenance'],
    'wo': ['work order'],
    // Arabic abbreviations
    'مغادرة متأخرة': ['late checkout'],
    'صيانة': ['maintenance', 'preventive maintenance'],
}

/**
 * Expand search query with synonyms for hotel jargon
 */
function expandSearchQuery(query: string): string[] {
    const normalizedQuery = query.toLowerCase().trim()
    const terms = [normalizedQuery]

    // Check if query matches any synonym key
    if (SEARCH_SYNONYMS[normalizedQuery]) {
        terms.push(...SEARCH_SYNONYMS[normalizedQuery])
    }

    // Also check if query contains any synonym key
    Object.entries(SEARCH_SYNONYMS).forEach(([key, values]) => {
        if (normalizedQuery.includes(key)) {
            values.forEach(v => terms.push(normalizedQuery.replace(key, v)))
        }
    })

    return [...new Set(terms)] // Remove duplicates
}

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
          view_count,
          department:departments(id, name),
          category:categories(id, name)
        `, { count: 'exact' })

        // Filter out deleted items
        query = query.eq('is_deleted', false)

        // Apply filters
        if (filters.query) {
            // Expand search query with hotel jargon synonyms
            const expandedTerms = expandSearchQuery(filters.query)
            const searchConditions = expandedTerms
                .map(term => `title.ilike.%${term}%,description.ilike.%${term}%`)
                .join(',')
            query = query.or(searchConditions)
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
        if (filters.requires_acknowledgment !== undefined) {
            query = query.eq('requires_acknowledgment', filters.requires_acknowledgment)
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

export async function getArticleById(id: string, userId?: string): Promise<KnowledgeArticle | null> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*, sop:sop_documents(linked_training_id, linked_quiz_id)')
            .eq('id', id)
            .eq('is_deleted', false)
            .single()

        if (error || !data) {
            if (error) console.warn('Article fetch error:', error.message)
            return null
        }

        const article = formatArticle(data)

        // If userId provided, check for acknowledgment 
        if (userId && data.requires_acknowledgment) {
            const { data: ack } = await supabase
                .from('document_acknowledgments')
                .select('acknowledged_at')
                .eq('document_id', id)
                .eq('user_id', userId)
                .maybeSingle()

            if (ack) {
                article.is_acknowledged = true
                article.acknowledged_at = ack.acknowledged_at
            } else {
                article.is_acknowledged = false
            }
        }

        return article
    } catch (e) {
        console.error('Article fetch exception:', e)
        return null
    }
}

export async function incrementViewCount(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_article_view_count', { doc_id: id })
    if (error) console.warn('Failed to increment view count:', error)
}

export async function getFeaturedArticles(limit = 5): Promise<KnowledgeArticle[]> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select(`id, title, description, status, content_type, updated_at, view_count`)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
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
            .eq('is_deleted', false)
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
        // 1. Get published documents that require acknowledgment
        const { data: requiredDocs, error } = await supabase
            .from('documents')
            .select('*')
            .eq('requires_acknowledgment', true)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .limit(50)

        if (error || !requiredDocs) return []

        // 2. Get user's acknowledgments for these documents
        const { data: acks } = await supabase
            .from('document_acknowledgments')
            .select('document_id, acknowledged_at')
            .eq('user_id', userId)
            .in('document_id', requiredDocs.map(d => d.id))

        const ackMap = new Map(acks?.map(a => [a.document_id, a]))

        // 3. Map to RequiredReading type
        return requiredDocs.map(d => {
            const acknowledgment = ackMap.get(d.id)
            return {
                id: d.id, // Using document ID as the listing ID
                document_id: d.id,
                title: d.title,
                content_type: (d.content_type?.toLowerCase() as any) || 'document',
                is_acknowledged: !!acknowledgment,
                acknowledged_at: acknowledgment?.acknowledged_at,
                // In a real system, due_date might come from a specific assignment table
                // For global required reading, we might not have a strict due date, or default to creation + 7 days
                due_date: new Date(new Date(d.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                is_overdue: false,
                priority: 'high'
            }
        })
    } catch (e) {
        console.error('getRequiredReading error:', e)
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

export async function getComments(documentId: string): Promise<KnowledgeComment[]> {
    const { data, error } = await supabase
        .from('sop_comments')
        .select(`
            id,
            document_id,
            user_id,
            content,
            parent_id,
            is_question,
            is_pinned,
            upvotes,
            created_at,
            updated_at,
            created_at,
            updated_at,
            user:profiles(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

    if (error) {
        throw error
    }

    return (data || []).map(comment => ({
        ...comment,
        author: comment.user as any
    })) as unknown as KnowledgeComment[]
}

export async function createComment(documentId: string, userId: string, content: string, parentId?: string, isQuestion = false): Promise<KnowledgeComment | null> {
    const { data, error } = await supabase
        .from('sop_comments')
        .insert({
            document_id: documentId,
            user_id: userId,
            content,
            parent_id: parentId || null,
            is_question: isQuestion,
            is_pinned: false,
            upvotes: 0
        })
        .select('id')
        .single()

    if (error) {
        console.error('Create comment failed:', error)
        throw error
    }

    // Return minimal data, UI refetches anyway
    return {
        id: data.id,
        content,
        created_at: new Date().toISOString(),
        user_id: userId
    } as any
}
export async function voteComment(commentId: string, userId: string, voteType: 'up' | 'down'): Promise<void> { }
export async function getBookmarks(userId: string): Promise<KnowledgeBookmark[]> {
    const { data, error } = await supabase
        .from('document_bookmarks')
        .select(`
            *,
            article:documents(*)
        `)
        .eq('user_id', userId)

    if (error) {
        console.warn('getBookmarks error:', error.message)
        return []
    }

    return (data || []).map(b => ({
        ...b,
        article: formatArticle(b.article)
    })) as KnowledgeBookmark[]
}

export async function toggleBookmark(documentId: string, userId: string): Promise<boolean> {
    // 1. Check if already bookmarked
    const { data: existing } = await supabase
        .from('document_bookmarks')
        .select('id')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .single()

    if (existing) {
        // Remove
        await supabase
            .from('document_bookmarks')
            .delete()
            .eq('id', existing.id)
        return false
    } else {
        // Add
        await supabase
            .from('document_bookmarks')
            .insert({
                document_id: documentId,
                user_id: userId
            })
        return true
    }
}

export async function submitFeedback(documentId: string, userId: string, helpful: boolean, feedbackText?: string): Promise<void> {
    const { error } = await supabase
        .from('document_feedback')
        .insert({
            document_id: documentId,
            user_id: userId,
            helpful,
            feedback_text: feedbackText
        })

    if (error) throw error
}

export async function getCategories(departmentId?: string) {
    let query = supabase
        .from('document_categories')
        .select('*')
        .order('name')

    if (departmentId) {
        query = query.eq('department_id', departmentId)
    }

    const { data, error } = await query
    if (error) return []
    return data
}

export async function getContentTypeCounts(): Promise<Record<string, number>> {
    try {
        // This is a rough count. For better performance on large datasets, use an RPC function.
        // But for < 1000 docs, this fetch is acceptable.
        const { data, error } = await supabase
            .from('documents')
            .select('content_type')
            .eq('is_deleted', false)
            .eq('status', 'PUBLISHED')

        if (error || !data) return {}

        const counts: Record<string, number> = {}
        data.forEach(d => {
            const type = d.content_type?.toLowerCase() || 'unknown'
            counts[type] = (counts[type] || 0) + 1
        })
        return counts
    } catch {
        return {}
    }
}

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
    const department = Array.isArray(data.department) ? data.department[0] : data.department
    const category = Array.isArray(data.category) ? data.category[0] : data.category

    return {
        ...data,
        content_type: (data.content_type?.toLowerCase() as any) || 'document',
        linked_training_id: data.linked_training_id || sopData?.linked_training_id,
        linked_quiz_id: data.linked_quiz_id || sopData?.linked_quiz_id,
        department: department || (data.department_id ? { id: data.department_id, name: 'Department' } : undefined),
        category: category || (data.category_id ? { id: data.category_id, name: 'Category' } : undefined),
        author: undefined,
        tags: []
    }
}
