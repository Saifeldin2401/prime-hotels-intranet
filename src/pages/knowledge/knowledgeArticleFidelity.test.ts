import { describe, expect, it } from 'vitest'

import type { GeneratedKnowledgeArticle } from '@/lib/ai/agents/knowledgeBase/types'
import {
    applyVisualAssetToContent,
    decodeVisualAssetMarkup,
    emptyKnowledgeArticleMeta,
    generatedArticleToFormPatch,
    mapGeneratedChecklistItems,
    mapGeneratedFaqItems,
    normalizeVisualAsset,
    readKnowledgeMeta,
    writeKnowledgeMeta,
} from './knowledgeArticleFidelity'

const baseArticle = (): GeneratedKnowledgeArticle => ({
    title: 'VIP Arrival Protocol',
    title_ar: 'بروتوكول وصول كبار الشخصيات',
    description: 'Fast, personalised VIP arrival',
    description_ar: 'وصول سريع وشخصي لكبار الشخصيات',
    summary: 'Two sentence summary.',
    summary_ar: 'ملخص من جملتين.',
    content_html: '<h1>VIP Arrival</h1><p>Body</p>',
    content_html_ar: '<h1>وصول</h1><p>المحتوى</p>',
    content_type: 'sop',
    sop_code: 'FO-SOP-014',
    estimated_read_time_minutes: 7,
    suggested_tags: ['vip', 'front-office'],
    checklist_items: [
        { id: 'c1', text: 'Check PMS profile', text_ar: 'تحقق من الملف', required: true },
        { id: 'c2', text: 'Inspect suite', text_ar: 'افحص الجناح', required: false },
    ],
    faq_items: [
        { id: 'f1', question: 'What if late?', question_ar: 'ماذا لو تأخر؟', answer: 'Notify butler', answer_ar: 'أبلغ الخادم' },
    ],
    critical_control_points: ['Verify identity before key handover', '  ', 'Log arrival time'],
    service_benchmarks: ['Greet within 15 seconds'],
    contingency_protocols: ['If PMS offline, use manual arrival log'],
    visual_asset: {
        id: 'v1',
        image_url: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
        alt_text: 'Flow diagram',
        caption: 'VIP arrival flow',
        caption_ar: 'مخطط الوصول',
        provider: 'recraft',
        model: 'recraft-vector',
    } as unknown as GeneratedKnowledgeArticle['visual_asset'],
    compliance_score: 92,
    compliance_notes: ['Aligns with MoT standards', 'Add Balady reference'],
    models_used: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5'],
    model_used: 'google/gemini-2.5-flash',
    provider_used: 'openrouter',
    cost_tier: 'low_cost',
    total_duration_ms: 43120,
})

describe('generatedArticleToFormPatch', () => {
    it('maps every field of a rich generated article', () => {
        const patch = generatedArticleToFormPatch(baseArticle(), '2026-08-30T00:00:00.000Z')

        expect(patch.title).toBe('VIP Arrival Protocol')
        expect(patch.title_ar).toBe('بروتوكول وصول كبار الشخصيات')
        expect(patch.description_ar).toBe('وصول سريع وشخصي لكبار الشخصيات')
        expect(patch.summary_ar).toBe('ملخص من جملتين.')
        expect(patch.content_ar).toContain('المحتوى')
        expect(patch.content_type).toBe('sop')
        expect(patch.sop_code).toBe('FO-SOP-014')
        expect(patch.estimated_read_time).toBe(7)
        expect(patch.ai_tags).toEqual(['vip', 'front-office'])

        // checklist / faq mapped to editor shape
        expect(patch.checklist_items).toHaveLength(2)
        expect(patch.checklist_items[0]).toMatchObject({ text: 'Check PMS profile', text_ar: 'تحقق من الملف', is_required: true, order: 0 })
        expect(patch.faq_items[0]).toMatchObject({ question: 'What if late?', answer: 'Notify butler', order: 0 })

        // meta
        expect(patch.meta.critical_control_points).toEqual(['Verify identity before key handover', 'Log arrival time'])
        expect(patch.meta.service_benchmarks).toEqual(['Greet within 15 seconds'])
        expect(patch.meta.contingency_protocols).toEqual(['If PMS offline, use manual arrival log'])
        expect(patch.meta.ai_compliance_score).toBe(92)
        expect(patch.meta.ai_compliance_notes).toEqual(['Aligns with MoT standards', 'Add Balady reference'])
        expect(patch.meta.ai_compliance_checked_at).toBe('2026-08-30T00:00:00.000Z')
        expect(patch.meta.ai_models_used).toEqual(['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5'])
        expect(patch.meta.ai_provider_used).toBe('openrouter')
        expect(patch.meta.ai_cost_tier).toBe('low_cost')
        expect(patch.meta.ai_total_duration_ms).toBe(43120)
        expect(patch.meta.visual_asset).toMatchObject({ caption: 'VIP arrival flow', caption_ar: 'مخطط الوصول', model: 'recraft-vector' })
    })

    it('inlines the visual asset into English and Arabic content once', () => {
        const patch = generatedArticleToFormPatch(baseArticle(), '2026-08-30T00:00:00.000Z')
        expect(patch.content).toContain('ai-schematic-card')
        expect(patch.content).toContain('<svg')
        expect(patch.content_ar).toContain('ai-schematic-card')
        // caption localisation
        expect(patch.content_ar).toContain('مخطط الوصول')

        // re-applying does not double-embed
        const again = applyVisualAssetToContent(patch.content, patch.meta.visual_asset)
        expect(again).toBe(patch.content)
    })

    it('is backwards compatible with a minimal article (no AR / no meta)', () => {
        const minimal: GeneratedKnowledgeArticle = {
            ...baseArticle(),
            title_ar: '',
            description_ar: '',
            summary_ar: '',
            content_html_ar: '',
            sop_code: undefined,
            critical_control_points: undefined,
            service_benchmarks: undefined,
            contingency_protocols: undefined,
            visual_asset: undefined,
            compliance_notes: [],
        }
        const patch = generatedArticleToFormPatch(minimal, '2026-08-30T00:00:00.000Z')
        expect(patch.title_ar).toBe('')
        expect(patch.content_ar).toBe('')
        expect(patch.sop_code).toBe('')
        expect(patch.meta.critical_control_points).toEqual([])
        expect(patch.meta.visual_asset).toBeNull()
    })
})

describe('content_data round-trip', () => {
    it('writes then reads the meta losslessly and preserves foreign keys', () => {
        const patch = generatedArticleToFormPatch(baseArticle(), '2026-08-30T00:00:00.000Z')
        const stored = writeKnowledgeMeta({ block_type: 'text', existing: 42 } as never, patch.meta)

        expect(stored).toBeTruthy()
        expect((stored as Record<string, unknown>).block_type).toBe('text')
        expect((stored as Record<string, unknown>).existing).toBe(42)

        const readBack = readKnowledgeMeta(stored)
        expect(readBack.critical_control_points).toEqual(patch.meta.critical_control_points)
        expect(readBack.service_benchmarks).toEqual(patch.meta.service_benchmarks)
        expect(readBack.contingency_protocols).toEqual(patch.meta.contingency_protocols)
        expect(readBack.ai_compliance_score).toBe(92)
        expect(readBack.ai_compliance_notes).toEqual(patch.meta.ai_compliance_notes)
        expect(readBack.visual_asset).toMatchObject({ model: 'recraft-vector' })
    })

    it('returns null / empty meta when there is nothing to store', () => {
        expect(writeKnowledgeMeta(null, emptyKnowledgeArticleMeta())).toBeNull()
        expect(writeKnowledgeMeta({ block_type: 'x' } as never, emptyKnowledgeArticleMeta())).toEqual({ block_type: 'x' })
        expect(readKnowledgeMeta(null)).toEqual(emptyKnowledgeArticleMeta())
        expect(readKnowledgeMeta({ foo: 1 } as never)).toEqual(emptyKnowledgeArticleMeta())
    })

    it('drops the meta key but keeps siblings when meta is cleared', () => {
        const stored = writeKnowledgeMeta(
            { keep: true, knowledge_meta: { service_benchmarks: ['old'] } } as never,
            emptyKnowledgeArticleMeta(),
        )
        expect(stored).toEqual({ keep: true })
    })
})

describe('visual asset helpers', () => {
    it('handles raw svg, data-uri svg and raster urls', () => {
        expect(decodeVisualAssetMarkup('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'x')).toContain('<svg')

        const encoded = 'data:image/svg+xml,' + encodeURIComponent('<svg>hi</svg>')
        expect(decodeVisualAssetMarkup(encoded, 'x')).toBe('<svg>hi</svg>')

        const b64 = 'data:image/svg+xml;base64,' + btoa('<svg>b64</svg>')
        expect(decodeVisualAssetMarkup(b64, 'x')).toBe('<svg>b64</svg>')

        const raster = decodeVisualAssetMarkup('https://cdn.example.com/a.png', 'Alt "quote"')
        expect(raster).toContain('<img src="https://cdn.example.com/a.png"')
        expect(raster).toContain('&quot;')
    })

    it('normalizeVisualAsset rejects assets without an image url', () => {
        expect(normalizeVisualAsset(null)).toBeNull()
        expect(normalizeVisualAsset({ caption: 'x' })).toBeNull()
        expect(normalizeVisualAsset({ image_url: '  ' })).toBeNull()
        expect(normalizeVisualAsset({ image_url: 'u', caption: 'c' })).toMatchObject({ image_url: 'u', caption: 'c', model: null })
    })
})

describe('checklist / faq mapping', () => {
    it('tolerates undefined and missing fields', () => {
        expect(mapGeneratedChecklistItems(undefined)).toEqual([])
        expect(mapGeneratedFaqItems(undefined)).toEqual([])
        const [item] = mapGeneratedChecklistItems([{ id: '', text: 'x' } as never])
        expect(item).toMatchObject({ text: 'x', text_ar: '', is_required: false, order: 0 })
        expect(item.id).toBeTruthy()
    })
})
