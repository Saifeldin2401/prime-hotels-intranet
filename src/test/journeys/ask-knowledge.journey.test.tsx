/**
 * Journey: ASK-KNOWLEDGE
 * A user searches the knowledge base, opens an article, and (later) asks an AI answer
 * grounded in KB content.
 *
 * Search-expansion logic is pure and tested for real here; retrieval + AI answer steps
 * depend on the AI capability layer (branch feat/ai-capability-layer).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
    supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
}))

import { expandSearchQuery, getArticles, getArticleById } from '@/services/knowledgeService'

describe('journey: ask-knowledge', () => {
    it('expands a query into synonym/variant terms for recall', () => {
        const terms = expandSearchQuery('check in')
        expect(Array.isArray(terms)).toBe(true)
        expect(terms.length).toBeGreaterThan(0)
        expect(terms).toContain('check in')
    })

    it('exposes list + detail retrieval the search UI depends on', () => {
        expect(typeof getArticles).toBe('function')
        expect(typeof getArticleById).toBe('function')
    })

    it.todo('search box returns ranked results with matched-term highlighting')
    it.todo('a zero-result search is recorded as a failed search for content-gap analysis')
    it.todo('opening a result increments its view count and shows related articles')
    it.todo('“Ask AI” returns an answer with citations linking back to KB articles')
    it.todo('the AI answer refuses / defers when no KB source supports it')
})
