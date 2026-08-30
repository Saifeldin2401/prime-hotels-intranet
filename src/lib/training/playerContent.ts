/**
 * Pure helpers for the Training Player.
 *
 * These functions translate the loose, evolving shapes that an AI-generated
 * course can persist (see `src/types/aiCourseEngine.ts` and
 * `aiCourseEngineService.saveBlueprintToDatabase`) into the narrow decisions the
 * player UI needs: which renderer to use for a block, whether a block is a
 * distinctive "callout" (objectives / summary / checkpoints), where its bilingual
 * text lives, and how an attached visual asset should be drawn.
 *
 * Everything here is framework-free and unit-tested in `playerContent.test.ts`.
 */

import type { TrainingContentBlock } from '@/lib/types'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'

/* ------------------------------------------------------------------ */
/* Block renderer resolution                                           */
/* ------------------------------------------------------------------ */

export type BlockRendererKind =
    | 'text'
    | 'video'
    | 'audio'
    | 'image'
    | 'interactive'
    | 'quiz'
    | 'document_link'
    | 'sop_reference'
    | 'assignment'
    | 'roleplay'
    | 'unknown'

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const blockData = (block: Pick<TrainingContentBlock, 'content_data'>): Record<string, unknown> | null =>
    asRecord(block.content_data)

/** True when the block is an assignment/practical regardless of how it was authored. */
export function isAssignmentBlock(block: Pick<TrainingContentBlock, 'type' | 'content_data'>): boolean {
    const type = String(block.type)
    if (type === 'assignment' || type === 'practical') return true
    const cd = blockData(block)
    return Boolean(cd?.is_assignment) || Boolean(cd?.requires_submission)
}

/** True when the block is an AI-guest roleplay simulation regardless of authoring. */
export function isRoleplayBlock(block: Pick<TrainingContentBlock, 'type' | 'content_data'>): boolean {
    const type = String(block.type)
    if (type === 'roleplay') return true
    const cd = blockData(block)
    return Boolean(cd?.is_roleplay) || cd?.interactive_type === 'roleplay'
}

/**
 * Single source of truth for "how do we draw this block".
 *
 * Assignment / roleplay / quiz intent wins over the raw `block_type` because the
 * AI course engine currently persists every lesson as `block_type: 'text'` and
 * expresses richer intent through `content_data`.
 */
export function resolveBlockRenderer(
    block: Pick<TrainingContentBlock, 'type' | 'content_data'>
): BlockRendererKind {
    const type = String(block.type || '').trim()

    if (type === 'quiz') return 'quiz'
    if (isAssignmentBlock(block)) return 'assignment'
    if (isRoleplayBlock(block)) return 'roleplay'

    switch (type) {
        case 'text':
        case 'ai_generated':
            return 'text'
        case 'video':
        case 'audio':
        case 'image':
        case 'interactive':
        case 'document_link':
        case 'sop_reference':
            return type
        default:
            return 'unknown'
    }
}

/* ------------------------------------------------------------------ */
/* Component callouts (objectives / summary / checkpoints)             */
/* ------------------------------------------------------------------ */

export type ContentComponentTag = 'objectives' | 'summary' | 'checkpoints'

const COMPONENT_TAGS: ContentComponentTag[] = ['objectives', 'summary', 'checkpoints']

/**
 * Leading/trailing lesson components (module objectives, wrap-up summary,
 * checkpoint list) arrive as `text` blocks tagged in `content_data`. They must be
 * rendered as a callout, not as body prose.
 */
export function getBlockComponentTag(
    block: Pick<TrainingContentBlock, 'content_data'>
): ContentComponentTag | null {
    const cd = blockData(block)
    if (!cd) return null
    const raw = cd.component ?? cd.componentKey ?? cd.component_key ?? cd.lessonComponent ?? cd.section
    if (typeof raw !== 'string') return null
    const normalized = raw.trim().toLowerCase()
    if (COMPONENT_TAGS.includes(normalized as ContentComponentTag)) {
        return normalized as ContentComponentTag
    }
    // Common synonyms produced by the generator.
    if (normalized === 'learning_objectives' || normalized === 'objective') return 'objectives'
    if (normalized === 'wrap_up' || normalized === 'recap' || normalized === 'key_takeaways') return 'summary'
    if (normalized === 'checkpoint' || normalized === 'knowledge_checkpoints') return 'checkpoints'
    return null
}

const toStringList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    }
    if (typeof value === 'string' && value.trim()) {
        return value
            .split(/\r?\n|•|·|;/)
            .map((entry) => entry.replace(/^[-*\d.)\s]+/, '').trim())
            .filter(Boolean)
    }
    return []
}

/** Module/lesson learning outcomes persisted on a block's `content_data`. */
export function getBlockLearningOutcomes(block: Pick<TrainingContentBlock, 'content_data'>): string[] {
    const cd = blockData(block)
    if (!cd) return []
    return toStringList(cd.learningOutcomes ?? cd.learning_outcomes ?? cd.objectives)
}

/**
 * Course-level objectives / takeaways stored on `training_modules.blueprint`
 * (jsonb). Read defensively — the column may be absent on older modules.
 */
export function getCourseBlueprintOutcomes(
    blueprint: unknown
): { terminalObjectives: string[]; enablingObjectives: string[]; summaryTakeaways: string[] } {
    const bp = asRecord(blueprint)
    return {
        terminalObjectives: toStringList(bp?.terminalObjectives ?? bp?.terminal_objectives),
        enablingObjectives: toStringList(bp?.enablingObjectives ?? bp?.enabling_objectives),
        summaryTakeaways: toStringList(bp?.summaryTakeaways ?? bp?.summary_takeaways),
    }
}

/* ------------------------------------------------------------------ */
/* Bilingual content resolution                                        */
/* ------------------------------------------------------------------ */

/**
 * Where a block's already-translated markup can live, in priority order:
 *  1. an on-the-fly translation the player fetched this session
 *  2. `content_data.translations[lang]`            (multi-language map)
 *  3. `content_data.renderedHtml_ar` / `content_data.content_ar`  (AR sibling)
 *  4. `content_data.translated_html` when tagged for this language
 */
export function resolvePersistedBlockTranslation(
    block: Pick<TrainingContentBlock, 'content_data'>,
    targetLang: string | null | undefined
): string | undefined {
    if (!targetLang) return undefined
    const cd = blockData(block)
    if (!cd) return undefined
    const lang = targetLang.toLowerCase()

    const translations = asRecord(cd.translations)
    const fromMap = translations?.[lang] ?? translations?.[targetLang]
    if (typeof fromMap === 'string' && fromMap.trim()) return fromMap

    if (lang === 'ar') {
        for (const key of ['renderedHtml_ar', 'content_ar', 'translated_html_ar', 'html_ar']) {
            const value = cd[key]
            if (typeof value === 'string' && value.trim()) return value
        }
    }

    const translationLang = typeof cd.translation_lang === 'string' ? cd.translation_lang.toLowerCase() : null
    if ((!translationLang || translationLang === lang) && typeof cd.translated_html === 'string' && cd.translated_html.trim()) {
        return cd.translated_html
    }

    return undefined
}

/** On-the-fly translation wins, else fall back to whatever was persisted. */
export function getEffectiveBlockTranslation(
    block: Pick<TrainingContentBlock, 'content_data'>,
    targetLang: string | null | undefined,
    onTheFly: string | null | undefined
): string | undefined {
    if (typeof onTheFly === 'string' && onTheFly.trim()) return onTheFly
    return resolvePersistedBlockTranslation(block, targetLang)
}

/** Localised instructions / prompt for an assignment block. */
export function getAssignmentPrompt(
    block: Pick<TrainingContentBlock, 'content' | 'content_data'>,
    targetLang: string | null | undefined
): { original: string; translated?: string } {
    const cd = blockData(block)
    const original = (typeof cd?.instructions === 'string' && cd.instructions) || block.content || ''
    let translated: string | undefined
    if (targetLang) {
        const lang = targetLang.toLowerCase()
        const candidates =
            lang === 'ar'
                ? [cd?.instructions_ar, cd?.instructionsAr, cd?.prompt_ar]
                : [asRecord(cd?.instructions_i18n)?.[lang], asRecord(cd?.translations)?.[lang]]
        translated = candidates.find((c): c is string => typeof c === 'string' && c.trim().length > 0)
    }
    return { original, translated }
}

/* ------------------------------------------------------------------ */
/* Emptiness / robustness                                              */
/* ------------------------------------------------------------------ */

const stripHtml = (html: string): string =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

/** A block that would render a blank screen: no prose, no media, no data hooks. */
export function isBlockContentEmpty(block: Pick<TrainingContentBlock, 'content' | 'content_url' | 'content_data'>): boolean {
    if (block.content_url && block.content_url.trim()) return false
    if (typeof block.content === 'string' && stripHtml(block.content).length > 0) return false
    const cd = blockData(block)
    if (!cd) return true
    const mediaKeys = ['url', 'content_url', 'video_url', 'image_url', 'audio_url', 'file_url', 'public_url', 'src', 'quiz_id', 'sop_id', 'document_id', 'flashcards', 'scenario', 'instructions']
    return !mediaKeys.some((key) => {
        const value = cd[key]
        if (Array.isArray(value)) return value.length > 0
        return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
    })
}

/* ------------------------------------------------------------------ */
/* Visual assets                                                       */
/* ------------------------------------------------------------------ */

export type NormalizedVisualSource =
    | { kind: 'svg'; markup: string }
    | { kind: 'raster'; url: string }
    | null

/**
 * The generator can hand us a visual as (1) a raw `<svg …>` string, (2) a
 * `data:image/svg+xml` URI (base64 or percent-encoded), or (3) a normal raster
 * URL / storage path. Mirrors `KnowledgeEditor.onApplyArticle`'s 3-case handling.
 */
export function normalizeVisualAssetSource(raw: string | null | undefined): NormalizedVisualSource {
    if (!raw || typeof raw !== 'string') return null
    const value = raw.trim()
    if (!value) return null

    if (value.startsWith('<svg') || value.includes('xmlns="http://www.w3.org/2000/svg"')) {
        return { kind: 'svg', markup: value }
    }

    if (value.startsWith('data:image/svg+xml')) {
        try {
            const commaIdx = value.indexOf(',')
            if (commaIdx !== -1) {
                const header = value.slice(0, commaIdx)
                const body = value.slice(commaIdx + 1)
                const decoded = header.includes('base64')
                    ? decodeURIComponent(escape(atob(body)))
                    : decodeURIComponent(body)
                if (decoded.includes('<svg')) return { kind: 'svg', markup: decoded }
            }
        } catch {
            // Fall through — a browser <img> can still render the data URI directly.
        }
        return { kind: 'raster', url: value }
    }

    return { kind: 'raster', url: value }
}

export function getVisualAssetCaption(
    asset: Pick<CourseVisualAsset, 'caption' | 'caption_ar' | 'title' | 'title_ar'>,
    preferArabic: boolean
): string {
    if (preferArabic) return asset.caption_ar || asset.title_ar || asset.caption || asset.title || ''
    return asset.caption || asset.title || ''
}

export function getVisualAssetAlt(
    asset: Pick<CourseVisualAsset, 'alt_text' | 'alt_text_ar' | 'title' | 'title_ar'>,
    preferArabic: boolean
): string {
    if (preferArabic) return asset.alt_text_ar || asset.alt_text || asset.title_ar || asset.title || ''
    return asset.alt_text || asset.title || ''
}

type LooseAsset = CourseVisualAsset & { content_block_id?: string | null; lesson_id?: string | null }

/** Index a flat asset list by the content block it belongs to. */
export function groupVisualAssetsByBlock(assets: LooseAsset[] | null | undefined): Map<string, LooseAsset[]> {
    const map = new Map<string, LooseAsset[]>()
    for (const asset of assets || []) {
        const key = asset.content_block_id
        if (!key) continue
        const list = map.get(key) || []
        list.push(asset)
        map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    return map
}

export function groupVisualAssetsByLesson(assets: LooseAsset[] | null | undefined): Map<string, LooseAsset[]> {
    const map = new Map<string, LooseAsset[]>()
    for (const asset of assets || []) {
        const key = asset.lesson_id
        if (!key) continue
        const list = map.get(key) || []
        list.push(asset)
        map.set(key, list)
    }
    for (const list of map.values()) list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    return map
}

/** Resolve the assets for a block: direct link first, then lesson association. */
export function selectBlockVisualAssets(
    block: Pick<TrainingContentBlock, 'id' | 'content_data'>,
    byBlock: Map<string, LooseAsset[]>,
    byLesson: Map<string, LooseAsset[]>
): LooseAsset[] {
    const direct = byBlock.get(block.id)
    if (direct && direct.length > 0) return direct
    const lessonId = blockData(block)?.lesson_id
    if (typeof lessonId === 'string' && lessonId) return byLesson.get(lessonId) || []
    return []
}

const LEADING_PLACEMENTS = new Set(['intro', 'before_example', 'full_width'])

/** Split a block's assets into those shown above the prose vs. below it. */
export function partitionVisualAssetsByPlacement<T extends Pick<CourseVisualAsset, 'placement'>>(
    assets: T[]
): { leading: T[]; trailing: T[] } {
    const leading: T[] = []
    const trailing: T[] = []
    for (const asset of assets) {
        if (LEADING_PLACEMENTS.has(String(asset.placement))) leading.push(asset)
        else trailing.push(asset)
    }
    return { leading, trailing }
}
