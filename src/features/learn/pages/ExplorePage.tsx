/**
 * Learn > Explore - the course catalog.
 *
 * Search first, then narrow by where the learner is with each course. Rows
 * show only facts the course actually has (duration, level, certificate) and
 * the learner's real progress; opening a course goes to its detail page,
 * where starting it is recorded by the player.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, ChevronRight, Clock, Search, X } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, ProgressBar, Skeleton, WorkspaceHeader } from '@/ui'

import { useCatalog } from '../catalogHooks'
import type { CatalogCourse } from '../catalogApi'

type StateFilter = 'all' | 'not_started' | 'in_progress' | 'completed'
type SortKey = 'newest' | 'shortest' | 'title'

export default function ExplorePage() {
  const { t, i18n } = useTranslation('training')
  const collator = useMemo(() => new Intl.Collator(i18n.language), [i18n.language])
  const { user } = useAuth()
  const catalog = useCatalog()
  const progress = useLearningProgress({ userId: user?.id ?? null })

  const [text, setText] = useState('')
  const [state, setState] = useState<StateFilter>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const progressById = useMemo(() => {
    const map = new Map<string, { status: string; pct: number }>()
    for (const p of progress.data ?? []) {
      if (p.content_type === 'module') map.set(p.content_id, { status: p.status, pct: p.progress_percentage ?? 0 })
    }
    return map
  }, [progress.data])

  const stateOf = (c: CatalogCourse): Exclude<StateFilter, 'all'> => {
    const p = progressById.get(c.id)
    if (!p) return 'not_started'
    if (p.status === 'completed') return 'completed'
    return p.pct > 0 || p.status === 'in_progress' ? 'in_progress' : 'not_started'
  }

  const courses = useMemo(() => {
    const q = text.trim().toLowerCase()
    const list = (catalog.data ?? []).filter((c) =>
      (!q || c.title.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)) &&
      (state === 'all' || stateOf(c) === state))
    return list.sort((a, b) => {
      if (sort === 'title') return collator.compare(a.title, b.title)
      if (sort === 'shortest') return (a.estimated_duration_minutes ?? Infinity) - (b.estimated_duration_minutes ?? Infinity)
      return Date.parse(b.created_at) - Date.parse(a.created_at)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateOf depends only on progressById
  }, [catalog.data, text, state, sort, progressById, collator])

  const counts = useMemo(() => {
    const all = catalog.data ?? []
    return {
      all: all.length,
      not_started: all.filter((c) => stateOf(c) === 'not_started').length,
      in_progress: all.filter((c) => stateOf(c) === 'in_progress').length,
      completed: all.filter((c) => stateOf(c) === 'completed').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateOf depends only on progressById
  }, [catalog.data, progressById])

  const filters: { id: StateFilter; label: string }[] = [
    { id: 'all', label: t('explore.filter.all', 'All') },
    { id: 'not_started', label: t('explore.filter.not_started', 'Not started') },
    { id: 'in_progress', label: t('explore.filter.in_progress', 'In progress') },
    { id: 'completed', label: t('explore.filter.completed', 'Completed') },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('explore.eyebrow', 'Learn')}
        title={t('explore.title', 'Explore courses')}
        context={catalog.isLoading ? null : t('explore.count', '{{count}} published courses', { count: counts.all })}
      />

      <div className="space-y-4">
        <div role="search" className="relative">
          <label htmlFor="explore-search" className="sr-only">{t('explore.searchLabel', 'Search courses')}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ds-muted" />
          <input
            id="explore-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('explore.searchPlaceholder', 'Search by course name or topic')}
            className="h-12 w-full rounded-[6px] border border-ds-border-strong bg-ds-surface ps-12 pe-12 text-[15px] text-ds-ink placeholder:text-ds-muted focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30"
          />
          {text && (
            <button type="button" onClick={() => setText('')} aria-label={t('explore.clear', 'Clear search')} className="absolute end-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ds-muted hover:bg-ds-surface-subtle">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={state === f.id}
              onClick={() => setState(f.id)}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                state === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
              )}
            >
              {f.label}
              <span className="font-mono text-xs tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          ))}
          <label className="ms-auto flex items-center gap-2 text-sm text-ds-muted">
            {t('explore.sort', 'Sort')}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-md border border-ds-border bg-ds-surface px-2 text-sm text-ds-ink focus:outline-none focus:ring-2 focus:ring-ds-accent"
            >
              <option value="newest">{t('explore.sortNewest', 'Newest')}</option>
              <option value="shortest">{t('explore.sortShortest', 'Shortest')}</option>
              <option value="title">{t('explore.sortTitle', 'A–Z')}</option>
            </select>
          </label>
        </div>
      </div>

      {catalog.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      ) : catalog.isError ? (
        <ErrorState title={t('explore.errorTitle', 'Courses could not be loaded')} message={t('explore.errorHint', 'Check your connection and try again.')} onRetry={() => void catalog.refetch()} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" aria-hidden="true" />}
          title={counts.all === 0 ? t('explore.emptyTitle', 'No courses published yet') : t('explore.noMatch', 'No courses match')}
          description={counts.all === 0 ? t('explore.emptyBody', 'Your training team has not published any courses yet.') : t('explore.noMatchBody', 'Try other words or another filter.')}
          action={counts.all > 0 ? (
            <button type="button" onClick={() => { setText(''); setState('all') }} className="text-sm font-semibold text-ds-accent hover:underline">{t('explore.reset', 'Clear search and filters')}</button>
          ) : undefined}
        />
      ) : (
        <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
          {courses.map((c) => {
            const s = stateOf(c)
            const p = progressById.get(c.id)
            return (
              <li key={c.id}>
                <Link
                  to={`/learn/courses/${c.id}`}
                  className="group flex flex-col gap-3 px-4 py-4 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[15px] font-semibold text-ds-ink group-hover:underline">{c.title}</p>
                    {c.description && <p className="line-clamp-2 text-sm text-ds-ink-secondary">{c.description}</p>}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-ds-muted">
                      {c.estimated_duration_minutes ? (
                        <span className="inline-flex items-center gap-1"><Clock aria-hidden="true" className="h-3.5 w-3.5" />{t('explore.minutes', '{{count}} min', { count: c.estimated_duration_minutes })}</span>
                      ) : null}
                      {c.difficulty_level && <span>{t(`explore.level.${c.difficulty_level.toLowerCase()}`, c.difficulty_level)}</span>}
                      {c.certificate_enabled && <span className="inline-flex items-center gap-1 text-ds-accent"><Award aria-hidden="true" className="h-3.5 w-3.5" />{t('explore.certificate', 'Certificate')}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:w-48 sm:justify-end">
                    {s === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ds-success"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />{t('explore.done', 'Completed')}</span>
                    ) : s === 'in_progress' ? (
                      <div className="w-full sm:w-40"><ProgressBar value={p?.pct ?? 0} label={t('explore.progress', 'Progress')} showPercentage size="sm" /></div>
                    ) : (
                      <span className="text-sm font-semibold text-ds-accent">{t('explore.view', 'View course')}</span>
                    )}
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-ds-muted rtl:rotate-180" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
