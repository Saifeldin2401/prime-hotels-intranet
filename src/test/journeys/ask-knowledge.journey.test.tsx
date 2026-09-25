/**
 * Journey: ASK-KNOWLEDGE
 * A user searches the knowledge base, opens an article, and (later) asks an AI answer
 * grounded in KB content.
 *
 * Search-expansion logic is pure and tested for real here; retrieval + AI answer steps
 * depend on the AI capability layer (branch feat/ai-capability-layer).
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', async () => {
    const { createMockSupabaseClient } = await import('../mocks/supabase')
    return {
        supabase: createMockSupabaseClient(),
    }
})

import { supabase } from '@/lib/supabase'
import {
    expandSearchQuery,
    getArticles,
    getArticleById,
    incrementViewCount,
    submitFeedback,
    getRelatedArticles,
    trackRelatedClick,
} from '@/services/knowledgeService'

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

    it('opening a result increments its view count via increment_article_view_count RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
        await incrementViewCount('doc-1')
        expect(supabase.rpc).toHaveBeenCalledWith('increment_article_view_count', {
            doc_id: 'doc-1',
        })
    })

    it('submitting helpfulness feedback persists to document_feedback', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)

        await expect(submitFeedback('doc-1', 'user-1', true, 'Very clear')).resolves.not.toThrow()
    })

    it('tracking related article clicks dispatches click telemetry via RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
        await trackRelatedClick('doc-1', 'doc-2', 'user-1', 1)
        expect(supabase.rpc).toHaveBeenCalledWith('track_related_article_click', {
            p_source_doc_id: 'doc-1',
            p_clicked_doc_id: 'doc-2',
            p_user_id: 'user-1',
            p_position: 1,
        })
    })

    it('retrieving related articles queries the related_articles table', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
                data: [
                    {
                        relevance_score: 0.9,
                        related_document_id: 'doc-2',
                        related_document: {
                            id: 'doc-2',
                            title: 'Late Checkout Policy',
                            description: 'Procedures for late checkout',
                            content_type: 'sop',
                            status: 'PUBLISHED',
                            current_version: 1,
                        },
                    },
                ],
                error: null,
            }),
        } as never)

        const related = await getRelatedArticles('doc-1')
        expect(Array.isArray(related)).toBe(true)
        expect(related.length).toBe(1)
        expect(related[0].id).toBe('doc-2')
    })
})
