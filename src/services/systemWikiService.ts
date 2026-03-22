import { supabase } from '@/lib/supabase'
import type { SystemWikiArticle } from '@/lib/types'

/**
 * Fetches all active wiki articles ordered by order_index.
 */
export async function getWikiArticles(): Promise<SystemWikiArticle[]> {
    const { data, error } = await supabase
        .from('system_wiki')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

    if (error) {
        console.error('Error fetching wiki articles:', error)
        return []
    }

    return data || []
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

    if (error) {
        if (error.code !== 'PGRST116') { // Not found error code
            console.error(`Error fetching wiki for slug ${slug}:`, error)
        }
        return null
    }

    return data
}

/**
 * Updates or creates a wiki article.
 */
export async function upsertWikiArticle(article: Partial<SystemWikiArticle> & { slug: string }): Promise<{ data: SystemWikiArticle | null; error }> {
    const { data, error } = await supabase
        .from('system_wiki')
        .upsert({
            ...article,
            updated_at: new Date().toISOString()
        })
        .select()
        .single()

    return { data, error }
}

/**
 * Deletes a wiki article by id.
 */
export async function deleteWikiArticle(id: string): Promise<{ error }> {
    const { error } = await supabase
        .from('system_wiki')
        .delete()
        .eq('id', id)

    return { error }
}
