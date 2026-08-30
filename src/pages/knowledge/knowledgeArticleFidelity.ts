/**
 * Knowledge Article Fidelity Helpers
 *
 * Pure mapping helpers that keep the full richness of an AI-generated
 * `GeneratedKnowledgeArticle` when it flows into the Knowledge editor form and
 * then into / out of the `documents` table.
 *
 * The `documents` table already carries first-class bilingual + SOP columns
 * (`title_ar`, `description_ar`, `summary_ar`, `content_ar`, `sop_code`,
 * `estimated_read_time`). Everything else that has no dedicated column
 * (critical control points, service benchmarks, contingency protocols, the AI
 * compliance scorecard and the visual-asset reference) is round-tripped through
 * the existing `content_data` jsonb column under a single namespaced key so no
 * schema migration is required.
 */

import type { Json } from '@/types/database.generated'
import type { ChecklistItem, FAQItem } from '@/types/knowledge'
import type {
    GeneratedChecklistItem,
    GeneratedFAQItem,
    GeneratedKnowledgeArticle,
} from '@/lib/ai/agents/knowledgeBase/types'
import type { CourseVisualAsset } from '@/types/aiCourseEngine'

export const CONTENT_DATA_META_KEY = 'knowledge_meta'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Structured, persisted reference to the generated visual asset. */
export interface KnowledgeVisualAssetRef {
    image_url: string
    caption: string
    caption_ar: string
    alt_text: string
    model: string | null
    provider: string | null
}

/** Everything from a generated article that has no dedicated `documents` column. */
export interface KnowledgeArticleMeta {
    critical_control_points: string[]
    service_benchmarks: string[]
    contingency_protocols: string[]
    visual_asset: KnowledgeVisualAssetRef | null
    ai_compliance_score: number | null
    ai_compliance_notes: string[]
    ai_compliance_checked_at: string | null
    ai_models_used: string[]
    ai_model_used: string | null
    ai_provider_used: string | null
    ai_cost_tier: string | null
    ai_total_duration_ms: number | null
}

/** Shape of the patch applied to the editor form when an article is generated. */
export interface GeneratedArticleFormPatch {
    title: string
    title_ar: string
    description: string
    description_ar: string
    summary: string
    summary_ar: string
    content: string
    content_ar: string
    content_type: string
    sop_code: string
    estimated_read_time: number | null
    ai_tags: string[]
    checklist_items: ChecklistItem[]
    faq_items: FAQItem[]
    meta: KnowledgeArticleMeta
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Coerce an unknown value into a trimmed, non-empty string list. */
export function toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value
        .map((entry) => (typeof entry === 'string' ? entry : entry == null ? '' : String(entry)))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const numberOrNull = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null

const stringOrNull = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value : null

export function emptyKnowledgeArticleMeta(): KnowledgeArticleMeta {
    return {
        critical_control_points: [],
        service_benchmarks: [],
        contingency_protocols: [],
        visual_asset: null,
        ai_compliance_score: null,
        ai_compliance_notes: [],
        ai_compliance_checked_at: null,
        ai_models_used: [],
        ai_model_used: null,
        ai_provider_used: null,
        ai_cost_tier: null,
        ai_total_duration_ms: null,
    }
}

// ---------------------------------------------------------------------------
// Visual asset
// ---------------------------------------------------------------------------

export function normalizeVisualAsset(
    asset: CourseVisualAsset | KnowledgeVisualAssetRef | Record<string, unknown> | null | undefined,
): KnowledgeVisualAssetRef | null {
    if (!isPlainObject(asset)) return null
    const imageUrl = typeof asset.image_url === 'string' ? asset.image_url.trim() : ''
    if (!imageUrl) return null
    return {
        image_url: imageUrl,
        caption: typeof asset.caption === 'string' ? asset.caption : '',
        caption_ar: typeof asset.caption_ar === 'string' ? asset.caption_ar : '',
        alt_text: typeof asset.alt_text === 'string' ? asset.alt_text : '',
        model: typeof asset.model === 'string' && asset.model ? asset.model : null,
        provider: typeof asset.provider === 'string' && asset.provider ? asset.provider : null,
    }
}

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"'

/**
 * Turn a visual-asset image reference into inline HTML markup, handling the
 * three shapes the pipeline can emit:
 *  1. a raw inline `<svg>` string
 *  2. a `data:image/svg+xml` URI (base64 or percent-encoded)
 *  3. a normal (raster) image URL
 */
export function decodeVisualAssetMarkup(imageUrl: string, altText: string): string {
    if (!imageUrl) return ''

    if (imageUrl.startsWith('<svg') || imageUrl.includes(SVG_NS)) {
        return imageUrl
    }

    if (imageUrl.startsWith('data:image/svg+xml')) {
        try {
            const commaIdx = imageUrl.indexOf(',')
            if (commaIdx !== -1) {
                const header = imageUrl.slice(0, commaIdx)
                const body = imageUrl.slice(commaIdx + 1)
                return header.includes('base64')
                    ? decodeURIComponent(escape(atob(body)))
                    : decodeURIComponent(body)
            }
        } catch {
            /* fall through to <img> */
        }
    }

    const safeAlt = altText.replace(/"/g, '&quot;')
    return `<img src="${imageUrl}" alt="${safeAlt}" class="max-h-80 w-full object-contain rounded-lg my-4" />`
}

export function buildVisualAssetCardHtml(
    asset: KnowledgeVisualAssetRef,
    lang: 'en' | 'ar' = 'en',
): string {
    const alt = asset.alt_text || asset.caption || 'Operational SOP Vector Schematic'
    const markup = decodeVisualAssetMarkup(asset.image_url, alt)
    if (!markup) return ''
    const caption =
        (lang === 'ar' ? asset.caption_ar || asset.caption : asset.caption) ||
        'Operational SOP Vector Schematic'
    return `<div class="ai-schematic-card my-6 p-4 rounded-xl border bg-slate-950 text-center text-slate-300">\n${markup}\n<p class="text-xs text-slate-400 mt-2 italic">${caption}</p>\n</div>`
}

/** Prepend the visual-asset schematic card unless the content already embeds it. */
export function applyVisualAssetToContent(
    contentHtml: string,
    asset: KnowledgeVisualAssetRef | null | undefined,
    lang: 'en' | 'ar' = 'en',
): string {
    const base = contentHtml || ''
    if (!asset || !asset.image_url) return base
    if (base.includes(asset.image_url)) return base
    const card = buildVisualAssetCardHtml(asset, lang)
    if (!card) return base
    return base ? `${card}\n\n${base}` : card
}

// ---------------------------------------------------------------------------
// Checklist / FAQ mapping (generated shape -> editor shape)
// ---------------------------------------------------------------------------

const randomId = (): string => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
    } catch {
        /* ignore */
    }
    return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function mapGeneratedChecklistItems(
    items: GeneratedChecklistItem[] | undefined | null,
): ChecklistItem[] {
    if (!Array.isArray(items)) return []
    return items.map((item, index) => ({
        id: item?.id || randomId(),
        text: item?.text || '',
        text_ar: item?.text_ar || '',
        is_required: Boolean(item?.required),
        order: index,
    }))
}

export function mapGeneratedFaqItems(items: GeneratedFAQItem[] | undefined | null): FAQItem[] {
    if (!Array.isArray(items)) return []
    return items.map((item, index) => ({
        id: item?.id || randomId(),
        question: item?.question || '',
        question_ar: item?.question_ar || '',
        answer: item?.answer || '',
        answer_ar: item?.answer_ar || '',
        order: index,
    }))
}

// ---------------------------------------------------------------------------
// content_data round-trip
// ---------------------------------------------------------------------------

export function readKnowledgeMeta(contentData: Json | null | undefined): KnowledgeArticleMeta {
    const meta = emptyKnowledgeArticleMeta()
    if (!isPlainObject(contentData)) return meta
    const raw = contentData[CONTENT_DATA_META_KEY]
    if (!isPlainObject(raw)) return meta

    meta.critical_control_points = toStringList(raw.critical_control_points)
    meta.service_benchmarks = toStringList(raw.service_benchmarks)
    meta.contingency_protocols = toStringList(raw.contingency_protocols)
    meta.visual_asset = normalizeVisualAsset(raw.visual_asset as Record<string, unknown> | null)
    meta.ai_compliance_score = numberOrNull(raw.ai_compliance_score)
    meta.ai_compliance_notes = toStringList(raw.ai_compliance_notes)
    meta.ai_compliance_checked_at = stringOrNull(raw.ai_compliance_checked_at)
    meta.ai_models_used = toStringList(raw.ai_models_used)
    meta.ai_model_used = stringOrNull(raw.ai_model_used)
    meta.ai_provider_used = stringOrNull(raw.ai_provider_used)
    meta.ai_cost_tier = stringOrNull(raw.ai_cost_tier)
    meta.ai_total_duration_ms = numberOrNull(raw.ai_total_duration_ms)
    return meta
}

export function knowledgeMetaHasContent(meta: KnowledgeArticleMeta): boolean {
    return Boolean(
        toStringList(meta.critical_control_points).length ||
            toStringList(meta.service_benchmarks).length ||
            toStringList(meta.contingency_protocols).length ||
            meta.visual_asset ||
            meta.ai_compliance_score != null ||
            toStringList(meta.ai_compliance_notes).length ||
            meta.ai_models_used.length ||
            meta.ai_model_used ||
            meta.ai_provider_used,
    )
}

/**
 * Merge the knowledge meta into an existing `content_data` value, preserving any
 * unrelated keys already present. Returns `null` when nothing is left to store.
 */
export function writeKnowledgeMeta(
    contentData: Json | null | undefined,
    meta: KnowledgeArticleMeta,
): Json | null {
    const base: Record<string, unknown> = isPlainObject(contentData) ? { ...contentData } : {}

    if (!knowledgeMetaHasContent(meta)) {
        delete base[CONTENT_DATA_META_KEY]
        return Object.keys(base).length ? (base as unknown as Json) : null
    }

    base[CONTENT_DATA_META_KEY] = {
        critical_control_points: toStringList(meta.critical_control_points),
        service_benchmarks: toStringList(meta.service_benchmarks),
        contingency_protocols: toStringList(meta.contingency_protocols),
        visual_asset: meta.visual_asset,
        ai_compliance_score: meta.ai_compliance_score,
        ai_compliance_notes: toStringList(meta.ai_compliance_notes),
        ai_compliance_checked_at: meta.ai_compliance_checked_at,
        ai_models_used: toStringList(meta.ai_models_used),
        ai_model_used: meta.ai_model_used,
        ai_provider_used: meta.ai_provider_used,
        ai_cost_tier: meta.ai_cost_tier,
        ai_total_duration_ms: meta.ai_total_duration_ms,
    }
    return base as unknown as Json
}

// ---------------------------------------------------------------------------
// Generated article -> editor form
// ---------------------------------------------------------------------------

export function generatedArticleToFormPatch(
    article: GeneratedKnowledgeArticle,
    nowIso: string = new Date().toISOString(),
): GeneratedArticleFormPatch {
    const visualAsset = normalizeVisualAsset(article.visual_asset)

    const meta: KnowledgeArticleMeta = {
        critical_control_points: toStringList(article.critical_control_points),
        service_benchmarks: toStringList(article.service_benchmarks),
        contingency_protocols: toStringList(article.contingency_protocols),
        visual_asset: visualAsset,
        ai_compliance_score: numberOrNull(article.compliance_score),
        ai_compliance_notes: toStringList(article.compliance_notes),
        ai_compliance_checked_at: nowIso,
        ai_models_used: toStringList(article.models_used),
        ai_model_used: stringOrNull(article.model_used),
        ai_provider_used: stringOrNull(article.provider_used),
        ai_cost_tier: stringOrNull(article.cost_tier),
        ai_total_duration_ms: numberOrNull(article.total_duration_ms),
    }

    return {
        title: article.title || '',
        title_ar: article.title_ar || '',
        description: article.description || '',
        description_ar: article.description_ar || '',
        summary: article.summary || '',
        summary_ar: article.summary_ar || '',
        content: applyVisualAssetToContent(article.content_html || '', visualAsset, 'en'),
        // Only inline the schematic into Arabic content when there actually is
        // Arabic body text — otherwise leave it empty so the viewer does not
        // render an RTL article that is just an image.
        content_ar: article.content_html_ar
            ? applyVisualAssetToContent(article.content_html_ar, visualAsset, 'ar')
            : '',
        content_type: article.content_type || 'document',
        sop_code: article.sop_code || '',
        estimated_read_time: numberOrNull(article.estimated_read_time_minutes),
        ai_tags: Array.isArray(article.suggested_tags) ? article.suggested_tags.filter(Boolean) : [],
        checklist_items: mapGeneratedChecklistItems(article.checklist_items),
        faq_items: mapGeneratedFaqItems(article.faq_items),
        meta,
    }
}
