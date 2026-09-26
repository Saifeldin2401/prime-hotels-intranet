/**
 * Organization > Audit.
 *
 * The organization's record of who changed what, read as a timeline grouped
 * by day rather than a spreadsheet. Each entry is a sentence (person, action,
 * thing); the raw details stay folded until someone needs them. Older entries
 * load on request, and the current view exports as CSV for auditors.
 */

import { Fragment, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download, Search, X } from 'lucide-react'

import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import { exportService } from '@/services/exportService'
import { EmptyState, ErrorState, Skeleton, WorkspaceHeader, headerActionClass } from '@/ui'

import { fetchAuditPage, type AuditEntry, type AuditPeriod } from '../auditApi'

const PAGE = 50
const ENTITY_TYPES = ['user', 'membership', 'document', 'course', 'quiz', 'certificate', 'assignment', 'organization', 'settings', 'hotel', 'department']

export default function AuditPage() {
  const { t, i18n } = useTranslation('admin')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null
  const [period, setPeriod] = useState<AuditPeriod>('7days')
  const [entityType, setEntityType] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filters = { organizationId: orgId ?? '', period, entityType, search }
  const query = useInfiniteQuery({
    queryKey: ['org-audit', filters],
    enabled: !!orgId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchAuditPage(filters, pageParam, PAGE),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.entries.length, 0)
      return loaded < last.total ? loaded : undefined
    },
  })

  const entries = useMemo(() => query.data?.pages.flatMap((p) => p.entries) ?? [], [query.data])
  const total = query.data?.pages[0]?.total ?? 0

  const days = useMemo(() => {
    const map = new Map<string, AuditEntry[]>()
    for (const e of entries) {
      const key = e.createdAt.slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
  }, [entries])

  const dayLabel = (key: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (key === today) return t('auditTimeline.today', 'Today')
    if (key === yesterday) return t('auditTimeline.yesterday', 'Yesterday')
    return new Date(key).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const actionText = (a: string) => t(`auditTimeline.action.${a}`, a.replace(/_/g, ' '))
  const entityText = (e: string) => t(`auditTimeline.entity.${e}`, e.replace(/_/g, ' '))

  const exportCsv = () => {
    const csv = exportService.convertToCSV(entries.map((e) => ({
      [t('auditTimeline.csv.when', 'When')]: e.createdAt,
      [t('auditTimeline.csv.who', 'Who')]: e.actorName ?? t('auditTimeline.system', 'System'),
      [t('auditTimeline.csv.action', 'Action')]: e.action,
      [t('auditTimeline.csv.entity', 'Entity')]: e.entityType,
      [t('auditTimeline.csv.entityId', 'Entity ID')]: e.entityId,
      [t('auditTimeline.csv.ip', 'IP address')]: e.ipAddress ?? '',
      [t('auditTimeline.csv.details', 'Details')]: e.details ? JSON.stringify(e.details) : '',
    })))
    exportService.downloadFile(csv, `audit-${currentOrganization?.name ?? 'organization'}-${new Date().toISOString().slice(0, 10)}.csv`.replace(/\s+/g, '-').toLowerCase())
  }

  const periods: { id: AuditPeriod; label: string }[] = [
    { id: 'today', label: t('auditTimeline.period.today', 'Today') },
    { id: '7days', label: t('auditTimeline.period.7days', '7 days') },
    { id: '30days', label: t('auditTimeline.period.30days', '30 days') },
    { id: '90days', label: t('auditTimeline.period.90days', '90 days') },
    { id: 'all', label: t('auditTimeline.period.all', 'All time') },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('auditTimeline.eyebrow', 'Organization')}
        title={t('auditTimeline.title', 'Audit trail')}
        context={query.isLoading ? null : t('auditTimeline.summary', '{{count}} recorded actions in this period', { count: total })}
        actions={entries.length > 0 ? (
          <button type="button" onClick={exportCsv} className={headerActionClass.secondary}>
            <Download aria-hidden="true" className="h-4 w-4" />{t('auditTimeline.export', 'Export what is shown')}
          </button>
        ) : undefined}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label={t('auditTimeline.periodLabel', 'Period')} className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}
              className={cn('min-h-[40px] rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                period === p.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong')}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 gap-2 lg:justify-end">
          <label className="sr-only" htmlFor="audit-entity">{t('auditTimeline.entityLabel', 'What changed')}</label>
          <select id="audit-entity" value={entityType} onChange={(e) => setEntityType(e.target.value)}
            className="h-10 rounded-md border border-ds-border bg-ds-surface px-2 text-sm text-ds-ink focus:outline-none focus:ring-2 focus:ring-ds-accent">
            <option value="all">{t('auditTimeline.allEntities', 'Everything')}</option>
            {ENTITY_TYPES.map((e) => <option key={e} value={e}>{entityText(e)}</option>)}
          </select>
          <div role="search" className="relative w-full max-w-xs">
            <label htmlFor="audit-search" className="sr-only">{t('auditTimeline.searchLabel', 'Search actions')}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
            <input id="audit-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('auditTimeline.searchPlaceholder', 'Search actions')}
              className="h-10 w-full rounded-md border border-ds-border bg-ds-surface ps-9 pe-9 text-sm text-ds-ink focus:border-ds-accent focus:outline-none focus:ring-2 focus:ring-ds-accent/30" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label={t('auditTimeline.clear', 'Clear search')} className="absolute end-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center text-ds-muted"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true"><Skeleton variant="text" className="h-5 w-40" /><Skeleton variant="card" className="h-72" /></div>
      ) : query.isError ? (
        <ErrorState title={t('auditTimeline.errorTitle', 'The audit trail could not be loaded')} message={t('auditTimeline.errorHint', 'Check your connection and try again. Audit access requires the audit permission for this organization.')} onRetry={() => void query.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          title={t('auditTimeline.emptyTitle', 'No recorded actions in this period')}
          description={t('auditTimeline.emptyBody', 'Try a longer period or clear the filters. Changes to people, content and settings are recorded here automatically.')}
        />
      ) : (
        <div className="space-y-10">
          {days.map(([key, list]) => (
            <section key={key} aria-labelledby={`audit-${key}`}>
              <h2 id={`audit-${key}`} className="sticky top-14 z-10 bg-ds-background py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{dayLabel(key)}</h2>
              <ol className="relative ms-2 border-s border-ds-border">
                {list.map((e) => (
                  <li key={e.id} className="relative ps-6 pb-5 last:pb-0">
                    <span className={cn('absolute -start-[5px] top-1.5 h-[9px] w-[9px] rounded-full ring-4 ring-ds-background', e.actorId ? 'bg-ds-ink' : 'bg-ds-border-strong')} aria-hidden="true" />
                    <div className="flex flex-wrap items-baseline gap-x-2 text-[15px] text-ds-ink">
                      <span className="font-mono text-xs tabular-nums text-ds-muted">{time(e.createdAt)}</span>
                      <span className="font-semibold">{e.actorName ?? t('auditTimeline.system', 'System')}</span>
                      <span>{actionText(e.action)}</span>
                      <span className="text-ds-ink-secondary">{entityText(e.entityType)}</span>
                    </div>
                    {(e.details || e.entityId || e.ipAddress) && (
                      <details className="mt-1 text-sm text-ds-muted">
                        <summary className="cursor-pointer select-none hover:text-ds-ink">{t('auditTimeline.details', 'Details')}</summary>
                        <dl className="mt-2 grid gap-1 rounded-[4px] bg-ds-surface-subtle p-3 font-mono text-xs text-ds-ink-secondary sm:grid-cols-[120px_minmax(0,1fr)]">
                          {e.entityId && <><dt>{t('auditTimeline.csv.entityId', 'Entity ID')}</dt><dd className="break-all">{e.entityId}</dd></>}
                          {e.ipAddress && <><dt>{t('auditTimeline.csv.ip', 'IP address')}</dt><dd>{e.ipAddress}</dd></>}
                          {e.details && Object.entries(e.details).map(([k, v]) => (
                            <Fragment key={k}><dt>{k}</dt><dd className="break-all">{typeof v === 'string' ? v : JSON.stringify(v)}</dd></Fragment>
                          ))}
                        </dl>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {query.hasNextPage && (
            <button type="button" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}
              className="w-full min-h-[44px] rounded-md border border-ds-border text-sm font-semibold text-ds-ink hover:bg-ds-surface-subtle disabled:opacity-50">
              {query.isFetchingNextPage ? t('auditTimeline.loading', 'Loading…') : t('auditTimeline.older', 'Show older actions')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
