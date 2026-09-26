/**
 * Studio > Review queue.
 *
 * Operational triage for publishers: everything waiting for a decision,
 * oldest first, with its age made visible. Selecting an item opens a
 * decision panel beside the list (a sheet on phones) where the reviewer reads
 * the author's note, opens the content, and approves it or sends it back
 * with instructions - without losing their place in the queue.
 */

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, FileText, ListChecks, Loader2, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

import type { ContentType } from '@/lib/contentLifecycle'
import { cn } from '@/lib/utils'
import {
  approve as approveTransition,
  listOpenSourceChangeFlags,
  listReviewQueue,
  requestChanges as requestChangesTransition,
  resolveSourceChangeFlag,
  scanSourceChanges,
  type ReviewQueueItem,
} from '@/services/contentLifecycleService'
import { EmptyState, ErrorState, Sheet, Skeleton, WorkspaceHeader } from '@/ui'

import { fetchPeopleNames } from '../reviewApi'

const TYPE_ICON: Record<ContentType, typeof BookOpen> = { course: BookOpen, article: FileText, assessment: ListChecks }
const DAY = 24 * 60 * 60 * 1000

function ageTone(submittedAt: string, now: number): 'fresh' | 'aging' | 'stale' {
  const days = (now - Date.parse(submittedAt)) / DAY
  return days >= 7 ? 'stale' : days >= 3 ? 'aging' : 'fresh'
}

function openHref(item: ReviewQueueItem): string {
  const id = item.review.content_id
  if (item.review.content_type === 'article') return `/knowledge/${id}`
  if (item.review.content_type === 'course') return `/studio/courses/${id}`
  return `/studio/quizzes/${id}`
}

export default function ReviewQueuePage() {
  const { t, i18n } = useTranslation('training')
  const dfLocale = i18n.language?.startsWith('ar') ? ar : enGB
  const queryClient = useQueryClient()
  const [now] = useState(() => Date.now())
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const queue = useQuery({
    queryKey: ['content-review-queue', typeFilter],
    queryFn: () => listReviewQueue(typeFilter === 'all' ? undefined : { contentType: typeFilter }),
  })
  const flags = useQuery({ queryKey: ['source-change-flags'], queryFn: listOpenSourceChangeFlags })
  const items = useMemo(() => queue.data ?? [], [queue.data])
  const names = useQuery({
    queryKey: ['review-queue-names', items.map((i) => i.review.submitted_by ?? i.ownerId).join(',')],
    enabled: items.length > 0,
    queryFn: () => fetchPeopleNames(items.flatMap((i) => [i.review.submitted_by ?? '', i.ownerId ?? ''])),
  })

  const selected = items.find((i) => i.review.id === selectedId) ?? null
  // Keep a sensible selection: the oldest item, or the next one after a decision.
  useEffect(() => {
    if (!selected && items.length > 0) setSelectedId(items[0].review.id)
  }, [items, selected])

  const decide = useMutation({
    mutationFn: async ({ item, action }: { item: ReviewQueueItem; action: 'approve' | 'changes' }) => {
      const input = { contentType: item.review.content_type, contentId: item.review.content_id, actor: 'manager' as const, notes: notes.trim() || undefined }
      return action === 'approve' ? approveTransition(input) : requestChangesTransition(input)
    },
    onSuccess: (_d, { item, action }) => {
      toast.success(action === 'approve'
        ? t('reviewQueue.approved', '“{{title}}” is approved and published.', { title: item.title })
        : t('reviewQueue.returned', '“{{title}}” was sent back to its author with your notes.', { title: item.title }))
      const index = items.findIndex((i) => i.review.id === item.review.id)
      const next = items[index + 1] ?? items[index - 1] ?? null
      setSelectedId(next?.review.id ?? null)
      setNotes('')
      queryClient.invalidateQueries({ queryKey: ['content-review-queue'] })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t('reviewQueue.failed', 'The decision could not be saved. Try again.'))
    },
  })

  const resolveFlag = useMutation({
    mutationFn: (flagId: string) => resolveSourceChangeFlag(flagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['source-change-flags'] }),
  })
  const scan = useMutation({
    mutationFn: scanSourceChanges,
    onSuccess: (count) => {
      toast.success(t('reviewQueue.scanDone', 'Checked source SOPs: {{count}} courses need re-verification.', { count }))
      queryClient.invalidateQueries({ queryKey: ['source-change-flags'] })
    },
  })

  const typeLabel: Record<ContentType, string> = {
    course: t('reviewQueue.type.course', 'Course'),
    article: t('reviewQueue.type.article', 'Article'),
    assessment: t('reviewQueue.type.assessment', 'Quiz'),
  }
  const who = (item: ReviewQueueItem) => {
    const id = item.review.submitted_by ?? item.ownerId
    return (id && names.data?.get(id)) || t('reviewQueue.unknownAuthor', 'Unknown author')
  }
  const age = (iso: string) => formatDistanceToNowStrict(new Date(iso), { locale: dfLocale })
  const oldest = items[0]

  const DecisionPanel = selected ? (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ds-accent">{typeLabel[selected.review.content_type]}</p>
        <h2 className="text-xl font-semibold leading-snug text-ds-ink">{selected.title}</h2>
        <p className="text-sm text-ds-muted">
          {t('reviewQueue.submittedBy', 'Submitted by {{name}}, {{age}} ago', { name: who(selected), age: age(selected.review.submitted_at) })}
        </p>
      </div>

      {selected.review.review_notes && (
        <blockquote className="border-s-2 border-ds-border-strong ps-3 text-sm text-ds-ink-secondary">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-muted">{t('reviewQueue.authorNote', 'Author’s note')}</p>
          {selected.review.review_notes}
        </blockquote>
      )}

      <Link
        to={openHref(selected)}
        className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-ds-border text-sm font-medium text-ds-ink hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
      >
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
        {t('reviewQueue.open', 'Open and read it first')}
      </Link>

      <div className="space-y-2">
        <label htmlFor="review-notes" className="block text-sm font-medium text-ds-ink">{t('reviewQueue.notesLabel', 'Notes for the author')}</label>
        <textarea
          id="review-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('reviewQueue.notesPlaceholder', 'Required when sending back: say what to change and where.')}
          className="w-full rounded-md border border-ds-border-strong bg-ds-surface px-3 py-2 text-sm text-ds-ink placeholder:text-ds-muted focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => decide.mutate({ item: selected, action: 'approve' })}
          disabled={decide.isPending}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2"
        >
          {decide.isPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          {t('reviewQueue.approve', 'Approve and publish')}
        </button>
        <button
          type="button"
          onClick={() => decide.mutate({ item: selected, action: 'changes' })}
          disabled={decide.isPending || !notes.trim()}
          title={!notes.trim() ? t('reviewQueue.notesNeeded', 'Add notes to send it back') : undefined}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md border border-ds-border-strong px-4 text-sm font-semibold text-ds-ink hover:bg-ds-surface-subtle disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          <Send aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          {t('reviewQueue.sendBack', 'Send back')}
        </button>
      </div>
      <p className="text-xs text-ds-muted">{t('reviewQueue.fourEyes', 'You cannot approve your own work when another reviewer is available.')}</p>
    </div>
  ) : null

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('reviewQueue.eyebrow', 'Studio')}
        title={t('reviewQueue.title', 'Review queue')}
        context={queue.isLoading ? null : items.length === 0
          ? t('reviewQueue.none', 'Nothing is waiting for a decision.')
          : t('reviewQueue.summary', '{{count}} waiting · oldest submitted {{age}} ago', { count: items.length, age: oldest ? age(oldest.review.submitted_at) : '' })}
        actions={
          <button
            type="button"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-ds-border bg-ds-surface px-4 text-sm font-medium text-ds-ink hover:border-ds-border-strong disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={cn('h-4 w-4', scan.isPending && 'animate-spin')} />
            {t('reviewQueue.scan', 'Check source SOPs')}
          </button>
        }
      />

      {/* Courses whose source SOP changed after approval */}
      {(flags.data?.length ?? 0) > 0 && (
        <section aria-labelledby="review-flags" className="border-s-[3px] border-ds-warning bg-ds-warning-soft px-4 py-3">
          <h2 id="review-flags" className="flex items-center gap-2 text-sm font-semibold text-ds-ink">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 text-ds-warning" />
            {t('reviewQueue.flagsTitle', '{{count}} approved courses rely on an SOP that has since changed', { count: flags.data?.length ?? 0 })}
          </h2>
          <ul className="mt-2 divide-y divide-ds-warning/20">
            {flags.data?.map((flag) => (
              <li key={flag.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <Link to={`/studio/courses/${flag.training_module_id}`} className="font-medium text-ds-ink hover:underline">
                  {t('reviewQueue.flagCourse', 'Course updated source {{age}} ago', { age: age(flag.source_updated_at) })}
                </Link>
                <button type="button" onClick={() => resolveFlag.mutate(flag.id)} className="min-h-[36px] text-sm font-semibold text-ds-accent hover:underline">
                  {t('reviewQueue.markVerified', 'Mark as re-verified')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div role="group" aria-label={t('reviewQueue.filterLabel', 'Filter by type')} className="flex flex-wrap gap-2">
        {(['all', 'course', 'article', 'assessment'] as const).map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={typeFilter === type}
            onClick={() => setTypeFilter(type)}
            className={cn(
              'min-h-[40px] rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
              typeFilter === type ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
            )}
          >
            {type === 'all' ? t('reviewQueue.type.all', 'Everything') : typeLabel[type]}
          </button>
        ))}
      </div>

      {queue.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
          <Skeleton variant="card" className="h-72" />
          <Skeleton variant="card" className="h-72" />
        </div>
      ) : queue.isError ? (
        <ErrorState title={t('reviewQueue.errorTitle', 'The review queue could not be loaded')} message={t('reviewQueue.errorHint', 'Check your connection and try again.')} onRetry={() => void queue.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
          title={t('reviewQueue.emptyTitle', 'Nothing waiting for review')}
          description={typeFilter === 'all'
            ? t('reviewQueue.emptyBody', 'When authors submit courses, articles or quizzes, they appear here oldest first.')
            : t('reviewQueue.emptyFilter', 'Nothing of this type is waiting. Other types may be.')}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <ol className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface" aria-label={t('reviewQueue.listLabel', 'Waiting for a decision, oldest first')}>
            {items.map((item) => {
              const Icon = TYPE_ICON[item.review.content_type] ?? FileText
              const tone = ageTone(item.review.submitted_at, now)
              const isSelected = item.review.id === selected?.review.id
              return (
                <li key={item.review.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => { setSelectedId(item.review.id); setNotes(''); setSheetOpen(!window.matchMedia('(min-width: 1024px)').matches) }}
                    className={cn(
                      'relative flex w-full min-h-[64px] items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent',
                      isSelected && 'bg-ds-accent-soft/60 lg:before:absolute lg:before:inset-y-0 lg:before:start-0 lg:before:w-[3px] lg:before:bg-ds-accent'
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ds-ink">{item.title}</span>
                      <span className="block truncate text-xs text-ds-muted">{[typeLabel[item.review.content_type], who(item)].join(' · ')}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-[4px] px-2 py-1 font-mono text-xs tabular-nums',
                        tone === 'stale' ? 'bg-ds-danger-soft text-ds-danger' : tone === 'aging' ? 'bg-ds-warning-soft text-ds-warning' : 'bg-ds-surface-subtle text-ds-muted'
                      )}
                    >
                      {age(item.review.submitted_at)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <aside className="hidden lg:block" aria-label={t('reviewQueue.decision', 'Decision')}>
            <div className="sticky top-20 rounded-[6px] border border-ds-border bg-ds-surface p-5">{DecisionPanel}</div>
          </aside>
        </div>
      )}

      <div>
        <Sheet isOpen={sheetOpen && !!selected} onClose={() => setSheetOpen(false)} side="bottom" size="full" title={t('reviewQueue.decision', 'Decision')} closeLabel={t('reviewQueue.close', 'Close')}>
          {DecisionPanel}
        </Sheet>
      </div>
    </div>
  )
}
