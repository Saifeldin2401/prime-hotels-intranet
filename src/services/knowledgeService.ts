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

const ARTICLE_LIST_SELECT = `
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
          category:categories!documents_category_id_fkey(id, name)
        `

function toRealUuid(value?: string): string | null {
    return value && value !== 'undefined' && value.length === 36 ? value : null
}

// Fire-and-forget: records a zero-result KB search for content-gap analytics.
// Never blocks or fails the search itself.
function logFailedSearch(query: string, departmentId?: string, propertyId?: string): void {
    supabase.auth.getUser()
        .then(({ data }) => supabase.from('search_logs').insert({
            user_id: data.user?.id || null,
            query,
            result_count: 0,
            department_id: toRealUuid(departmentId),
            property_id: toRealUuid(propertyId)
        }))
        .then(({ error }) => {
            if (error) console.warn('Failed to log search miss:', error.message)
        })
        .catch(() => { /* best-effort logging only */ })
}

export interface FailedSearchSummary {
    query: string
    count: number
    lastSearchedAt: string
}

export async function getFailedSearches(days = 30, limit = 20): Promise<FailedSearchSummary[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
        .from('search_logs')
        .select('query, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000)

    if (error) {
        console.warn('getFailedSearches error:', error.message)
        return []
    }

    const byQuery = new Map<string, FailedSearchSummary>()
    for (const row of data || []) {
        const key = row.query.trim().toLowerCase()
        if (!key) continue
        const existing = byQuery.get(key)
        if (existing) {
            existing.count += 1
        } else {
            byQuery.set(key, { query: row.query.trim(), count: 1, lastSearchedAt: row.created_at })
        }
    }

    return Array.from(byQuery.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
}

// Ranked full-text search path (used whenever a query string is present).
// Delegates ranking + filtering + pagination to search_knowledge_articles (RLS-respecting,
// SECURITY INVOKER RPC over documents.search_vector, which covers title/tags/folder/
// description/body content) then fetches the full joined article records for just that page.
async function searchArticlesRanked(
    filters: KnowledgeSearchFilters,
    page: number,
    pageSize: number
): Promise<KnowledgeSearchResult> {
    const expandedTerms = expandSearchQuery(filters.query!)
    const rpcQuery = expandedTerms.join(' OR ')
    const from = (page - 1) * pageSize

    const { data: ranked, error: rankError } = await supabase.rpc('search_knowledge_articles', {
        p_query: rpcQuery,
        p_content_type: filters.content_type || null,
        p_status: filters.status || null,
        p_department_id: toRealUuid(filters.department_id),
        p_property_id: toRealUuid(filters.property_id),
        p_requires_acknowledgment: filters.requires_acknowledgment ?? null,
        p_limit: pageSize,
        p_offset: from
    })

    if (rankError) {
        console.warn('Ranked search error:', rankError.message)
        return { articles: [], total: 0, page, page_size: pageSize }
    }

    const rankedRows = ranked || []
    const total = Number(rankedRows[0]?.total_count ?? 0)
    const rankedIds = rankedRows.map(r => r.id)

    if (rankedIds.length === 0) {
        if (page === 1) {
            logFailedSearch(filters.query!, filters.department_id, filters.property_id)
        }
        return { articles: [], total, page, page_size: pageSize }
    }

    const { data, error } = await supabase
        .from('documents')
        .select(ARTICLE_LIST_SELECT)
        .in('id', rankedIds)

    if (error) {
        console.warn('Articles fetch error:', error.message)
        return { articles: [], total: 0, page, page_size: pageSize }
    }

    // Re-apply relevance order (the .in() fetch does not preserve it)
    const byId = new Map((data || []).map(row => [row.id, row]))
    const ordered = rankedIds.map(id => byId.get(id)).filter((row): row is NonNullable<typeof row> => !!row)

    const hydrated = await hydratePublishedSnapshotsForList(ordered)

    return {
        articles: hydrated.map(formatArticle),
        total,
        page,
        page_size: pageSize
    }
}

export async function getArticles(
    filters: KnowledgeSearchFilters,
    page = 1,
    pageSize = 20
): Promise<KnowledgeSearchResult> {
    try {
        if (filters.query && filters.query.trim()) {
            return await searchArticlesRanked(filters, page, pageSize)
        }

        let query = supabase
            .from('documents')
            .select(ARTICLE_LIST_SELECT, { count: 'exact' })

        // Filter out deleted items
        query = query.eq('is_deleted', false)

        if (filters.content_type) {
            query = query.eq('content_type', filters.content_type)
        }
        if (filters.status) {
            query = query.eq('status', filters.status)
            if (filters.status === 'PUBLISHED') {
                query = query.eq('knowledge_base_status', 'indexed').eq('is_active_kb_version', true)
            }
        } else {
            // Default Knowledge Base view should only display indexed, active KB versions
            query = query.eq('status', 'PUBLISHED').eq('knowledge_base_status', 'indexed').eq('is_active_kb_version', true)
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
                category:categories!documents_category_id_fkey(id, name),
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
        const docIds = hydratedDocs.map(d => toStringValue(d.id)).filter(Boolean)
        const { data: acks } = await supabase
            .from('document_acknowledgments')
            .select('document_id, acknowledged_at')
            .eq('user_id', userId)
            .in('document_id', docIds)

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
    try {
        let query = supabase
            .from('document_categories')
            .select('*')
            .order('name')

        if (departmentId) {
            query = query.eq('department_id', departmentId)
        }

        const { data, error } = await query
        if (!error && data && data.length > 0) return data

        // Fallback to categories table if document_categories is empty or not found
        let fallbackQuery = supabase
            .from('categories')
            .select('*')
            .order('name')

        if (departmentId) {
            fallbackQuery = fallbackQuery.eq('department_id', departmentId)
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (!fallbackError && fallbackData) return fallbackData

        return data || []
    } catch {
        return []
    }
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
    const docId = toStringValue(data?.id)
    if (!docId) return data
    if (data.status === 'PUBLISHED') return data
    const versionNum = typeof data.current_version === 'number' ? data.current_version : undefined
    if (!versionNum) return data

    const { data: snapshot, error } = await supabase
        .from('document_versions')
        .select('version_number, file_url, change_summary')
        .eq('document_id', docId)
        .eq('version_number', versionNum)
        .maybeSingle()

    if (error || !snapshot) {
        return data
    }

    return {
        ...data,
        file_url: snapshot.file_url ?? (typeof data.file_url === 'string' ? data.file_url : undefined),
        current_version: snapshot.version_number ?? versionNum,
        updated_at: data.updated_at
    }
}

async function hydratePublishedSnapshotsForList(rows: RawKnowledgeArticle[]): Promise<RawKnowledgeArticle[]> {
    if (!rows.length) return rows
    const needsSnapshot = rows.filter(row =>
        Boolean(row?.id) &&
        row?.status !== 'PUBLISHED' &&
        typeof row?.current_version === 'number'
    )
    if (!needsSnapshot.length) return rows

    const docIds = Array.from(new Set(needsSnapshot.map(row => toStringValue(row.id)).filter(Boolean)))
    const versionNumbers = Array.from(new Set(needsSnapshot.map(row => Number(row.current_version)).filter(n => !isNaN(n))))

    if (!docIds.length || !versionNumbers.length) return rows

    const { data: snapshots, error } = await supabase
        .from('document_versions')
        .select('document_id, version_number, file_url, change_summary')
        .in('document_id', docIds)
        .in('version_number', versionNumbers)

    if (error || !snapshots) return rows

    const snapshotMap = new Map(
        snapshots.map(snapshot => [`${snapshot.document_id}:${snapshot.version_number}`, snapshot])
    )

    return rows.map(row => {
        const docId = toStringValue(row?.id)
        const versionNum = typeof row?.current_version === 'number' ? row.current_version : undefined
        if (!docId || row?.status === 'PUBLISHED' || !versionNum) return row
        const snapshot = snapshotMap.get(`${docId}:${versionNum}`)
        if (!snapshot) return row
        return {
            ...row,
            file_url: snapshot.file_url ?? (typeof row.file_url === 'string' ? row.file_url : undefined),
            current_version: snapshot.version_number ?? versionNum,
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

// ============================================================================
// EXPLICIT PUBLICATION & LIFECYCLE CONTROLS
// ============================================================================

export interface PublishToKBParams {
    documentId: string
    userId: string
    visibility?: string
    categoryId?: string
    departmentId?: string
    supersedesId?: string
}

/**
 * Explicitly publishes a document to the AI Knowledge Base via atomic RPC.
 * Automatically supersedes any previous active version if applicable.
 */
export async function publishDocumentToKnowledgeBase(params: PublishToKBParams): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('publish_document_to_kb', {
            p_document_id: params.documentId,
            p_user_id: params.userId,
            p_visibility: params.visibility || null,
            p_category_id: params.categoryId || null,
            p_department_id: params.departmentId || null,
            p_supersedes_id: params.supersedesId || null,
        })

        if (error) {
            console.error('publish_document_to_kb RPC error:', error.message)
            return { success: false, error: error.message }
        }

        const result = data as { success: boolean; error?: string }
        return result
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { success: false, error: message }
    }
}

/**
 * Explicitly removes a document from the AI Knowledge Base.
 * Immediately revokes active indexing and vector/RAG retrieval.
 */
export async function removeDocumentFromKnowledgeBase(
    documentId: string,
    userId: string,
    reason = 'Removed by administrator'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('remove_document_from_kb', {
            p_document_id: documentId,
            p_user_id: userId,
            p_reason: reason,
        })

        if (error) {
            console.error('remove_document_from_kb RPC error:', error.message)
            return { success: false, error: error.message }
        }

        const result = data as { success: boolean; error?: string }
        return result
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { success: false, error: message }
    }
}

/**
 * Sets a document to Internal Only / Approved without AI Knowledge Base inclusion.
 */
export async function setDocumentInternal(
    documentId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('set_document_internal', {
            p_document_id: documentId,
            p_user_id: userId,
        })

        if (error) {
            console.error('set_document_internal RPC error:', error.message)
            return { success: false, error: error.message }
        }

        const result = data as { success: boolean; error?: string }
        return result
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return { success: false, error: message }
    }
}

