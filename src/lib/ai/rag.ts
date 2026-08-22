import { supabase } from '@/lib/supabase'

export interface ArticleSource {
  id: string
  title: string
  content_type?: string
  snippet?: string
  url: string
  similarity?: number
}

export interface RAGSearchOptions {
  limit?: number
  propertyId?: string | null
  departmentId?: string | null
  contentType?: string
}

/**
 * Clean & extract salient search keywords from a user prompt
 */
export function extractSearchKeywords(query: string): string[] {
  if (!query) return []

  // Remove common question fluff words
  const stopWords = new Set([
    'what', 'is', 'the', 'our', 'for', 'in', 'to', 'how', 'do', 'we', 'can',
    'you', 'tell', 'me', 'about', 'a', 'an', 'and', 'or', 'of', 'at', 'by',
    'from', 'with', 'please', 'explain', 'give', 'show', 'need', 'i', 'my',
    'ما', 'هو', 'هي', 'كيف', 'ماذا', 'في', 'من', 'إلى', 'على', 'عن', 'مع',
    'هل', 'تم', 'هذا', 'هذه', 'لنا', 'لنا', 'اريد', 'أريد', 'اشرح', 'وضح',
  ])

  return query
    .toLowerCase()
    .replace(/[?!.,;:()[\]{}"'،؟؛/\\-]/g, ' ')
    .replace(/[^\w\s\u0621-\u064A]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word))
    .slice(0, 8)
}

/**
 * Searches the published knowledge base using PostgreSQL full-text search
 * with RLS respect and property/department scoping.
 */
export async function searchHotelKnowledge(
  query: string,
  options: RAGSearchOptions = {}
): Promise<ArticleSource[]> {
  const { limit = 4, propertyId, departmentId, contentType } = options
  const terms = extractSearchKeywords(query)

  if (terms.length === 0) return []

  const tsQuery = terms.join(' OR ')

  try {
    const { data: ranked, error: rankError } = await supabase.rpc('search_knowledge_articles', {
      p_query: tsQuery,
      p_content_type: contentType || null,
      p_status: 'PUBLISHED',
      p_department_id: departmentId || null,
      p_property_id: propertyId || null,
      p_limit: limit,
      p_offset: 0,
    })

    if (rankError) {
      console.warn('RAG search RPC error:', rankError.message)
      return []
    }

    const rankedRows = ranked || []
    if (rankedRows.length === 0) return []

    const articleIds = rankedRows.map((r: { id: string }) => r.id)

    // Fetch titles and content snippets
    const { data: articles, error: docsError } = await supabase
      .from('documents')
      .select('id, title, content_type, description, content')
      .in('id', articleIds)

    if (docsError || !articles) {
      return rankedRows.map((r: { id: string; title?: string }) => ({
        id: r.id,
        title: r.title || 'Hotel Standard Operating Procedure',
        url: `/knowledge/${r.id}`,
      }))
    }

    return articles.map((doc) => {
      const cleanSnippet = (doc.description || doc.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 350)
        .trim()

      return {
        id: doc.id,
        title: doc.title,
        content_type: doc.content_type || 'SOP',
        snippet: cleanSnippet ? `${cleanSnippet}...` : undefined,
        url: `/knowledge/${doc.id}`,
      }
    })
  } catch (err) {
    console.error('searchHotelKnowledge exception:', err)
    return []
  }
}

/**
 * Builds grounded context for the system prompt containing real SOP citations
 */
export function buildGroundedContext(query: string, sources: ArticleSource[]): string {
  if (!sources.length) return ''

  const contextBlocks = sources.map((src, index) => {
    return `[SOURCE ${index + 1}: "${src.title}" (ID: ${src.id})]
${src.snippet || 'Refer to full knowledge article for detailed procedures.'}`
  })

  return `
---
GROUNDED HOTEL KNOWLEDGE BASE (Use these verified Altus SOPs to answer the user query):
${contextBlocks.join('\n\n')}
---
Instructions for using sources:
1. When answering, cite the verified source numbers like [SOURCE 1] or [SOURCE 2] directly in your response.
2. Ground all procedures, timings, and standards strictly in the provided sources.
`
}

/**
 * Extracts citations from an LLM response and maps them to article source links
 */
export function extractCitations(responseText: string, sources: ArticleSource[]): ArticleSource[] {
  if (!responseText || !sources.length) return []

  const matchedSources = new Set<ArticleSource>()

  sources.forEach((src, idx) => {
    const sourceMarker = `[SOURCE ${idx + 1}`
    const idMarker = src.id

    if (
      responseText.includes(sourceMarker) ||
      responseText.includes(idMarker) ||
      responseText.includes(src.title)
    ) {
      matchedSources.add(src)
    }
  })

  return Array.from(matchedSources)
}
