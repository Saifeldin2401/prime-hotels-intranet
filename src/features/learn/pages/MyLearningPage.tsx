/**
 * Learn > My learning.
 *
 * The member's learning plan laid out on a timeline of obligations: overdue,
 * due this week, later, then anything without a date. Completed work is
 * history, one tap away. Each row says what it is, when it is due and how far
 * along the member is, and opens it directly.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, FileQuestion, Search, X } from 'lucide-react'

import { useMyAssignments } from '@/hooks/useTraining'
import { cn } from '@/lib/utils'
import type { LearningAssignment } from '@/types/learning'
import { EmptyState, ErrorState, ProgressBar, Skeleton, WorkspaceHeader } from '@/ui'

type Filter = 'all' | 'mandatory' | 'courses' | 'quizzes'
type Bucket = 'overdue' | 'week' | 'later' | 'undated'
const DAY = 24 * 60 * 60 * 1000

const hrefOf = (a: LearningAssignment) =>
  a.content_type === 'quiz' ? `/learn/quizzes/${a.content_id}?assignment=${a.id}` : `/learn/player/${a.content_id}?assignment=${a.id}`

export default function MyLearningPage() {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const query = useMyAssignments()
  const [now] = useState(() => Date.now())
  const [filter, setFilter] = useState<Filter>('all')
  const [text, setText] = useState('')
  const [showDone, setShowDone] = useState(false)

  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })

  const matches = (a: LearningAssignment) => {
    const q = text.trim().toLowerCase()
    if (q && !(a.content_title ?? '').toLowerCase().includes(q)) return false
    if (filter === 'mandatory') return a.priority === 'compliance'
    if (filter === 'quizzes') return a.content_type === 'quiz'
    if (filter === 'courses') return a.content_type !== 'quiz'
    return true
  }

  const { buckets, done, openCount } = useMemo(() => {
    const all = (query.data ?? []).filter(matches)
    const open = all.filter((a) => a.progress?.status !== 'completed')
    const b: Record<Bucket, LearningAssignment[]> = { overdue: [], week: [], later: [], undated: [] }
    for (const a of open) {
      if (!a.due_date) b.undated.push(a)
      else {
        const due = Date.parse(a.due_date)
        b[due < now ? 'overdue' : due - now < 7 * DAY ? 'week' : 'later'].push(a)
      }
    }
    for (const key of Object.keys(b) as Bucket[]) {
      b[key].sort((x, y) => (x.due_date ? Date.parse(x.due_date) : Infinity) - (y.due_date ? Date.parse(y.due_date) : Infinity))
    }
    return {
      buckets: b,
      done: all.filter((a) => a.progress?.status === 'completed')
        .sort((x, y) => Date.parse(y.progress?.completed_at ?? '0') - Date.parse(x.progress?.completed_at ?? '0')),
      openCount: open.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches depends on filter and text
  }, [query.data, filter, text, now])

  const bucketTitle: Record<Bucket, string> = {
    overdue: t('plan.overdue', 'Overdue'),
    week: t('plan.week', 'Due this week'),
    later: t('plan.later', 'Later'),
    undated: t('plan.undated', 'No due date'),
  }

  const Row = ({ a }: { a: LearningAssignment }) => {
    const pct = Math.round(a.progress?.progress_percentage ?? 0)
    const completed = a.progress?.status === 'completed'
    const started = !completed && (a.progress?.status === 'in_progress' || pct > 0)
    const Icon = a.content_type === 'quiz' ? FileQuestion : BookOpen
    const overdue = !completed && !!a.due_date && Date.parse(a.due_date) < now
    return (
      <li>
        <Link to={hrefOf(a)} className="group grid gap-3 px-4 py-4 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center sm:gap-6">
          <span className="flex min-w-0 items-start gap-3">
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ds-muted" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-medium text-ds-ink group-hover:underline">{a.content_title ?? t('untitledAssignment', 'Untitled item')}</span>
              <span className="block truncate text-xs text-ds-muted">
                {[
                  a.content_type === 'quiz' ? t('plan.quiz', 'Quiz') : t('plan.course', 'Course'),
                  a.priority === 'compliance' ? t('mandatory', 'Mandatory') : null,
                  completed && a.progress?.completed_at ? t('plan.completedOn', 'Completed {{date}}', { date: date(a.progress.completed_at) }) : a.due_date ? t('plan.due', 'Due {{date}}', { date: date(a.due_date) }) : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
          <span className="hidden sm:block">
            {completed ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-ds-success"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />{t('plan.done', 'Done')}</span>
            ) : started ? (
              <ProgressBar value={pct} label={t('plan.progress', 'Progress')} showPercentage size="sm" />
            ) : (
              <span className="text-sm text-ds-muted">{t('plan.notStarted', 'Not started')}</span>
            )}
          </span>
          <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', overdue ? 'text-ds-danger' : 'text-ds-accent')}>
            {completed ? t('plan.review', 'Review') : started ? t('myDay.resume', 'Resume') : t('myDay.start', 'Start')}
            <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </span>
        </Link>
      </li>
    )
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('plan.filter.all', 'Everything') },
    { id: 'mandatory', label: t('plan.filter.mandatory', 'Mandatory') },
    { id: 'courses', label: t('plan.filter.courses', 'Courses') },
    { id: 'quizzes', label: t('plan.filter.quizzes', 'Quizzes') },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('plan.eyebrow', 'Learn')}
        title={t('plan.title', 'My learning')}
        context={query.isLoading ? null : buckets.overdue.length > 0
          ? t('plan.summaryOverdue', '{{open}} to do · {{overdue}} overdue', { open: openCount, overdue: buckets.overdue.length })
          : t('plan.summary', '{{open}} to do · nothing overdue', { open: openCount })}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="search" className="relative flex-1">
          <label htmlFor="plan-search" className="sr-only">{t('plan.searchLabel', 'Search my learning')}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
          <input id="plan-search" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('plan.searchPlaceholder', 'Find a course or quiz')}
            className="h-11 w-full rounded-md border border-ds-border-strong bg-ds-surface ps-10 pe-10 text-sm text-ds-ink placeholder:text-ds-muted focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30" />
          {text && <button type="button" onClick={() => setText('')} aria-label={t('plan.clear', 'Clear search')} className="absolute end-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-ds-muted"><X aria-hidden="true" className="h-4 w-4" /></button>}
        </div>
        <div role="group" aria-label={t('plan.filterLabel', 'Filter')} className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={cn('min-h-[40px] rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                filter === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true"><Skeleton variant="card" className="h-20" /><Skeleton variant="card" className="h-40" /></div>
      ) : query.isError ? (
        <ErrorState title={t('plan.errorTitle', 'Your learning could not be loaded')} message={t('plan.errorHint', 'Check your connection and try again.')} onRetry={() => void query.refetch()} />
      ) : openCount === 0 && done.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
          title={text || filter !== 'all' ? t('plan.noMatch', 'Nothing matches') : t('plan.emptyTitle', 'Nothing assigned to you yet')}
          description={text || filter !== 'all' ? t('plan.noMatchBody', 'Try another search or filter.') : t('plan.emptyBody', 'When your manager assigns training it appears here with its due date. You can also explore courses yourself.')}
          action={<Link to="/learn/courses" className="text-sm font-semibold text-ds-accent hover:underline">{t('plan.explore', 'Explore courses')}</Link>}
        />
      ) : (
        <div className="space-y-8">
          {openCount === 0 && (
            <p className="flex items-center gap-2 text-[15px] text-ds-success"><CheckCircle2 aria-hidden="true" className="h-5 w-5" />{t('plan.allDone', 'You are up to date. Everything assigned to you is complete.')}</p>
          )}
          {(['overdue', 'week', 'later', 'undated'] as Bucket[]).map((key) => buckets[key].length > 0 && (
            <section key={key} aria-labelledby={`plan-${key}`} className="space-y-2">
              <h2 id={`plan-${key}`} className={cn('flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]', key === 'overdue' ? 'text-ds-danger' : 'text-ds-muted')}>
                {bucketTitle[key]} <span className="font-mono tabular-nums">{buckets[key].length}</span>
              </h2>
              <ul className={cn('divide-y divide-ds-border overflow-hidden rounded-[6px] border bg-ds-surface', key === 'overdue' ? 'border-ds-danger/40' : 'border-ds-border')}>
                {buckets[key].map((a) => <Row key={a.id} a={a} />)}
              </ul>
            </section>
          ))}
          {done.length > 0 && (
            <section aria-labelledby="plan-done" className="space-y-2">
              <h2 id="plan-done">
                <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-ds-ink hover:underline">
                  <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', showDone && 'rotate-180')} />
                  {t('plan.completedTitle', 'Completed ({{count}})', { count: done.length })}
                </button>
              </h2>
              {showDone && <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">{done.map((a) => <Row key={a.id} a={a} />)}</ul>}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
