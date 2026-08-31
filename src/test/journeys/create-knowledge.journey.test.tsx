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

import * as knowledgeService from '@/services/knowledgeService'

describe('journey: create-knowledge', () => {
    it('exposes the publish-to-knowledge-base action the editor calls on save', () => {
        expect(typeof knowledgeService.publishDocumentToKnowledgeBase).toBe('function')
        expect(typeof knowledgeService.removeDocumentFromKnowledgeBase).toBe('function')
        expect(typeof knowledgeService.setDocumentInternal).toBe('function')
    })

    it.todo('editor renders title, body (TipTap) and category fields')
    it.todo('Image and Video toolbar buttons insert media registered in the media library')
    it.todo('Save as draft persists without publishing')
    it.todo('Publish transitions status to PUBLISHED and the article appears in /knowledge')
    it.todo('a linked quiz can be attached and shows on the published article')
    it.todo('required-reading flag surfaces the article in learners’ assigned list')
})
