/**
 * Search - one place to find an answer, a course or a person.
 *
 * The query stays editable at the top; results are compact rows grouped by
 * kind, with a filter strip that shows how many of each were found. Knowledge
 * comes first because most searches are for "how do we do X".
 */

import { useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { Award, BookOpen, CheckSquare, GraduationCap, Search, User } from 'lucide-react'

import { useTenant } from '@/contexts/TenantContext'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useGlobalSearch } from '@/features/search'
import { AnalyticsEvents } from '@/types/analytics'
import { cn } from '@/lib/utils'
import { EmptyState, Skeleton, WorkspaceHeader } from '@/ui'

type Kind = 'knowledge' | 'courses' | 'quizzes' | 'certificates' | 'people'
type Filter = 'all' | Kind

interface Row {
  id: string
  title: string
  detail?: string | null
  meta?: string | null
  to?: string
}

const ICONS: Record<Kind, ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
  knowledge: BookOpen,
  courses: GraduationCap,
  quizzes: CheckSquare,
  certificates: Award,
  people: User,
}

const TRACK_TYPE: Record<Kind, string> = {
  knowledge: 'document',
  courses: 'course',
  quizzes: 'quiz',
  certificates: 'certificate',
  people: 'profile',
}

export default function GlobalSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { t, i18n } = useTranslation('common')
  const dfLocale = i18n.language?.startsWith('ar') ? ar : enGB
  const { currentOrganization } = useTenant()
  const { track } = useAnalytics()
  const organizationId = currentOrganization?.id ?? null
  const [draft, setDraft] = useState(query)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { setDraft(query); setFilter('all') }, [query])

  const { data, isLoading } = useGlobalSearch(query, organizationId)
  const day = (d?: string | null) => (d ? format(new Date(d), 'd MMM yyyy', { locale: dfLocale }) : null)

  const groups: { kind: Kind; label: string; rows: Row[] }[] = [
    {
      kind: 'knowledge',
      label: t('find.kind.knowledge', 'Knowledge'),
      rows: (data?.documents ?? []).map((d) => ({
        id: d.id, title: d.title, detail: d.description, meta: day(d.created_at), to: `/knowledge/${d.id}`,
      })),
    },
    {
      kind: 'courses',
      label: t('find.kind.courses', 'Courses'),
      rows: (data?.courses ?? []).map((c) => ({
        id: c.id, title: c.title, detail: c.description,
        meta: c.estimated_duration_minutes ? t('find.minutes', '{{count}} min', { count: c.estimated_duration_minutes }) : null,
        to: `/learn/courses/${c.id}`,
      })),
    },
    {
      kind: 'quizzes',
      label: t('find.kind.quizzes', 'Quizzes'),
      rows: (data?.quizzes ?? []).map((q) => ({
        id: q.id, title: q.title, detail: q.description,
        meta: q.passing_score_percentage ? t('find.passMark', 'Pass mark {{pct}}%', { pct: q.passing_score_percentage }) : null,
        to: `/learn/quizzes/${q.id}`,
      })),
    },
    {
      kind: 'certificates',
      label: t('find.kind.certificates', 'Certificates'),
      rows: (data?.certificates ?? []).map((c) => ({
        id: c.id, title: c.title || t('find.certificate', 'Certificate'),
        detail: [c.recipient_name, c.certificate_number].filter(Boolean).join(' · ') || null,
        meta: day(c.issue_date), to: '/learn/certificates',
      })),
    },
    {
      kind: 'people',
      label: t('find.kind.people', 'People'),
      rows: (data?.profiles ?? []).map((p) => ({
        id: p.id, title: p.full_name || p.email || t('find.member', 'Member'),
        detail: p.job_title || (p.full_name ? p.email : null), to: `/profile/${p.id}`,
      })),
    },
  ]
  const total = groups.reduce((n, g) => n + g.rows.length, 0)
  const visible = groups.filter((g) => g.rows.length > 0 && (filter === 'all' || filter === g.kind))

  useEffect(() => {
    if (query && organizationId && !isLoading) {
      track(AnalyticsEvents.SEARCH, { query, results_count: total }, 'search')
    }
  }, [query, isLoading, total, track, organizationId])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = draft.trim()
    setSearchParams(q ? { q } : {})
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <WorkspaceHeader
        eyebrow={t('find.eyebrow', 'Search')}
        title={query ? t('find.titleFor', 'Results for “{{query}}”', { query }) : t('find.title', 'Search')}
        context={currentOrganization?.name
          ? t('find.scope', 'Within {{org}}: knowledge, courses, quizzes, certificates and people.', { org: currentOrganization.name })
          : null}
      />

      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor="global-search-input" className="sr-only">{t('find.label', 'Search')}</label>
        <Search aria-hidden="true" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
        <input
          id="global-search-input"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('find.placeholder', 'Search SOPs, courses, quizzes, people…')}
          className="min-h-[48px] w-full rounded-md border border-ds-border bg-ds-surface ps-10 pe-4 text-base text-ds-ink placeholder:text-ds-muted focus:border-ds-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        />
      </form>

      {!organizationId ? (
        <EmptyState
          icon={<Search className="h-6 w-6" aria-hidden="true" />}
          title={t('find.noOrgTitle', 'Choose an organization to search')}
          description={t('find.noOrgBody', 'Search stays inside one organization so results are relevant and private.')}
        />
      ) : !query ? (
        <p className="text-sm text-ds-muted">
          {t('find.hint', 'Type a word from a procedure, a course title or a colleague’s name.')}
        </p>
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" className="h-14" />)}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" aria-hidden="true" />}
          title={t('find.noneTitle', 'Nothing matches “{{query}}”', { query })}
          description={t('find.noneBody', 'Try fewer or different words, or browse Knowledge and Courses directly.')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/knowledge" className="inline-flex min-h-[40px] items-center rounded-md border border-ds-border px-3.5 text-sm text-ds-ink hover:border-ds-border-strong">{t('find.kind.knowledge', 'Knowledge')}</Link>
              <Link to="/learn/courses" className="inline-flex min-h-[40px] items-center rounded-md border border-ds-border px-3.5 text-sm text-ds-ink hover:border-ds-border-strong">{t('find.kind.courses', 'Courses')}</Link>
            </div>
          }
        />
      ) : (
        <>
          <div role="group" aria-label={t('find.filterLabel', 'Show results of kind')} className="flex flex-wrap gap-2">
            {[{ kind: 'all' as Filter, label: t('find.all', 'All'), count: total }, ...groups.map((g) => ({ kind: g.kind as Filter, label: g.label, count: g.rows.length }))]
              .filter((f) => f.count > 0)
              .map((f) => (
                <button key={f.kind} type="button" aria-pressed={filter === f.kind} onClick={() => setFilter(f.kind)}
                  className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                    filter === f.kind ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong')}>
                  {f.label}<span className="font-mono text-xs tabular-nums opacity-70">{f.count}</span>
                </button>
              ))}
          </div>

          <div className="space-y-8">
            {visible.map((g) => {
              const Icon = ICONS[g.kind]
              const rows = filter === 'all' ? g.rows.slice(0, 5) : g.rows
              return (
                <section key={g.kind} aria-labelledby={`find-${g.kind}`} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 id={`find-${g.kind}`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">
                      {g.label} <span className="font-mono tabular-nums">{g.rows.length}</span>
                    </h2>
                    {filter === 'all' && g.rows.length > rows.length && (
                      <button type="button" onClick={() => setFilter(g.kind)} className="text-sm font-medium text-ds-accent hover:underline">
                        {t('find.showAll', 'Show all {{count}}', { count: g.rows.length })}
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                    {rows.map((r) => {
                      const body = (
                        <>
                          <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ds-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ds-ink">{r.title}</span>
                            {r.detail && <span className="mt-0.5 block line-clamp-1 text-sm text-ds-muted">{r.detail}</span>}
                          </span>
                          {r.meta && <span className="shrink-0 text-xs text-ds-muted">{r.meta}</span>}
                        </>
                      )
                      return (
                        <li key={r.id}>
                          {r.to ? (
                            <Link
                              to={r.to}
                              onClick={() => track(AnalyticsEvents.SEARCH_CLICK, { query, result_type: TRACK_TYPE[g.kind], result_id: r.id }, 'search')}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="flex items-start gap-3 px-4 py-3">{body}</div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
