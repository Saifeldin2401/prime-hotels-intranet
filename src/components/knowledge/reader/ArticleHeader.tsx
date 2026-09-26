import { AlertCircle, CheckCircle2, Crown, GitBranch, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export interface ArticleHeaderProps {
  article: {
    id?: string
    title: string
    description?: string | null
    summary?: string | null
    updated_at?: string
    content_type?: string
    sop_code?: string | null
    code?: string | null
    version?: number
    current_version?: number
    published_version_number?: number | null
    published_at?: string | null
    last_published_at?: string | null
    last_reviewed_at?: string | null
    next_review_date?: string | null
    requires_acknowledgment?: boolean
    is_acknowledged?: boolean
    acknowledged_at?: string | null
    is_master_template?: boolean
    master_source_id?: string | null
    scope_type?: string
    author?: { full_name?: string; avatar_url?: string } | null
    department?: { id?: string; name?: string } | null
    last_editor?: { full_name?: string } | null
    view_count?: number
  }
  statusColor?: string
  statusLabel: string
  hasBeenUpdatedSinceLastView?: boolean
  translatedData?: { title: string; description?: string } | null
  showBilingual?: boolean
  isRtlTarget?: boolean
  shouldUseRtl?: boolean
  readingTime?: number
  className?: string
}

/**
 * The top of an article: an editorial title, then one trust band that
 * answers "can I rely on this?" - who owns it, which version, since when it
 * applies, whether its review is current, who it applies to, and whether the
 * reader has already acknowledged it.
 */
export function ArticleHeader({
  article,
  statusLabel,
  statusColor = 'gray',
  hasBeenUpdatedSinceLastView = false,
  translatedData,
  showBilingual = false,
  isRtlTarget = false,
  shouldUseRtl = false,
  readingTime = 1,
  className,
}: ArticleHeaderProps) {
  const { t, i18n } = useTranslation('knowledge')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const date = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : null

  const version = article.published_version_number ?? article.current_version ?? article.version
  const effective = date(article.last_published_at ?? article.published_at)
  const reviewed = date(article.last_reviewed_at)
  const reviewDue = article.next_review_date ? Date.parse(article.next_review_date) : null
  const reviewOverdue = reviewDue !== null && reviewDue < Date.now()
  const code = article.sop_code || article.code
  const scope = article.department?.id === 'multiple'
    ? t('viewer.multiple_departments', 'Multiple departments')
    : article.department?.name ?? t(`hub.scope.${article.scope_type ?? 'organization'}`, 'Whole organization')
  const title = translatedData && !showBilingual ? translatedData.title : article.title
  const lede = translatedData ? translatedData.description : (article.summary || article.description)

  type BandItem = { label: string; value: string; tone?: 'ok' | 'warn' }
  const band = ([
    article.author?.full_name ? { label: t('hub.owner', 'Owner'), value: article.author.full_name } : null,
    version != null ? { label: t('hub.version', 'Version'), value: `v${version}` } : null,
    effective ? { label: t('hub.effective', 'Effective'), value: effective } : null,
    reviewed || reviewDue !== null
      ? {
          label: t('hub.reviewed', 'Last reviewed'),
          value: reviewOverdue ? t('hub.reviewOverdue', 'Review overdue') : (reviewed ?? t('hub.current', 'Current')),
          tone: reviewOverdue ? 'warn' as const : 'ok' as const,
        }
      : null,
    { label: t('hub.appliesTo', 'Applies to'), value: scope },
    { label: t('viewer.reading_time', 'Reading time'), value: t('article.min_read_n', '{{count}} min read', { count: readingTime }) },
  ] as (BandItem | null)[]).filter((x): x is BandItem => !!x)

  return (
    <header className={cn('border-b border-ds-border bg-ds-background print:border-none', className)}>
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        {/* Kind of document and its standing */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
          <span className="text-ds-accent">{t(`content_types_short.${article.content_type}`, article.content_type ?? '')}</span>
          {code && <span className="font-mono normal-case tracking-normal text-ds-muted">{code}</span>}
          {statusColor !== 'green' && <span className="rounded-[3px] bg-ds-warning-soft px-1.5 py-0.5 text-ds-warning">{statusLabel}</span>}
          {article.is_master_template && (
            <span className="inline-flex items-center gap-1 text-ds-muted"><Crown aria-hidden="true" className="h-3 w-3" />{t('viewer.corporate_standard', 'Altus master standard')}</span>
          )}
          {article.master_source_id && (
            <span className="inline-flex items-center gap-1 text-ds-muted"><GitBranch aria-hidden="true" className="h-3 w-3" />{t('viewer.inherited_master', 'Based on an Altus master standard')}</span>
          )}
          {hasBeenUpdatedSinceLastView && (
            <span className="rounded-[3px] bg-ds-info-soft px-1.5 py-0.5 text-ds-info">{t('viewer.updated_since_view', 'Updated since you last read it')}</span>
          )}
        </div>

        {/* Title and lede */}
        <h1
          className={cn(
            'mt-4 max-w-4xl font-editorial text-[36px] font-semibold leading-[1.1] text-ds-ink sm:text-[48px]',
            shouldUseRtl && 'font-arabic leading-[1.3]'
          )}
        >
          {title}
        </h1>
        {showBilingual && translatedData && (
          <p
            dir={isRtlTarget ? 'rtl' : 'ltr'}
            className="mt-3 max-w-4xl border-s-2 border-ds-accent ps-4 font-editorial text-2xl text-ds-accent"
          >
            {translatedData.title}
          </p>
        )}
        {lede && <p className="mt-4 max-w-3xl text-[18px] leading-relaxed text-ds-ink-secondary">{lede}</p>}

        {/* Trust band */}
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ds-border py-5 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-x-10">
          {band.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{item.label}</dt>
              <dd
                className={cn(
                  'mt-0.5 flex items-center gap-1.5 truncate text-sm',
                  item.tone === 'warn' ? 'font-medium text-ds-warning' : item.tone === 'ok' ? 'text-ds-ink' : 'text-ds-ink'
                )}
              >
                {item.tone === 'warn' && <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
                {item.tone === 'ok' && <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ds-success" />}
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* The reader's own obligation, stated up front */}
        {article.requires_acknowledgment && (
          <div
            className={cn(
              'mb-6 flex items-center gap-2 border-s-[3px] px-3 py-2 text-sm',
              article.is_acknowledged ? 'border-ds-success bg-ds-success-soft text-ds-success' : 'border-ds-warning bg-ds-warning-soft text-ds-ink'
            )}
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
            {article.is_acknowledged
              ? t('viewer.acknowledged_on', 'You acknowledged this on {{date}}', { date: date(article.acknowledged_at) ?? '' })
              : t('viewer.acknowledge_required', 'Required reading: read to the end and confirm you have understood it.')}
          </div>
        )}
      </div>
    </header>
  )
}
