import { supabase } from '@/lib/supabase'
import type { SystemWikiArticle, SystemWikiSubtopic } from '@/lib/types'
import type { Database, Json } from '@/types/database.generated'

function formatWikiArticle(row: Database['public']['Tables']['system_wiki']['Row']): SystemWikiArticle {
    const subtopics = Array.isArray(row.subtopics)
        ? (row.subtopics as unknown as SystemWikiSubtopic[])
        : []

    return {
        id: row.id,
        slug: row.slug,
        title_en: row.title_en,
        title_ar: row.title_ar,
        content_en: row.content_en ?? '',
        content_ar: row.content_ar ?? '',
        subtopics,
        allowed_roles: row.allowed_roles ?? [],
        order_index: row.order_index ?? 0,
        is_active: row.is_active ?? true,
        updated_at: row.updated_at ?? new Date().toISOString()
    }
}

/**
 * Fetches all active wiki articles ordered by order_index.
 */
export async function getWikiArticles(): Promise<SystemWikiArticle[]> {
    const { data, error } = await supabase
        .from('system_wiki')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

    if (error || !data) {
        if (error) console.error('Error fetching wiki articles:', error)
        return []
    }

    return data.map(formatWikiArticle)
}

/**
 * Fetches a single wiki article by its slug.
 */
export async function getWikiBySlug(slug: string): Promise<SystemWikiArticle | null> {
    const { data, error } = await supabase
        .from('system_wiki')
        .select('*')
        .eq('slug', slug)
        .single()

    if (error || !data) {
        if (error && error.code !== 'PGRST116') { // Not found error code
            console.error(`Error fetching wiki for slug ${slug}:`, error)
        }
        return null
    }

    return formatWikiArticle(data)
}

/**
 * Updates or creates a wiki article.
 */
export async function upsertWikiArticle(
    article: Partial<SystemWikiArticle> & { slug: string }
): Promise<{ data: SystemWikiArticle | null; error: Error | null }> {
    const { subtopics, ...rest } = article
    const payload: Database['public']['Tables']['system_wiki']['Insert'] = {
        ...rest,
        title_en: article.title_en ?? '',
        title_ar: article.title_ar ?? '',
        subtopics: subtopics ? (subtopics as unknown as Json) : undefined,
        updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
        .from('system_wiki')
        .upsert(payload)
        .select()
        .single()

    if (error || !data) {
        return { data: null, error: error ? new Error(error.message) : null }
    }

    return { data: formatWikiArticle(data), error: null }
}

/**
 * Deletes a wiki article by id.
 */
export async function deleteWikiArticle(id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('system_wiki')
        .delete()
        .eq('id', id)

    return { error: error ? new Error(error.message) : null }
}
