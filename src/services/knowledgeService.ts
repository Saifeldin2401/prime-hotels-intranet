/**
 * Knowledge Base Service
 * 
 * API service for Knowledge Base operations.
 */

import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type {
    ContextualHelp,
    KnowledgeArticle,
    KnowledgeBookmark,
    KnowledgeComment,
    KnowledgeSearchFilters,
    KnowledgeSearchResult,
    RelatedArticle,
    RequiredReading
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

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message
        return typeof message === 'string' ? message : 'Unknown error'
    }
    return 'Unknown error'
}

function normalizeContentType(value: unknown): KnowledgeArticle['content_type'] {
    return typeof value === 'string'
        ? value.toLowerCase() as KnowledgeArticle['content_type']
        : 'document'
}

function toStringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback
}

function toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined
}

function toNullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null
}

function toNumberValue(value: unknown, fallback = 0): number {
    return typeof value === 'number' ? value : fallback
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
    if (Array.isArray(value)) {
        return value[0]
    }

    return value ?? undefined
}

function normalizeNamedJoin(value: RawKnowledgeJoin | null | undefined): { id: string; name: string; name_ar?: string } | undefined {
    if (!value?.id) {
        return undefined
    }

    return {
        id: toStringValue(value.id),
        name: toStringValue(value.name, 'Unknown'),
        name_ar: toOptionalString(value.name)
    }
}

/**
 * Expand search query with synonyms for hotel jargon
 */
export function expandSearchQuery(query: string): string[] {
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
          visibility,
          property_id, department_id,
          requires_acknowledgment,
          created_by, last_published_by,
          created_at, updated_at,
          current_version,
          estimated_read_time,
          view_count,
          author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
          last_editor:profiles!documents_last_published_by_fkey(id, full_name, avatar_url),
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
        // Validate department_id is a real UUID, not 'undefined' string
        if (filters.department_id && filters.department_id !== 'undefined' && filters.department_id.length === 36) {
            query = query.eq('department_id', filters.department_id)
        }
        // category_id not available
        // Validate property_id is a real UUID, not 'undefined' string
        if (filters.property_id && filters.property_id !== 'undefined' && filters.property_id.length === 36) {
            query = query.or(`property_id.is.null,property_id.eq.${filters.property_id}`)
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

        const hydrated = await hydratePublishedSnapshotsForList(data || [])

        return {
            articles: hydrated.map(formatArticle),
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
        // sop_documents consolidated into documents (content_type='sop').
        // linked_training_id and linked_quiz_id are now direct columns on documents.
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_last_published_by_fkey(id, full_name, avatar_url),
                department:departments(id, name),
                category:categories(id, name),
                document_department_access(department_id, department:departments(id, name))
            `)
            .eq('id', id)
            .eq('is_deleted', false)
            .single()

        if (error || !data) {
            if (error) console.warn('Article fetch error:', error.message)
            return null
        }

        const effectiveData = await hydratePublishedSnapshotIfNeeded(data)
        const article = formatArticle(effectiveData)

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
        console.error('Article fetch exception:', toErrorMessage(e))
        return null
    }
}

export async function incrementViewCount(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_article_view_count', { doc_id: id })
    if (error) console.warn('Failed to increment view count:', error.message)
}

export async function getFeaturedArticles(limit = 5, propertyId?: string): Promise<KnowledgeArticle[]> {
    try {
        let query = supabase
            .from('documents')
            .select(`
                id, title, description,
                status, content_type,
                created_by, last_published_by,
                current_version,
                created_at, updated_at,
                estimated_read_time, view_count,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_last_published_by_fkey(id, full_name, avatar_url),
                department:departments(id, name),
                category:categories(id, name)
            `)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })

        if (isRealPropertyId(propertyId)) {
            query = query.or(`property_id.is.null,property_id.eq.${propertyId}`)
        }

        const { data, error } = await query.limit(limit)

        if (error) {
            console.warn('getFeaturedArticles error:', error.message)
            return []
        }
        const hydrated = await hydratePublishedSnapshotsForList(data || [])
        return hydrated.map(formatArticle)
    } catch (e) {
        console.error('getFeaturedArticles exception:', toErrorMessage(e))
        return []
    }
}

export async function getRecentArticles(limit = 10, propertyId?: string): Promise<KnowledgeArticle[]> {
    try {
        let query = supabase
            .from('documents')
            .select(`
                id, title, description,
                status, content_type,
                created_by, last_published_by,
                current_version,
                created_at, updated_at,
                estimated_read_time, view_count,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_last_published_by_fkey(id, full_name, avatar_url),
                department:departments(id, name),
                category:categories!documents_category_id_fkey(id, name)
            `)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })

        if (isRealPropertyId(propertyId)) {
            query = query.or(`property_id.is.null,property_id.eq.${propertyId}`)
        }

        const { data, error } = await query.limit(limit)

        if (error) {
            console.warn('getRecentArticles error:', error.message)
            return []
        }
        const hydrated = await hydratePublishedSnapshotsForList(data || [])
        return hydrated.map(formatArticle)
    } catch (e) {
        console.error('getRecentArticles exception:', toErrorMessage(e))
        return []
    }
}

// ============================================================================
// REQUIRED READING
// ============================================================================

export async function getRequiredReading(userId: string, propertyId?: string): Promise<RequiredReading[]> {
    try {
        // 1. Get published documents that require acknowledgment
        let requiredDocsQuery = supabase
            .from('documents')
            .select('*')
            .eq('requires_acknowledgment', true)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .limit(50)

        if (isRealPropertyId(propertyId)) {
            requiredDocsQuery = requiredDocsQuery.or(`property_id.is.null,property_id.eq.${propertyId}`)
        }

        const { data: requiredDocs, error } = await requiredDocsQuery

        if (error || !requiredDocs) return []

        const hydratedDocs = await hydratePublishedSnapshotsForList(requiredDocs)

        // 2. Get user's acknowledgments for these documents
        const { data: acks } = await supabase
            .from('document_acknowledgments')
            .select('document_id, acknowledged_at')
            .eq('user_id', userId)
            .in('document_id', hydratedDocs.map(d => d.id))

        const ackMap = new Map(acks?.map(a => [a.document_id, a]))

        // 3. Map to RequiredReading type
        return hydratedDocs.map(d => {
            const documentId = toStringValue(d.id)
            const acknowledgment = ackMap.get(documentId)
            return {
                id: documentId, // Using document ID as the listing ID
                document_id: documentId,
                title: toStringValue(d.title),
                content_type: normalizeContentType(d.content_type),
                is_acknowledged: !!acknowledgment,
                acknowledged_at: acknowledgment?.acknowledged_at,
                // In a real system, due_date might come from a specific assignment table
                // For global required reading, we might not have a strict due date, or default to creation + 7 days
                due_date: new Date(new Date(toStringValue(d.created_at)).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                is_overdue: false,
                priority: 'high'
            }
        })
    } catch (e) {
        console.error('getRequiredReading error:', toErrorMessage(e))
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
        }, { onConflict: 'document_id,user_id' })

    if (error) throw error
}

// ============================================================================
// CONTEXTUAL HELP - Real Implementation
// ============================================================================

export async function getContextualHelp(triggerType: string, triggerValue: string, propertyId?: string): Promise<ContextualHelp[]> {
    // Map trigger types to relevant content types
    const contentTypeMap: Record<string, string[]> = {
        'task': ['sop', 'guide', 'checklist'],
        'checklist': ['sop', 'checklist'],
        'training': ['guide', 'video', 'sop'],
        'page': ['reference', 'guide'],
        'maintenance': ['sop', 'policy'],
        'onboarding': ['guide', 'policy', 'checklist']
    }

    const relevantTypes = contentTypeMap[triggerType] || ['guide', 'reference']

    const baseQuery = () => supabase
        .from('documents')
        .select('id, title, description, content_type, status, current_version, view_count')
        .in('content_type', relevantTypes)
        .eq('status', 'PUBLISHED')
        .eq('is_deleted', false)
        .or(`title.ilike.%${triggerValue}%,description.ilike.%${triggerValue}%`)
        .order('view_count', { ascending: false })
        .limit(5)

    const scopedQueries = isRealPropertyId(propertyId)
        ? [
            baseQuery().eq('property_id', propertyId),
            baseQuery().is('property_id', null)
        ]
        : [baseQuery()]

    const scopedResults = await Promise.all(scopedQueries)
    const scopedDocs = []
    for (const result of scopedResults) {
        if (result.error || !result.data) {
            continue
        }
        scopedDocs.push(...result.data)
    }

    if (scopedDocs.length === 0) {
        return []
    }

    const dedupedDocs = Array.from(new Map(scopedDocs.map(doc => [doc.id, doc])).values())
        .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
        .slice(0, 5)

    const hydratedDocs = await hydratePublishedSnapshotsForList(dedupedDocs)

    return hydratedDocs.map(doc => ({
        document_id: toStringValue(doc.id),
        title: toStringValue(doc.title),
        description: toOptionalString(doc.description),
        content_type: normalizeContentType(doc.content_type),
        show_as: 'link'
    }))
}

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
            user:profiles(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

    if (error) {
        throw error
    }

    return ((data || []) as Array<Record<string, unknown>>).map(comment => {
        const user = firstRelation(comment.user as { id: string; full_name: string; avatar_url?: string | null } | Array<{ id: string; full_name: string; avatar_url?: string | null }> | null | undefined)
        return ({
        ...comment,
        author: user
            ? {
                id: user.id,
                full_name: user.full_name,
                avatar_url: user.avatar_url || undefined
            }
            : undefined
    })}) as KnowledgeComment[]
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
        console.error('Create comment failed:', toErrorMessage(error))
        throw error
    }

    // Return minimal data, UI refetches anyway
    return {
        id: data.id,
        content,
        created_at: new Date().toISOString(),
        user_id: userId
    } as KnowledgeComment
}
export async function voteComment(commentId: string, userId: string, voteType: 'up' | 'down'): Promise<void> {
    const { error } = await supabase
        .from('sop_comment_votes')
        .upsert({
            comment_id: commentId,
            user_id: userId,
            vote_type: voteType
        }, { onConflict: 'comment_id,user_id' })

    if (error) {
        console.error('Vote comment failed:', toErrorMessage(error))
        throw error
    }
}
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

    const rawArticles = (data || []).map(b => b.article).filter(Boolean)
    const articles = await hydratePublishedSnapshotsForList(rawArticles)
    const articleMap = new Map(articles.map(article => [article.id, article]))

    return (data || []).map(b => {
        const article = b.article ? (articleMap.get(b.article.id) ?? b.article) : b.article
        return {
            ...b,
            article: article ? formatArticle(article) : undefined
        }
    }) as KnowledgeBookmark[]
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
    // Upsert to handle re-voting (updates existing vote if present)
    const { error } = await supabase
        .from('document_feedback')
        .upsert({
            document_id: documentId,
            user_id: userId,
            helpful,
            feedback_text: feedbackText,
            created_at: new Date().toISOString() // Ensure timestamp updates on change
        }, { onConflict: 'document_id,user_id' })

    if (error) throw error
}

/**
 * Gets global feedback statistics for dashboard
 */
export async function getFeedbackStats(): Promise<{ helpful: number, unhelpful: number, total: number }> {
    const { data, error } = await supabase
        .from('document_feedback')
        .select('helpful')

    if (error) {
        console.error('getFeedbackStats error:', toErrorMessage(error))
        return { helpful: 0, unhelpful: 0, total: 0 }
    }

    const helpful = (data || []).filter(f => f.helpful).length
    const unhelpful = (data || []).filter(f => !f.helpful).length

    return {
        helpful,
        unhelpful,
        total: (data || []).length
    }
}

/**
 * Gets most recent feedback entries with document titles
 */
export async function getRecentFeedback(limit = 10): Promise<Array<{
    id: string
    document_id: string
    user_id: string
    helpful: boolean
    feedback_text?: string | null
    created_at: string
    document?: { id: string; title: string } | null
}>> {
    const { data, error } = await supabase
        .from('document_feedback')
        .select(`
            *,
            document:documents(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('getRecentFeedback error:', toErrorMessage(error))
        return []
    }
    return data || []
}

/**
 * Gets daily feedback trends for charts
 */
export async function getFeedbackTrends(days = 30): Promise<{ date: string; helpful: number; unhelpful: number }[]> {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    const { data, error } = await supabase
        .from('document_feedback')
        .select('created_at, helpful')
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true })

    if (error) {
        console.error('getFeedbackTrends error:', toErrorMessage(error))
        return []
    }

    // Process data to group by date
    const trends = new Map<string, { date: string, helpful: number, unhelpful: number }>()

    // Initialize map with all dates in range to show 0s
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        trends.set(dateStr, { date: dateStr, helpful: 0, unhelpful: 0 })
    }

    data?.forEach(item => {
        const dateStr = new Date(item.created_at).toISOString().split('T')[0]
        if (trends.has(dateStr)) {
            const entry = trends.get(dateStr)!
            if (item.helpful) entry.helpful++
            else entry.unhelpful++
        } else {
            // Handle edge case where timezone might shift date slightly outside init range
            const entry = { date: dateStr, helpful: 0, unhelpful: 0 }
            if (item.helpful) entry.helpful++
            else entry.unhelpful++
            trends.set(dateStr, entry)
        }
    })

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date))
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

export async function getContentTypeCounts(propertyId?: string): Promise<Record<string, number>> {
    try {
        // Count all visible, non-deleted documents (status can vary by role and RLS).
        let query = supabase
            .from('documents')
            .select('content_type')
            .eq('is_deleted', false)

        if (isRealPropertyId(propertyId)) {
            query = query.or(`property_id.is.null,property_id.eq.${propertyId}`)
        }

        const { data, error } = await query

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
    try {
        const { data, error } = await supabase
            .from('related_articles')
            .select(`
                relevance_score,
                related_document_id,
                related_document:documents!related_document_id(
                    id,
                    title,
                    description,
                    content_type,
                    status,
                    current_version
                )
            `)
            .eq('source_document_id', documentId)
            .order('relevance_score', { ascending: false })
            .limit(6)

        if (error) {
            console.warn('getRelatedArticles error:', error.message)
            return []
        }

        const relatedDocs = (data || [])
            .map(d => firstRelation(d.related_document as RawKnowledgeArticle | RawKnowledgeArticle[] | null | undefined))
            .filter(Boolean) as RawKnowledgeArticle[]
        const hydratedDocs = await hydratePublishedSnapshotsForList(relatedDocs)
        const docMap = new Map(hydratedDocs.map(doc => [doc.id, doc]))

        return (data || []).map(d => {
            const relatedDocument = firstRelation(d.related_document as RawKnowledgeArticle | RawKnowledgeArticle[] | null | undefined)
            const doc = docMap.get(d.related_document_id) || relatedDocument || {}
            return {
                id: toStringValue(doc.id, d.related_document_id),
                title: toStringValue(doc.title, 'Untitled'),
                content_type: normalizeContentType(doc.content_type),
                relation_type: 'automated',
                score: typeof d.relevance_score === 'number' ? d.relevance_score : undefined
            }
        })
    } catch (e) {
        console.error('getRelatedArticles exception:', toErrorMessage(e))
        return []
    }
}

/**
 * Tracks a click on a related article for behavioral scoring
 */
export async function trackRelatedClick(sourceId: string, relatedId: string, userId?: string, position?: number): Promise<void> {
    try {
        const { error } = await supabase.rpc('track_related_article_click', {
            p_source_doc_id: sourceId,
            p_clicked_doc_id: relatedId,
            p_user_id: userId || null,
            p_position: position || null
        })
        if (error) throw error
    } catch (e) {
        console.error('Failed to track related click:', toErrorMessage(e))
    }
}

/**
 * Tracks impressions for related articles to calculate CTR
 */
export async function trackRelatedImpressions(sourceId: string, relatedIds: string[]): Promise<void> {
    try {
        const { error } = await supabase.rpc('track_related_article_impression', {
            p_source_doc_id: sourceId,
            p_related_doc_ids: relatedIds
        })
        if (error) throw error
    } catch (e) {
        console.error('Failed to track related impressions:', toErrorMessage(e))
    }
}

// ============================================================================
// HELPERS
// ============================================================================

async function hydratePublishedSnapshotIfNeeded(data: RawKnowledgeArticle): Promise<RawKnowledgeArticle> {
    if (!data?.id) return data
    if (data.status === 'PUBLISHED') return data
    if (!data.current_version) return data

    const { data: snapshot, error } = await supabase
        .from('document_versions')
        .select('version_number, title, description, content, file_url, status')
        .eq('document_id', data.id)
        .eq('version_number', data.current_version)
        .maybeSingle()

    if (error || !snapshot) {
        return data
    }

    return {
        ...data,
        title: snapshot.title ?? data.title,
        description: snapshot.description ?? data.description,
        content: snapshot.content ?? data.content,
        file_url: snapshot.file_url ?? data.file_url,
        status: snapshot.status || 'PUBLISHED',
        current_version: snapshot.version_number ?? data.current_version,
        updated_at: data.updated_at
    }
}

async function hydratePublishedSnapshotsForList(rows: RawKnowledgeArticle[]): Promise<RawKnowledgeArticle[]> {
    if (!rows.length) return rows
    const needsSnapshot = rows.filter(row =>
        row?.id &&
        row?.status !== 'PUBLISHED' &&
        row?.current_version
    )
    if (!needsSnapshot.length) return rows

    const docIds = Array.from(new Set(needsSnapshot.map(row => row.id)))
    const versionNumbers = Array.from(new Set(needsSnapshot.map(row => row.current_version)))

    const { data: snapshots, error } = await supabase
        .from('document_versions')
        .select('document_id, version_number, title, description, content, file_url, status')
        .in('document_id', docIds)
        .in('version_number', versionNumbers)

    if (error || !snapshots) return rows

    const snapshotMap = new Map(
        snapshots.map(snapshot => [`${snapshot.document_id}:${snapshot.version_number}`, snapshot])
    )

    return rows.map(row => {
        if (!row?.id || row?.status === 'PUBLISHED' || !row?.current_version) return row
        const snapshot = snapshotMap.get(`${row.id}:${row.current_version}`)
        if (!snapshot) return row
        return {
            ...row,
            title: snapshot.title ?? row.title,
            description: snapshot.description ?? row.description,
            content: snapshot.content ?? row.content,
            file_url: snapshot.file_url ?? row.file_url,
            status: snapshot.status || row.status || 'PUBLISHED',
            current_version: snapshot.version_number ?? row.current_version,
            updated_at: row.updated_at
        }
    })
}

function computeReadMinutes(content?: string | null): number | undefined {
    if (!content) return undefined
    // Use recursive sanitization to prevent bypass attempts with nested tags
    let previous: string;
    let stripped = content;
    do {
      previous = stripped;
      stripped = previous.replace(/<[^>]*>/g, ' ');
    } while (stripped !== previous);
    stripped = stripped.replace(/\s+/g, ' ').trim()
    if (!stripped) return undefined
    return Math.max(1, Math.round(stripped.split(' ').length / 200))
}

type RawKnowledgeJoin = {
    id?: string
    name?: string
    full_name?: string
    avatar_url?: string
    linked_training_id?: string | null
    linked_quiz_id?: string | null
    department_id?: string | null
}

type RawKnowledgeArticle = {
    [key: string]: unknown
    sop?: RawKnowledgeJoin | RawKnowledgeJoin[] | null
    department?: RawKnowledgeJoin | RawKnowledgeJoin[] | null
    category?: RawKnowledgeJoin | RawKnowledgeJoin[] | null
    author?: RawKnowledgeJoin | RawKnowledgeJoin[] | null
    last_editor?: RawKnowledgeJoin | RawKnowledgeJoin[] | null
    document_department_access?: Array<{ department_id?: string | null, department?: RawKnowledgeJoin | null }> | null
}

function formatArticle(data: RawKnowledgeArticle): KnowledgeArticle {
    // Handle polymorphic/linked SOP data if present from join
    const sopData = Array.isArray(data.sop) ? data.sop[0] : data.sop
    const department = Array.isArray(data.department) ? data.department[0] : data.department
    const category = Array.isArray(data.category) ? data.category[0] : data.category
    const author = Array.isArray(data.author) ? data.author[0] : data.author
    const lastEditor = Array.isArray(data.last_editor) ? data.last_editor[0] : data.last_editor

    let finalDepartment = department
    if (!finalDepartment && Array.isArray(data.document_department_access) && data.document_department_access.length > 0) {
        if (data.document_department_access.length === 1 && data.document_department_access[0].department) {
            finalDepartment = Array.isArray(data.document_department_access[0].department) 
                ? data.document_department_access[0].department[0]
                : data.document_department_access[0].department
        } else if (data.document_department_access.length > 1) {
            finalDepartment = { id: 'multiple', name: 'Multiple Departments' }
        }
    }

    return {
        ...data,
        id: toStringValue(data.id),
        code: toStringValue(data.code),
        title: toStringValue(data.title, 'Untitled'),
        status: toStringValue(data.status, 'DRAFT') as KnowledgeArticle['status'],
        featured: Boolean(data.featured),
        requires_acknowledgment: Boolean(data.requires_acknowledgment),
        view_count: toNumberValue(data.view_count),
        created_at: toStringValue(data.created_at),
        updated_at: toStringValue(data.updated_at),
        content_type: (typeof data.content_type === 'string' ? data.content_type.toLowerCase() : 'document') as KnowledgeArticle['content_type'],
        visibility_scope: (data.visibility_scope || data.visibility || 'all_properties') as KnowledgeArticle['visibility_scope'],
        linked_training_id: toNullableString(data.linked_training_id) || toNullableString(sopData?.linked_training_id),
        linked_quiz_id: toNullableString(data.linked_quiz_id) || toNullableString(sopData?.linked_quiz_id),
        department: normalizeNamedJoin(finalDepartment) || (toOptionalString(data.department_id) ? { id: toStringValue(data.department_id), name: 'Department' } : undefined),
        category: normalizeNamedJoin(category) || (toOptionalString(data.category_id) ? { id: toStringValue(data.category_id), name: 'Category' } : undefined),
        version: toNumberValue(data.current_version, toNumberValue(data.version, 1)),
        current_version: toNumberValue(data.current_version, toNumberValue(data.version, 1)),
        published_version_number: typeof data.current_version === 'number' ? data.current_version : null,
        last_published_at: toNullableString(data.updated_at),
        estimated_read_time: typeof data.estimated_read_time === 'number' ? data.estimated_read_time : computeReadMinutes(toNullableString(data.content)),
        updated_by: toNullableString(data.last_published_by),
        author: author
            ? {
                id: toStringValue(author.id),
                full_name: toStringValue(author.full_name, 'System admin'),
                avatar_url: toOptionalString(author.avatar_url)
            }
            : undefined,
        last_editor: lastEditor
            ? {
                id: toStringValue(lastEditor.id),
                full_name: toStringValue(lastEditor.full_name, 'System admin'),
                avatar_url: toOptionalString(lastEditor.avatar_url)
            }
            : undefined,
        tags: [],
        department_access_ids: Array.isArray(data.document_department_access)
            ? data.document_department_access.map((d) => d.department_id).filter((departmentId): departmentId is string => typeof departmentId === 'string')
            : []
    }
}
