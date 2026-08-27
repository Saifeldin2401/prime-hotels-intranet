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
 * Clean & extract salient search keywords from a user prompt with hotel domain decompounding
 */
export function extractSearchKeywords(query: string): string[] {
  if (!query) return []

  // Remove common question fluff words
  const stopWords = new Set([
    'what', 'is', 'the', 'our', 'for', 'in', 'to', 'how', 'do', 'we', 'can',
    'you', 'tell', 'me', 'about', 'a', 'an', 'and', 'or', 'of', 'at', 'by',
    'from', 'with', 'please', 'explain', 'give', 'show', 'need', 'i', 'my',
    'ما', 'هو', 'هي', 'كيف', 'ماذا', 'في', 'من', 'إلى', 'على', 'عن', 'مع',
    'هل', 'تم', 'هذا', 'هذه', 'لنا', 'اريد', 'أريد', 'اشرح', 'وضح',
  ])

  const rawTokens = query
    .toLowerCase()
    .replace(/[?!.,;:()[\]{}"'،؟؛/\\-]/g, ' ')
    .replace(/[^\w\s\u0621-\u064A]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word))

  const expandedTokens = new Set<string>()

  // Domain decompounding dictionary for common hotel search terms
  const compoundMap: Record<string, string[]> = {
    frontoffice: ['front', 'office', 'reception', 'desk', 'arrival'],
    frontdesk: ['front', 'desk', 'reception', 'arrival'],
    housekeeping: ['housekeeping', 'house', 'keeping', 'cleaning', 'linen', 'inventory'],
    roomservice: ['room', 'service', 'dining', 'order'],
    lostandfound: ['lost', 'found', 'valuables', 'belongings'],
    checkin: ['check', 'in', 'arrival', 'registration'],
    checkout: ['check', 'out', 'departure', 'settlement'],
    foodbeverage: ['food', 'beverage', 'restaurant', 'banquet', 'kitchen'],
    fb: ['food', 'beverage', 'service', 'dining'],
    hk: ['housekeeping', 'cleaning', 'room'],
    fo: ['front', 'office', 'reception'],
    dyafa: ['dyafa', 'hospitality', 'service', 'welcoming', 'guest'],
    ضيافة: ['ضيافة', 'استقبال', 'خدمة', 'نزلاء'],
    استقبال: ['استقبال', 'مكتب', 'وصول', 'تسجيل'],
  }

  for (const token of rawTokens) {
    expandedTokens.add(token)
    if (compoundMap[token]) {
      compoundMap[token].forEach(w => expandedTokens.add(w))
    }
  }

  return Array.from(expandedTokens).slice(0, 10)
}

/**
 * Searches the published knowledge base using PostgreSQL full-text search
 * with RLS respect and fallback fuzzy matching.
 */
export async function searchHotelKnowledge(
  query: string,
  options: RAGSearchOptions = {}
): Promise<ArticleSource[]> {
  const { limit = 5, propertyId, departmentId, contentType } = options
  const terms = extractSearchKeywords(query)

  if (terms.length === 0 && !query.trim()) return []

  const searchWords = terms.length > 0 ? terms : [query.trim().toLowerCase()]
  const tsQuery = searchWords.join(' OR ')

  try {
    // Stage 1: Full-Text Search RPC
    const { data: ranked, error: rankError } = await supabase.rpc('search_knowledge_articles', {
      p_query: tsQuery,
      p_content_type: contentType || null,
      p_status: 'PUBLISHED',
      p_department_id: departmentId || null,
      p_property_id: propertyId || null,
      p_limit: limit,
      p_offset: 0,
    })

    if (!rankError && ranked && ranked.length > 0) {
      const articleIds = ranked.map((r: { id: string }) => r.id)

      const { data: articles } = await supabase
        .from('documents')
        .select('id, title, content_type, description, content, knowledge_base_status, is_active_kb_version, status')
        .in('id', articleIds)
        .eq('status', 'PUBLISHED')
        .eq('knowledge_base_status', 'indexed')
        .eq('is_active_kb_version', true)

      if (articles && articles.length > 0) {
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
      }
    }

    // Stage 2: Secondary Fuzzy/Partial ILIKE fallback across indexed published documents
    let fuzzyQuery = supabase
      .from('documents')
      .select('id, title, content_type, description, content')
      .eq('status', 'PUBLISHED')
      .eq('knowledge_base_status', 'indexed')
      .eq('is_active_kb_version', true)

    if (propertyId) {
      fuzzyQuery = fuzzyQuery.or(`property_id.eq.${propertyId},property_id.is.null`)
    }

    // Build ILIKE filters for each search word
    const orConditions = searchWords
      .map(w => `title.ilike.%${w}%,description.ilike.%${w}%,content.ilike.%${w}%`)
      .join(',')

    const { data: fallbackDocs } = await fuzzyQuery.or(orConditions).limit(limit)

    if (fallbackDocs && fallbackDocs.length > 0) {
      return fallbackDocs.map((doc) => {
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
    }

    // Stage 3: General top published documents if no exact match (for grounding suggestions)
    const { data: topDocs } = await supabase
      .from('documents')
      .select('id, title, content_type, description, content')
      .eq('status', 'PUBLISHED')
      .eq('knowledge_base_status', 'indexed')
      .eq('is_active_kb_version', true)
      .limit(3)

    return (topDocs || []).map((doc) => {
      const cleanSnippet = (doc.description || doc.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 250)
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
