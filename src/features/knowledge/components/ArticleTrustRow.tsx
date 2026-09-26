import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { KnowledgeArticle } from '@/types/knowledge'

import { knowledgeTypeStyle } from '../knowledgeTypes'

const SCOPE_KEY: Record<string, string> = {
  global: 'All organizations',
  organization: 'Whole organization',
  brand: 'Brand',
  hotel: 'Hotel',
  department: 'Department',
}

/**
 * One article with everything a reader needs to decide whether to trust it:
 * type and code, owner, version, when it took effect, whether its review is
 * overdue, and who it applies to.
 */
export function ArticleTrustRow({ article, now }: { article: KnowledgeArticle; now: number }) {
  const { t, i18n } = useTranslation('knowledge')
  const isArabic = i18n.language?.startsWith('ar')
  const locale = isArabic ? 'ar-SA' : 'en-GB'
  const date = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : null

  const title = (isArabic && article.title_ar) || article.title
  const summary = (isArabic && (article.summary_ar || article.description_ar)) || article.summary || article.description
  const version = article.published_version_number ?? article.current_version ?? article.version
  const effective = date(article.last_published_at ?? article.published_at)
  const reviewed = date(article.last_reviewed_at)
  const reviewOverdue = !!article.next_review_date && Date.parse(article.next_review_date) < now
  const typeStyle = knowledgeTypeStyle(article.content_type)
  const TypeIcon = typeStyle.icon
  const scope = article.department?.name
    ?? t(`hub.scope.${article.scope_type ?? 'organization'}`, SCOPE_KEY[article.scope_type ?? 'organization'] ?? '')

  return (
    <li>
      <Link
        to={`/knowledge/${article.id}`}
        className={cn('group flex gap-4 border-s-4 px-4 py-4 transition-colors hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent', typeStyle.border)}
      >
        <span aria-hidden="true" className={cn('mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex', typeStyle.soft, typeStyle.text)}>
          <TypeIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-muted">
            <span className={typeStyle.text}>{t(`content_types_short.${article.content_type}`, article.content_type.toUpperCase())}</span>
            {(article.sop_code || article.code) && <span className="font-mono normal-case tracking-normal">{article.sop_code || article.code}</span>}
            {article.requires_acknowledgment && (
              <span className="rounded-[3px] bg-ds-warning-soft px-1.5 py-0.5 text-ds-warning">{t('hub.required', 'Required')}</span>
            )}
          </div>
          <p className="text-[15px] font-semibold leading-snug text-ds-ink group-hover:underline">{title}</p>
          {summary && <p className="line-clamp-2 max-w-3xl text-sm text-ds-ink-secondary">{summary}</p>}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-xs text-ds-muted">
            {article.author?.full_name && (
              <div className="flex gap-1"><dt>{t('hub.owner', 'Owner')}:</dt><dd className="text-ds-ink-secondary">{article.author.full_name}</dd></div>
            )}
            {version != null && (
              <div className="flex gap-1"><dt>{t('hub.version', 'Version')}</dt><dd className="font-mono text-ds-ink-secondary">{version}</dd></div>
            )}
            {effective && (
              <div className="flex gap-1"><dt>{t('hub.effective', 'Effective')}</dt><dd className="text-ds-ink-secondary">{effective}</dd></div>
            )}
            {reviewed && (
              <div className="flex gap-1"><dt>{t('hub.reviewed', 'Last reviewed')}</dt><dd className="text-ds-ink-secondary">{reviewed}</dd></div>
            )}
            <div className="flex gap-1"><dt>{t('hub.appliesTo', 'Applies to')}:</dt><dd className="text-ds-ink-secondary">{scope}</dd></div>
          </dl>
        </div>
        <div className="hidden shrink-0 flex-col items-end justify-between gap-2 sm:flex">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs font-medium',
              reviewOverdue ? 'bg-ds-warning-soft text-ds-warning' : 'bg-ds-success-soft text-ds-success'
            )}
          >
            {reviewOverdue ? <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" /> : <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />}
            {reviewOverdue ? t('hub.reviewOverdue', 'Review overdue') : t('hub.current', 'Current')}
          </span>
          <ChevronRight aria-hidden="true" className="h-4 w-4 text-ds-muted rtl:rotate-180" />
        </div>
      </Link>
    </li>
  )
}
