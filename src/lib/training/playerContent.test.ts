import { describe, expect, it } from 'vitest'

import {
    getAssignmentPrompt,
    getBlockComponentTag,
    getBlockLearningOutcomes,
    getCourseBlueprintOutcomes,
    getEffectiveBlockTranslation,
    getVisualAssetCaption,
    groupVisualAssetsByBlock,
    isBlockContentEmpty,
    normalizeVisualAssetSource,
    partitionVisualAssetsByPlacement,
    resolveBlockRenderer,
    resolvePersistedBlockTranslation,
    selectBlockVisualAssets,
} from '@/lib/training/playerContent'

const block = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 'b1',
        training_module_id: 'm1',
        type: 'text',
        title: null,
        content: '',
        content_url: null,
        content_data: null,
        order: 0,
        is_mandatory: true,
        created_at: '',
        ...overrides,
    }) as any

describe('resolveBlockRenderer', () => {
    it('maps plain builder types directly', () => {
        expect(resolveBlockRenderer(block({ type: 'video' }))).toBe('video')
        expect(resolveBlockRenderer(block({ type: 'audio' }))).toBe('audio')
        expect(resolveBlockRenderer(block({ type: 'document_link' }))).toBe('document_link')
        expect(resolveBlockRenderer(block({ type: 'sop_reference' }))).toBe('sop_reference')
        expect(resolveBlockRenderer(block({ type: 'text' }))).toBe('text')
    })

    it('treats AI lessons persisted as text but tagged assignment/roleplay as such', () => {
        expect(resolveBlockRenderer(block({ type: 'text', content_data: { is_assignment: true } }))).toBe('assignment')
        expect(resolveBlockRenderer(block({ type: 'text', content_data: { requires_submission: true } }))).toBe('assignment')
        expect(resolveBlockRenderer(block({ type: 'text', content_data: { interactive_type: 'roleplay' } }))).toBe('roleplay')
        expect(resolveBlockRenderer(block({ type: 'practical' }))).toBe('assignment')
    })

    it('quiz always wins and unknown types are flagged', () => {
        expect(resolveBlockRenderer(block({ type: 'quiz' }))).toBe('quiz')
        expect(resolveBlockRenderer(block({ type: 'mystery_meat' }))).toBe('unknown')
    })
})

describe('getBlockComponentTag', () => {
    it('detects tagged leading/trailing components and synonyms', () => {
        expect(getBlockComponentTag(block({ content_data: { component: 'objectives' } }))).toBe('objectives')
        expect(getBlockComponentTag(block({ content_data: { component: 'Learning_Objectives' } }))).toBe('objectives')
        expect(getBlockComponentTag(block({ content_data: { section: 'key_takeaways' } }))).toBe('summary')
        expect(getBlockComponentTag(block({ content_data: { componentKey: 'checkpoint' } }))).toBe('checkpoints')
        expect(getBlockComponentTag(block({ content_data: { component: 'explanation' } }))).toBeNull()
        expect(getBlockComponentTag(block())).toBeNull()
    })
})

describe('learning outcomes', () => {
    it('reads an array or a newline/bullet string from content_data', () => {
        expect(getBlockLearningOutcomes(block({ content_data: { learningOutcomes: ['A', 'B'] } }))).toEqual(['A', 'B'])
        expect(getBlockLearningOutcomes(block({ content_data: { learning_outcomes: '- One\n- Two' } }))).toEqual(['One', 'Two'])
        expect(getBlockLearningOutcomes(block())).toEqual([])
    })

    it('reads course blueprint objectives defensively', () => {
        expect(getCourseBlueprintOutcomes(undefined)).toEqual({
            terminalObjectives: [],
            enablingObjectives: [],
            summaryTakeaways: [],
        })
        expect(
            getCourseBlueprintOutcomes({ terminalObjectives: ['x'], summaryTakeaways: ['y', 'z'] })
        ).toEqual({ terminalObjectives: ['x'], enablingObjectives: [], summaryTakeaways: ['y', 'z'] })
    })
})

describe('bilingual resolution', () => {
    it('prefers on-the-fly translation, then persisted shapes', () => {
        const arBlock = block({ content_data: { renderedHtml_ar: '<p>مرحبا</p>' } })
        expect(getEffectiveBlockTranslation(arBlock, 'ar', '<p>live</p>')).toBe('<p>live</p>')
        expect(getEffectiveBlockTranslation(arBlock, 'ar', null)).toBe('<p>مرحبا</p>')
    })

    it('supports a translations map and a tagged translated_html', () => {
        expect(
            resolvePersistedBlockTranslation(block({ content_data: { translations: { fr: '<p>Bonjour</p>' } } }), 'fr')
        ).toBe('<p>Bonjour</p>')
        expect(
            resolvePersistedBlockTranslation(
                block({ content_data: { translated_html: '<p>Hola</p>', translation_lang: 'es' } }),
                'es'
            )
        ).toBe('<p>Hola</p>')
        expect(
            resolvePersistedBlockTranslation(
                block({ content_data: { translated_html: '<p>Hola</p>', translation_lang: 'es' } }),
                'ar'
            )
        ).toBeUndefined()
    })

    it('resolves a localised assignment prompt', () => {
        const a = block({ content: 'fallback', content_data: { instructions: 'Do the thing', instructions_ar: 'افعل' } })
        expect(getAssignmentPrompt(a, 'ar')).toEqual({ original: 'Do the thing', translated: 'افعل' })
        expect(getAssignmentPrompt(block({ content: 'fallback' }), null)).toEqual({ original: 'fallback' })
    })
})

describe('isBlockContentEmpty', () => {
    it('is true only when there is nothing to render', () => {
        expect(isBlockContentEmpty(block())).toBe(true)
        expect(isBlockContentEmpty(block({ content: '<p>  </p>' }))).toBe(true)
        expect(isBlockContentEmpty(block({ content: '<p>Hi</p>' }))).toBe(false)
        expect(isBlockContentEmpty(block({ content_url: 'https://x/y.mp4' }))).toBe(false)
        expect(isBlockContentEmpty(block({ content_data: { quiz_id: 'q1' } }))).toBe(false)
        expect(isBlockContentEmpty(block({ content_data: { flashcards: [{ front: 'a' }] } }))).toBe(false)
    })
})

describe('normalizeVisualAssetSource', () => {
    it('recognises raw svg markup', () => {
        expect(normalizeVisualAssetSource('<svg viewBox="0 0 1 1"></svg>')).toEqual({
            kind: 'svg',
            markup: '<svg viewBox="0 0 1 1"></svg>',
        })
    })

    it('decodes percent-encoded and base64 svg data URIs', () => {
        const encoded = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
        expect(normalizeVisualAssetSource(encoded)).toEqual({
            kind: 'svg',
            markup: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        })
        const b64 = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
        expect(normalizeVisualAssetSource(b64)).toEqual({
            kind: 'svg',
            markup: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        })
    })

    it('treats normal URLs and storage paths as raster, and empty as null', () => {
        expect(normalizeVisualAssetSource('https://cdn/x.png')).toEqual({ kind: 'raster', url: 'https://cdn/x.png' })
        expect(normalizeVisualAssetSource('course-media/abc.jpg')).toEqual({ kind: 'raster', url: 'course-media/abc.jpg' })
        expect(normalizeVisualAssetSource('   ')).toBeNull()
        expect(normalizeVisualAssetSource(null)).toBeNull()
    })
})

describe('visual asset grouping', () => {
    const assets = [
        { id: 'a1', content_block_id: 'b1', lesson_id: 'l1', order_index: 2, placement: 'summary' },
        { id: 'a2', content_block_id: 'b1', lesson_id: 'l1', order_index: 1, placement: 'intro' },
        { id: 'a3', content_block_id: null, lesson_id: 'l2', order_index: 0, placement: 'concept_explanation' },
    ] as any[]

    it('groups by block, sorted by order_index', () => {
        const byBlock = groupVisualAssetsByBlock(assets)
        expect(byBlock.get('b1')?.map((a) => a.id)).toEqual(['a2', 'a1'])
    })

    it('falls back to lesson association when no direct link', () => {
        const byBlock = groupVisualAssetsByBlock(assets)
        const byLesson = new Map([['l2', [assets[2]]]])
        expect(selectBlockVisualAssets(block({ id: 'bX', content_data: { lesson_id: 'l2' } }), byBlock, byLesson as any)).toEqual([
            assets[2],
        ])
    })

    it('partitions by placement', () => {
        const { leading, trailing } = partitionVisualAssetsByPlacement(assets)
        expect(leading.map((a) => a.id)).toEqual(['a2'])
        expect(trailing.map((a) => a.id)).toEqual(['a1', 'a3'])
    })

    it('picks the right caption per language', () => {
        expect(getVisualAssetCaption({ caption: 'Front desk', caption_ar: 'مكتب' } as any, true)).toBe('مكتب')
        expect(getVisualAssetCaption({ caption: 'Front desk', title: 'X' } as any, false)).toBe('Front desk')
    })
})
