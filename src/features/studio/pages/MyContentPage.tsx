/**
 * Studio > My content - the Studio home.
 *
 * "What needs authoring or revision?" An author's own work across courses,
 * articles and quizzes, ordered by what to do next: changes requested,
 * drafts to continue, items waiting in review, then recently published.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { BookOpen, ChevronRight, ClipboardCheck, FileText, ListChecks, Plus } from 'lucide-react'

import { useCapabilities } from '@/hooks/useCapabilities'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, Skeleton, WorkspaceHeader, headerActionClass } from '@/ui'

import { useMyContent } from '../hooks'
import { editHref, type ContentItem, type ContentStage } from '../model'

type TypeFilter = 'all' | ContentItem['type']

const TYPE_ICON = { course: BookOpen, article: FileText, quiz: ListChecks }

const STAGE_PILL: Record<ContentStage, string> = {
  draft: 'bg-ds-surface-subtle text-ds-ink-secondary',
  changes_requested: 'bg-ds-danger-soft text-ds-danger',
  in_review: 'bg-ds-warning-soft text-ds-warning',
  published: 'bg-ds-success-soft text-ds-success',
  archived: 'bg-ds-surface-subtle text-ds-muted',
}

export default function MyContentPage() {
  const { t, i18n } = useTranslation('training')
  const isArabic = i18n.language?.startsWith('ar')
  const { can } = useCapabilities()
  const query = useMyContent()
  const [filter, setFilter] = useState<TypeFilter>('all')

  const items = useMemo(
    () => (query.data ?? []).filter((i) => filter === 'all' || i.type === filter),
    [query.data, filter],
  )
  const by = (stage: ContentStage) => items.filter((i) => i.stage === stage)
  const sections: { stage: ContentStage; title: string; hint: string; limit: number }[] = [
    { stage: 'changes_requested', title: t('myContent.changes', 'Changes requested'), hint: t('myContent.changesHint', 'A reviewer sent these back. Address the feedback and resubmit.'), limit: 50 },
    { stage: 'draft', title: t('myContent.drafts', 'Drafts'), hint: t('myContent.draftsHint', 'Continue where you left off.'), limit: 50 },
    { stage: 'in_review', title: t('myContent.inReview', 'In review'), hint: t('myContent.inReviewHint', 'Waiting for a reviewer to approve.'), limit: 50 },
    { stage: 'published', title: t('myContent.published', 'Recently published'), hint: t('myContent.publishedHint', 'Live for learners.'), limit: 8 },
  ]

  const typeLabel = { course: t('myContent.type.course', 'Course'), article: t('myContent.type.article', 'Article'), quiz: t('myContent.type.quiz', 'Quiz') }
  const stageLabel: Record<ContentStage, string> = {
    draft: t('myContent.stage.draft', 'Draft'),
    changes_requested: t('myContent.stage.changes_requested', 'Changes requested'),
    in_review: t('myContent.stage.in_review', 'In review'),
    published: t('myContent.stage.published', 'Published'),
    archived: t('myContent.stage.archived', 'Archived'),
  }
  const edited = (iso: string) =>
    iso ? t('myContent.edited', 'Edited {{when}}', { when: formatDistanceToNow(new Date(iso), { addSuffix: true, locale: isArabic ? ar : enGB }) }) : ''

  const filters: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: t('myContent.filter.all', 'Everything') },
    { id: 'course', label: t('myContent.filter.course', 'Courses') },
    { id: 'article', label: t('myContent.filter.article', 'Articles') },
    { id: 'quiz', label: t('myContent.filter.quiz', 'Quizzes') },
  ]

  const draftCount = (query.data ?? []).filter((i) => i.stage === 'draft' || i.stage === 'changes_requested').length

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('myContent.eyebrow', 'Studio')}
        title={t('myContent.title', 'My content')}
        context={query.isLoading ? null : t('myContent.summary', '{{count}} items need your attention', { count: draftCount })}
        actions={
          <>
            <Link to="/studio/courses" className={headerActionClass.secondary}><BookOpen aria-hidden="true" className="h-4 w-4" />{t('myContent.library', 'Course library')}</Link>
            <Link to="/studio/create" className={headerActionClass.primary}><Plus aria-hidden="true" className="h-4 w-4" />{t('myContent.create', 'Create')}</Link>
          </>
        }
      />

      {can('content.publish') && (
        <Link
          to="/studio/review"
          className="flex min-h-[56px] items-center gap-3 rounded-[6px] border border-ds-border bg-ds-surface px-4 hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-ds-accent" />
          <span className="flex-1 text-sm text-ds-ink">{t('myContent.reviewPrompt', 'Other authors’ work waiting for your approval is in the review queue.')}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ds-accent">
            {t('myContent.openReview', 'Open review queue')}<ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </span>
        </Link>
      )}

      <div role="group" aria-label={t('myContent.filterLabel', 'Filter by type')} className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'min-h-[40px] rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
              filter === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-32" />
          <Skeleton variant="card" className="h-32" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('myContent.errorTitle', 'Your content could not be loaded')}
          message={t('myContent.errorHint', 'Check your connection and try again.')}
          onRetry={() => void query.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" aria-hidden="true" />}
          title={filter === 'all' ? t('myContent.emptyTitle', 'You have not created anything yet') : t('myContent.emptyFilter', 'Nothing of this type yet')}
          description={t('myContent.emptyBody', 'Start a course from your SOPs, write an article or build a quiz.')}
          action={<Link to="/studio/create" className="text-sm font-semibold text-ds-accent hover:underline">{t('myContent.createFirst', 'Create something')}</Link>}
        />
      ) : (
        <div className="space-y-8">
          {sections.map(({ stage, title, hint, limit }) => {
            const list = by(stage).slice(0, limit)
            if (list.length === 0) return null
            return (
              <section key={stage} aria-labelledby={`content-${stage}`} className="space-y-3">
                <div>
                  <h2 id={`content-${stage}`} className="text-[15px] font-semibold text-ds-ink">
                    {title} <span className="font-mono text-sm font-normal tabular-nums text-ds-muted">{by(stage).length}</span>
                  </h2>
                  <p className="text-sm text-ds-muted">{hint}</p>
                </div>
                <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                  {list.map((item) => {
                    const Icon = TYPE_ICON[item.type]
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <Link
                          to={editHref(item)}
                          className="group flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
                        >
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ds-ink">{item.title || t('myContent.untitled', 'Untitled')}</span>
                            <span className="block truncate text-xs text-ds-muted">{[typeLabel[item.type], edited(item.updated_at)].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className={cn('hidden shrink-0 rounded-[4px] px-2 py-1 text-xs font-medium sm:inline', STAGE_PILL[item.stage])}>{stageLabel[item.stage]}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ds-accent">
                            {item.stage === 'published' || item.stage === 'in_review' ? t('myContent.open', 'Open') : t('myContent.continue', 'Continue')}
                            <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
