/**
 * Knowledge hub - "What do you need to know?"
 *
 * Search first. With no query, the hub is organized by how people actually
 * look for an SOP: what they are required to read, what applies to their
 * role, what is trending this week, what changed recently, what colleagues
 * use most, and - for
 * publishers - what is past its review date. Every result shows the signals
 * that make an article trustworthy (see ArticleTrustRow).
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { BookMarked, FileCheck2, Flame, Search, Users, X, type LucideIcon } from 'lucide-react'

import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useDebounce } from '@/hooks/useDebounce'
import { useArticles, useBookmarks, useRequiredReading } from '@/hooks/useKnowledge'
import { cn } from '@/lib/utils'
import type { KnowledgeArticle } from '@/types/knowledge'
import { EmptyState, Skeleton } from '@/ui'

import { CourseCover } from '@/features/learn/gamification/components/CourseCover'

import { usePopularArticles } from '../api/popularApi'
import { ArticleTrustRow } from '../components/ArticleTrustRow'
import { knowledgeTypeStyle } from '../knowledgeTypes'

type TypeFilter = 'all' | 'sop' | 'guide' | 'policy' | 'required' | 'saved'

function ArticleList({ articles, now, emptyText }: { articles: KnowledgeArticle[]; now: number; emptyText?: string }) {
  if (articles.length === 0) {
    return emptyText ? <p className="rounded-[6px] border border-dashed border-ds-border px-4 py-5 text-sm text-ds-muted">{emptyText}</p> : null
  }
  return (
    <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
      {articles.map((a) => <ArticleTrustRow key={a.id} article={a} now={now} />)}
    </ul>
  )
}

function Section({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function KnowledgeHubPage() {
  const { t, i18n } = useTranslation('knowledge')
  const i18nArabic = i18n.language?.startsWith('ar')
  const [searchParams, setSearchParams] = useSearchParams()
  const [now] = useState(() => Date.now())
  const { currentOrganization } = useTenant()
  const account = useAccountContext()
  const { can } = useCapabilities()

  const initialQuery = searchParams.get('q') ?? ''
  const filter = (searchParams.get('type') as TypeFilter | null) ?? 'all'
  // ?department= comes from an article's "more from this department" link.
  const departmentParam = searchParams.get('department') ?? undefined
  const [text, setText] = useState(initialQuery)
  const query = useDebounce(text.trim(), 300)

  // Keep the URL shareable: ?q= and ?type= describe what is on screen.
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (query) next.set('q', query)
    else next.delete('q')
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [query, searchParams, setSearchParams])

  const departmentId = account.tenantMemberships.find((m) => m.organization_id === currentOrganization?.id)?.department_id ?? undefined
  const typeParam = filter === 'sop' || filter === 'guide' || filter === 'policy' ? filter : undefined
  const isSearching = !!query || filter !== 'all' || !!departmentParam

  const results = useArticles({ search: query || undefined, type: typeParam, departmentId: departmentParam, limit: 60 })
  const roleArticles = useArticles({ departmentId, limit: 6 })
  const reading = useRequiredReading()
  const bookmarks = useBookmarks()
  const trending = usePopularArticles(7, 6)

  const all = useMemo(() => results.data ?? [], [results.data])
  const pendingReadingIds = useMemo(
    () => new Set((reading.data ?? []).filter((r) => !r.is_acknowledged).map((r) => r.document_id)),
    [reading.data],
  )
  const savedIds = useMemo(() => new Set((bookmarks.data ?? []).map((b) => b.document_id)), [bookmarks.data])

  const shown = useMemo(() => {
    if (filter === 'required') return all.filter((a) => pendingReadingIds.has(a.id))
    if (filter === 'saved') return all.filter((a) => savedIds.has(a.id))
    return all
  }, [all, filter, pendingReadingIds, savedIds])

  const recentlyUpdated = useMemo(
    () => [...all].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5),
    [all],
  )
  const popular = useMemo(
    () => [...all].filter((a) => (a.view_count ?? 0) > 0).sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 5),
    [all],
  )
  const needsReview = useMemo(
    () => all.filter((a) => a.next_review_date && Date.parse(a.next_review_date) < now).slice(0, 5),
    [all, now],
  )
  const required = useMemo(() => all.filter((a) => pendingReadingIds.has(a.id)), [all, pendingReadingIds])

  const setFilter = (next: TypeFilter) => {
    const params = new URLSearchParams(searchParams)
    params.delete('department')
    if (next === 'all') params.delete('type')
    else params.set('type', next)
    setSearchParams(params)
  }

  const filters: { id: TypeFilter; label: string; count?: number; icon?: LucideIcon; tone?: string }[] = [
    { id: 'all', label: t('hub.filter.all', 'All') },
    { id: 'sop', label: t('hub.filter.sop', 'SOPs'), icon: knowledgeTypeStyle('sop').icon, tone: knowledgeTypeStyle('sop').text },
    { id: 'guide', label: t('hub.filter.guide', 'Guides'), icon: knowledgeTypeStyle('guide').icon, tone: knowledgeTypeStyle('guide').text },
    { id: 'policy', label: t('hub.filter.policy', 'Policies'), icon: knowledgeTypeStyle('policy').icon, tone: knowledgeTypeStyle('policy').text },
    { id: 'required', label: t('hub.filter.required', 'Required reading'), count: pendingReadingIds.size, icon: FileCheck2, tone: 'text-ds-warning' },
    { id: 'saved', label: t('hub.filter.saved', 'Saved'), count: savedIds.size, icon: BookMarked, tone: 'text-ds-brass' },
  ]

  const scope = currentOrganization?.name ?? ''

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Search first */}
      <header className="relative space-y-5 overflow-hidden rounded-2xl border border-ds-border bg-gradient-to-br from-ds-accent-soft via-ds-surface to-ds-brass/10 p-5 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-ds-brass/10 blur-2xl" />
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{t('hub.eyebrow', 'Knowledge')}</p>
          <h1 className="font-editorial text-[34px] font-semibold leading-tight text-ds-ink sm:text-[42px]">
            {t('hub.title', 'What do you need to know?')}
          </h1>
        </div>
        <div role="search" className="relative">
          <label htmlFor="knowledge-search" className="sr-only">{t('hub.searchLabel', 'Search knowledge')}</label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ds-muted" />
          <input
            id="knowledge-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('hub.searchPlaceholder', 'Search SOPs, guides and policies - for example "late check-out"')}
            className="h-14 w-full rounded-[6px] border border-ds-border-strong bg-ds-surface ps-12 pe-12 text-base text-ds-ink placeholder:text-ds-muted focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              aria-label={t('hub.clearSearch', 'Clear search')}
              className="absolute end-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ds-muted hover:bg-ds-surface-subtle hover:text-ds-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                filter === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong'
              )}
            >
              {f.icon && <f.icon aria-hidden="true" className={cn('h-3.5 w-3.5', filter === f.id ? 'text-current' : f.tone)} />}
              {f.label}
              {!!f.count && <span className="font-mono text-xs tabular-nums opacity-70">{f.count}</span>}
            </button>
          ))}
          {scope && <span className="ms-auto hidden text-xs text-ds-muted sm:inline">{t('hub.scopeLine', 'Showing knowledge for {{scope}}', { scope })}</span>}
        </div>
      </header>

      {results.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
          <Skeleton variant="card" className="h-24" />
        </div>
      ) : isSearching ? (
        <Section
          id="kb-results"
          title={query
            ? t('hub.resultsFor', '{{count}} results for "{{q}}"', { count: shown.length, q: query })
            : t('hub.resultsCount', '{{count}} articles', { count: shown.length })}
        >
          {shown.length > 0 ? (
            <ArticleList articles={shown} now={now} />
          ) : (
            <EmptyState
              illustration="search"
              title={query ? t('hub.noResults', 'No articles match "{{q}}"', { q: query }) : t('hub.noResultsFilter', 'No articles here yet')}
              description={t('hub.noResultsHint', 'Try fewer words or another type. If an SOP should exist, tell your knowledge manager.')}
              action={
                <button type="button" onClick={() => { setText(''); setSearchParams(new URLSearchParams()) }} className="text-sm font-semibold text-ds-accent hover:underline">
                  {t('hub.clearFilters', 'Clear search and filters')}
                </button>
              }
            />
          )}
        </Section>
      ) : all.length === 0 ? (
        <EmptyState
          illustration="knowledge"
          title={t('hub.emptyTitle', 'No knowledge published yet')}
          description={can('content.author')
            ? t('hub.emptyAuthor', 'Write the first SOP, guide or policy for your teams.')
            : t('hub.emptyLearner', 'Your organization has not published any articles yet.')}
          action={can('content.author')
            ? <Link to="/studio/articles/new" className="text-sm font-semibold text-ds-accent hover:underline">{t('hub.writeFirst', 'Write an article')}</Link>
            : undefined}
        />
      ) : (
        <div className="space-y-10">
          {required.length > 0 && (
            <Section id="kb-required" title={t('hub.requiredTitle', 'Required reading')}>
              <div className="mb-1 flex items-center gap-2 text-sm text-ds-ink-secondary">
                <FileCheck2 aria-hidden="true" className="h-4 w-4 text-ds-warning" />
                {t('hub.requiredHint', 'Read these and confirm you have understood them.')}
              </div>
              <ArticleList articles={required.slice(0, 5)} now={now} />
            </Section>
          )}

          {(trending.data ?? []).length > 0 && (
            <Section id="kb-trending" title={t('hub.trendingTitle', 'Trending this week')}>
              <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {(trending.data ?? []).map((a, i) => {
                  const style = knowledgeTypeStyle(a.content_type)
                  const Icon = style.icon
                  return (
                    <li key={a.id} className="w-60 shrink-0 snap-start">
                      <Link
                        to={`/knowledge/${a.id}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-ds-border bg-ds-surface transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent motion-reduce:hover:translate-y-0"
                      >
                        <CourseCover course={{ id: a.id, title: a.title }} className="h-28 w-full rounded-none">
                          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-ds-surface/95 px-2 py-0.5 text-[11px] font-semibold text-ds-ink">
                            {i === 0 && <Flame aria-hidden="true" className="h-3 w-3 text-ds-warning" />}
                            #{i + 1}
                          </span>
                          <span className={cn('absolute bottom-2 start-2 inline-flex h-7 w-7 items-center justify-center rounded-md', style.soft, style.text)}>
                            <Icon aria-hidden="true" className="h-4 w-4" />
                          </span>
                        </CourseCover>
                        <span className="flex flex-1 flex-col gap-1.5 p-3">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug text-ds-ink group-hover:underline">{(i18nArabic && a.title_ar) || a.title}</span>
                          <span className="mt-auto inline-flex items-center gap-1 text-xs text-ds-muted">
                            <Users aria-hidden="true" className="h-3.5 w-3.5" />
                            {t('hub.readers', '{{count}} readers', { count: a.readers })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}

          <Section
            id="kb-role"
            title={departmentId ? t('hub.roleTitle', 'Relevant to your role') : t('hub.latestTitle', 'Latest for your organization')}
          >
            <ArticleList
              articles={(roleArticles.data ?? []).slice(0, 5)}
              now={now}
              emptyText={t('hub.roleEmpty', 'No articles are targeted at your department yet.')}
            />
          </Section>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section id="kb-recent" title={t('hub.recentTitle', 'Recently updated')}>
              <ArticleList articles={recentlyUpdated} now={now} />
            </Section>
            <Section id="kb-popular" title={t('hub.popularTitle', 'Most used by colleagues')}>
              <ArticleList
                articles={popular}
                now={now}
                emptyText={t('hub.popularEmpty', 'Popular articles appear here once people start reading.')}
              />
            </Section>
          </div>

          {can('content.publish') && needsReview.length > 0 && (
            <Section
              id="kb-review"
              title={t('hub.reviewTitle', 'Past their review date')}
              action={<Link to="/studio/review/articles" className="text-xs font-semibold text-ds-accent hover:underline">{t('hub.openReview', 'Open review queue')}</Link>}
            >
              <ArticleList articles={needsReview} now={now} />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
