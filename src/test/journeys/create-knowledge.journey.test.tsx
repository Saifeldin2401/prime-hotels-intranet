/**
 * Journey: CREATE-KNOWLEDGE
 * An author drafts an article/SOP in the knowledge editor and publishes it to the KB.
 *
 * Backend contract smoke-tested here. UI steps that depend on the editor surface
 * consolidation (branch feat/kb-surface-consolidation) are marked it.todo.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
    supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
}))

import { supabase } from '@/lib/supabase'
import * as knowledgeService from '@/services/knowledgeService'

describe('journey: create-knowledge', () => {
    it('exposes the publish-to-knowledge-base action the editor calls on save', () => {
        expect(typeof knowledgeService.publishDocumentToKnowledgeBase).toBe('function')
        expect(typeof knowledgeService.removeDocumentFromKnowledgeBase).toBe('function')
        expect(typeof knowledgeService.setDocumentInternal).toBe('function')
    })

    it('publishDocumentToKnowledgeBase invokes the atomic publish_document_to_kb RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: { success: true, version: 2 },
            error: null,
        } as never)

        const res = await knowledgeService.publishDocumentToKnowledgeBase({
            documentId: 'doc-123',
            userId: 'user-456',
            visibility: 'all_properties',
        })

        expect(supabase.rpc).toHaveBeenCalledWith('publish_document_to_kb', expect.objectContaining({
            p_document_id: 'doc-123',
            p_user_id: 'user-456',
            p_visibility: 'all_properties',
        }))
        expect(res.success).toBe(true)
    })

    it('removeDocumentFromKnowledgeBase invokes remove_document_from_kb RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: { success: true },
            error: null,
        } as never)

        const res = await knowledgeService.removeDocumentFromKnowledgeBase('doc-123', 'user-456')

        expect(supabase.rpc).toHaveBeenCalledWith('remove_document_from_kb', expect.objectContaining({
            p_document_id: 'doc-123',
            p_user_id: 'user-456',
        }))
        expect(res.success).toBe(true)
    })

    it('setDocumentInternal invokes set_document_internal RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: { success: true },
            error: null,
        } as never)

        const res = await knowledgeService.setDocumentInternal('doc-123', 'user-456')

        expect(supabase.rpc).toHaveBeenCalledWith('set_document_internal', expect.objectContaining({
            p_document_id: 'doc-123',
            p_user_id: 'user-456',
        }))
        expect(res.success).toBe(true)
    })

    it('acknowledgeArticle records user acknowledgment for required reading', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as never)

        await expect(knowledgeService.acknowledgeArticle('doc-123', 'user-456')).resolves.not.toThrow()
    })

    it('toggleBookmark toggles article bookmark for user', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'bm-1' }, error: null }),
            delete: vi.fn().mockReturnThis(),
        } as never)

        const bookmarked = await knowledgeService.toggleBookmark('doc-123', 'user-456')
        expect(bookmarked).toBe(false)
    })
})
