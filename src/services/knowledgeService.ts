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
          visibility,
          property_id, department_id,
          requires_acknowledgment,
          created_by, updated_by,
          created_at, updated_at,
          current_version, published_version_number, last_published_at,
          estimated_read_time,
          view_count,
          author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
          last_editor:profiles!documents_updated_by_fkey(id, full_name, avatar_url),
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
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_updated_by_fkey(id, full_name, avatar_url),
                sop:sop_documents(linked_training_id, linked_quiz_id),
                document_department_access(department_id)
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
            .select(`
                id, title, description,
                status, content_type,
                created_by, updated_by,
                current_version, published_version_number, last_published_at,
                created_at, updated_at,
                estimated_read_time, view_count,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_updated_by_fkey(id, full_name, avatar_url),
                department:departments(id, name),
                category:categories(id, name)
            `)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getFeaturedArticles error:', error.message)
            return []
        }
        const hydrated = await hydratePublishedSnapshotsForList(data || [])
        return hydrated.map(formatArticle)
    } catch (e) {
        console.error('getFeaturedArticles exception:', e)
        return []
    }
}

export async function getRecentArticles(limit = 10): Promise<KnowledgeArticle[]> {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                id, title, description,
                status, content_type,
                created_by, updated_by,
                current_version, published_version_number, last_published_at,
                created_at, updated_at,
                estimated_read_time, view_count,
                author:profiles!documents_created_by_fkey(id, full_name, avatar_url),
                last_editor:profiles!documents_updated_by_fkey(id, full_name, avatar_url),
                department:departments(id, name),
                category:categories(id, name)
            `)
            .eq('status', 'PUBLISHED')
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.warn('getRecentArticles error:', error.message)
            return []
        }
        const hydrated = await hydratePublishedSnapshotsForList(data || [])
        return hydrated.map(formatArticle)
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
// CONTEXTUAL HELP - Real Implementation
// ============================================================================

export async function getContextualHelp(triggerType: string, triggerValue: string): Promise<ContextualHelp[]> {
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

    // Search for relevant documents
    const { data, error } = await supabase
        .from('documents')
        .select('id, title, description, content_type, status, current_version, published_version_number, last_published_at')
        .in('content_type', relevantTypes)
        .eq('status', 'PUBLISHED')
        .eq('is_deleted', false)
        .or(`title.ilike.%${triggerValue}%,description.ilike.%${triggerValue}%`)
        .order('view_count', { ascending: false })
        .limit(5)

    if (error || !data) {
        return []
    }

    const hydratedDocs = await hydratePublishedSnapshotsForList(data)

    return hydratedDocs.map(doc => ({
        document_id: doc.id,
        title: doc.title,
        description: doc.description,
        content_type: doc.content_type,
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
export async function voteComment(commentId: string, userId: string, voteType: 'up' | 'down'): Promise<void> {
    const { error } = await supabase
        .from('sop_comment_votes')
        .upsert({
            comment_id: commentId,
            user_id: userId,
            vote_type: voteType
        }, { onConflict: 'comment_id,user_id' })

    if (error) {
        console.error('Vote comment failed:', error)
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
        console.error('getFeedbackStats error:', error)
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
export async function getRecentFeedback(limit = 10): Promise<any[]> {
    const { data, error } = await supabase
        .from('document_feedback')
        .select(`
            *,
            document:documents(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('getRecentFeedback error:', error)
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
        console.error('getFeedbackTrends error:', error)
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

export async function getContentTypeCounts(): Promise<Record<string, number>> {
    try {
        // Count all visible, non-deleted documents (status can vary by role and RLS).
        const { data, error } = await supabase
            .from('documents')
            .select('content_type')
            .eq('is_deleted', false)

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
                    current_version,
                    published_version_number,
                    last_published_at
                )
            `)
            .eq('source_document_id', documentId)
            .order('relevance_score', { ascending: false })
            .limit(6)

        if (error) {
            console.warn('getRelatedArticles error:', error.message)
            return []
        }

        const relatedDocs = (data || []).map(d => d.related_document).filter(Boolean) as any[]
        const hydratedDocs = await hydratePublishedSnapshotsForList(relatedDocs)
        const docMap = new Map(hydratedDocs.map(doc => [doc.id, doc]))

        return (data || []).map(d => {
            const doc = docMap.get(d.related_document_id) || (d.related_document as any) || {}
            return {
                id: doc.id || d.related_document_id,
                title: doc.title || 'Untitled',
                content_type: (doc.content_type?.toLowerCase() as any) || 'document',
                relation_type: 'automated',
                score: d.relevance_score
            }
        })
    } catch (e) {
        console.error('getRelatedArticles exception:', e)
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
        console.error('Failed to track related click:', e)
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
        console.error('Failed to track related impressions:', e)
    }
}

// ============================================================================
// HELPERS
// ============================================================================

async function hydratePublishedSnapshotIfNeeded(data: any): Promise<any> {
    if (!data?.id) return data
    if (data.status === 'PUBLISHED') return data
    if (!data.published_version_number) return data

    const { data: snapshot, error } = await supabase
        .from('document_versions')
        .select('version_number, title, description, content, file_url, status')
        .eq('document_id', data.id)
        .eq('version_number', data.published_version_number)
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
        updated_at: data.last_published_at || data.updated_at
    }
}

async function hydratePublishedSnapshotsForList(rows: any[]): Promise<any[]> {
    if (!rows.length) return rows
    const needsSnapshot = rows.filter(row =>
        row?.id &&
        row?.status !== 'PUBLISHED' &&
        row?.published_version_number
    )
    if (!needsSnapshot.length) return rows

    const docIds = Array.from(new Set(needsSnapshot.map(row => row.id)))
    const versionNumbers = Array.from(new Set(needsSnapshot.map(row => row.published_version_number)))

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
        if (!row?.id || row?.status === 'PUBLISHED' || !row?.published_version_number) return row
        const snapshot = snapshotMap.get(`${row.id}:${row.published_version_number}`)
        if (!snapshot) return row
        return {
            ...row,
            title: snapshot.title ?? row.title,
            description: snapshot.description ?? row.description,
            content: snapshot.content ?? row.content,
            file_url: snapshot.file_url ?? row.file_url,
            status: snapshot.status || row.status || 'PUBLISHED',
            current_version: snapshot.version_number ?? row.current_version,
            updated_at: row.last_published_at || row.updated_at
        }
    })
}

function computeReadMinutes(content?: string | null): number | undefined {
    if (!content) return undefined
    const stripped = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!stripped) return undefined
    return Math.max(1, Math.round(stripped.split(' ').length / 200))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatArticle(data: any): KnowledgeArticle {
    // Handle polymorphic/linked SOP data if present from join
    const sopData = Array.isArray(data.sop) ? data.sop[0] : data.sop
    const department = Array.isArray(data.department) ? data.department[0] : data.department
    const category = Array.isArray(data.category) ? data.category[0] : data.category
    const author = Array.isArray(data.author) ? data.author[0] : data.author
    const lastEditor = Array.isArray(data.last_editor) ? data.last_editor[0] : data.last_editor

    return {
        ...data,
        content_type: (data.content_type?.toLowerCase() as any) || 'document',
        visibility_scope: (data.visibility_scope || data.visibility || 'all_properties') as any,
        linked_training_id: data.linked_training_id || sopData?.linked_training_id,
        linked_quiz_id: data.linked_quiz_id || sopData?.linked_quiz_id,
        department: department || (data.department_id ? { id: data.department_id, name: 'Department' } : undefined),
        category: category || (data.category_id ? { id: data.category_id, name: 'Category' } : undefined),
        version: data.current_version || data.version || 1,
        current_version: data.current_version || data.version || 1,
        published_version_number: data.published_version_number ?? null,
        last_published_at: data.last_published_at ?? null,
        estimated_read_time: data.estimated_read_time || computeReadMinutes(data.content),
        updated_by: data.updated_by ?? null,
        author: author
            ? {
                id: author.id,
                full_name: author.full_name || 'System admin',
                avatar_url: author.avatar_url || undefined
            }
            : undefined,
        last_editor: lastEditor
            ? {
                id: lastEditor.id,
                full_name: lastEditor.full_name || 'System admin',
                avatar_url: lastEditor.avatar_url || undefined
            }
            : undefined,
        tags: [],
        department_access_ids: Array.isArray(data.document_department_access)
            ? data.document_department_access.map((d: any) => d.department_id)
            : []
    }
}
