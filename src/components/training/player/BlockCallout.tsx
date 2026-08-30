import { InlineErrorBoundary } from '@/components/common/InlineErrorBoundary'
import { sanitizeHtml } from '@/lib/sanitize'
import type { ContentComponentTag } from '@/lib/training/playerContent'
import { cn } from '@/lib/utils'
import { CheckCircle2, Flag, Sparkles, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BlockCalloutProps {
    /** Which distinctive callout to draw. */
    tag: ContentComponentTag
    /** Optional explicit heading; falls back to a sensible localized default. */
    title?: string | null
    /** Bullet items (learning outcomes, checkpoint list, takeaways). */
    items?: string[]
    /** Pre-sanitized or raw HTML body, rendered when there are no discrete items. */
    bodyHtml?: string | null
    /** Optional translated HTML body, shown beneath the original when bilingual. */
    translatedBodyHtml?: string | null
    showBilingual?: boolean
    translationDir?: 'ltr' | 'rtl'
    isRTL?: boolean
    className?: string
}

const TAG_META: Record<
    ContentComponentTag,
    { icon: typeof Target; accent: string; ring: string; iconWrap: string; defaultKey: string; defaultText: string }
> = {
    objectives: {
        icon: Target,
        accent: 'text-hotel-navy',
        ring: 'border-hotel-gold/40 bg-hotel-gold/5',
        iconWrap: 'bg-hotel-gold/15 text-hotel-gold-dark',
        defaultKey: 'moduleObjectivesTitle',
        defaultText: 'What you will be able to do',
    },
    summary: {
        icon: Sparkles,
        accent: 'text-emerald-900 dark:text-emerald-200',
        ring: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20',
        iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        defaultKey: 'moduleSummaryTitle',
        defaultText: 'Key takeaways',
    },
    checkpoints: {
        icon: Flag,
        accent: 'text-amber-900 dark:text-amber-200',
        ring: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20',
        iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
        defaultKey: 'moduleCheckpointsTitle',
        defaultText: 'Checkpoints',
    },
}

/**
 * Renders module objectives / wrap-up summary / checkpoints as a distinctive
 * callout rather than as body prose. RTL-aware, design-token styled.
 */
export function BlockCallout({
    tag,
    title,
    items,
    bodyHtml,
    translatedBodyHtml,
    showBilingual = false,
    translationDir = 'ltr',
    isRTL = false,
    className,
}: BlockCalloutProps) {
    const { t } = useTranslation('training')
    const meta = TAG_META[tag]
    const Icon = meta.icon
    const heading = title?.trim() || t(meta.defaultKey, meta.defaultText)
    const cleanItems = (items || []).map((entry) => entry.trim()).filter(Boolean)
    const originalMarkup = bodyHtml ? sanitizeHtml(bodyHtml) : ''
    const translatedMarkup = translatedBodyHtml ? sanitizeHtml(translatedBodyHtml) : ''

    return (
        <section
            dir={isRTL ? 'rtl' : undefined}
            className={cn('rounded-2xl border p-5 sm:p-6', meta.ring, className)}
            aria-label={heading}
        >
            <div className="flex items-center gap-3 mb-4">
                <span className={cn('h-9 w-9 shrink-0 rounded-xl flex items-center justify-center', meta.iconWrap)}>
                    <Icon className="h-5 w-5" />
                </span>
                <h3 className={cn('text-base font-bold tracking-tight', meta.accent)}>{heading}</h3>
            </div>

            {cleanItems.length > 0 ? (
                <ul className="space-y-2.5">
                    {cleanItems.map((entry, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                            <CheckCircle2 className={cn('h-4 w-4 mt-0.5 shrink-0', meta.accent)} />
                            <span>{entry}</span>
                        </li>
                    ))}
                </ul>
            ) : originalMarkup ? (
                <div className="space-y-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                        <InlineErrorBoundary>
                            <div dangerouslySetInnerHTML={{ __html: originalMarkup }} />
                        </InlineErrorBoundary>
                    </div>
                    {showBilingual && translatedMarkup && (
                        <div
                            dir={translationDir}
                            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed border-t border-black/5 dark:border-white/10 pt-4"
                        >
                            <InlineErrorBoundary>
                                <div dangerouslySetInnerHTML={{ __html: translatedMarkup }} />
                            </InlineErrorBoundary>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm italic text-slate-400">{t('noContentAvailable', 'No content available.')}</p>
            )}
        </section>
    )
}

export default BlockCallout
