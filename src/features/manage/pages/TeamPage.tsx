/**
 * Manage > Team.
 *
 * "Which of my teams is falling behind?" Departments ranked worst first by
 * overdue training, each with completion against the 70% line, SOP
 * acknowledgement and who leads it. The first sentence names the biggest
 * problem so a manager knows where to go before reading the list.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight, Download } from 'lucide-react'

import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import { exportService } from '@/services/exportService'
import { EmptyState, ErrorState, Skeleton, WorkspaceHeader, headerActionClass } from '@/ui'

import { fetchDepartmentStandings, type DepartmentStanding } from '../teamApi'

const TARGET = 70

export default function TeamPage() {
  const { t } = useTranslation('training')
  const { currentOrganization } = useTenant()
  const orgId = currentOrganization?.id ?? null

  const query = useQuery({
    queryKey: ['team-standings', orgId],
    enabled: !!orgId,
    staleTime: 60 * 1000,
    queryFn: () => fetchDepartmentStandings(orgId as string),
  })

  const rows = useMemo(() => {
    return [...(query.data ?? [])].sort((a, b) => b.overdue - a.overdue || (a.trainingRate ?? 101) - (b.trainingRate ?? 101))
  }, [query.data])

  const withTraining = rows.filter((r) => r.assigned > 0)
  const below = withTraining.filter((r) => (r.trainingRate ?? 0) < TARGET).length
  const worst = rows[0]
  const totalOverdue = rows.reduce((n, r) => n + r.overdue, 0)

  const exportCsv = () => {
    const csv = exportService.convertToCSV(rows.map((d) => ({
      [t('team.col.department', 'Department')]: d.departmentName,
      [t('team.col.lead', 'Lead')]: d.headName ?? '',
      [t('team.col.people', 'People')]: d.staffCount,
      [t('team.col.assigned', 'Assigned')]: d.assigned,
      [t('team.col.completed', 'Completed')]: d.completed,
      [t('team.col.overdue', 'Overdue')]: d.overdue,
      [t('team.col.completion', 'Completion %')]: d.trainingRate ?? '',
      [t('team.col.sop', 'SOP acknowledgement %')]: d.sopRate ?? '',
    })))
    exportService.downloadFile(csv, `team-progress-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const headline = !worst
    ? null
    : totalOverdue > 0
      ? t('team.headline', '{{dept}} has the most overdue training ({{count}}). {{below}} of {{total}} departments are below {{target}}% completion.', {
          dept: worst.departmentName, count: worst.overdue, below, total: withTraining.length, target: TARGET,
        })
      : t('team.headlineClear', 'No overdue training. {{below}} of {{total}} departments are below {{target}}% completion.', { below, total: withTraining.length, target: TARGET })

  const Bar = ({ d }: { d: DepartmentStanding }) => {
    const rate = d.trainingRate
    if (rate === null) return <span className="text-sm text-ds-muted">{t('team.noTraining', 'No training assigned')}</span>
    return (
      <div className="w-full space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-ds-surface-subtle" role="img" aria-label={t('team.barLabel', '{{rate}}% of assigned training completed', { rate: Math.round(rate) })}>
          <div className={cn('h-full rounded-full', rate >= TARGET ? 'bg-ds-success' : rate >= 40 ? 'bg-ds-warning' : 'bg-ds-danger')} style={{ width: `${Math.min(100, rate)}%` }} />
          <span className="absolute inset-y-0 w-px bg-ds-ink/40" style={{ insetInlineStart: `${TARGET}%` }} aria-hidden="true" />
        </div>
        <p className="font-mono text-xs tabular-nums text-ds-muted">
          {t('team.completedOf', '{{done}} of {{assigned}} · {{rate}}%', { done: d.completed, assigned: d.assigned, rate: Math.round(rate) })}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('team.eyebrow', 'Manage')}
        title={t('team.title', 'Team progress')}
        context={currentOrganization?.name ?? null}
        actions={rows.length > 0 ? (
          <button type="button" onClick={exportCsv} className={headerActionClass.secondary}>
            <Download aria-hidden="true" className="h-4 w-4" />{t('team.export', 'Export CSV')}
          </button>
        ) : undefined}
      />

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true"><Skeleton variant="text" className="h-6 w-2/3" /><Skeleton variant="card" className="h-80" /></div>
      ) : query.isError ? (
        <ErrorState title={t('team.errorTitle', 'Team progress could not be loaded')} message={t('team.errorHint', 'Check your connection and try again. If it persists, your reporting access may have changed.')} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t('team.empty', 'No departments yet')}
          description={t('team.emptyBody', 'Departments appear here once they exist and have people placed in them.')}
          action={<Link to="/admin/structure?tab=departments" className="text-sm font-semibold text-ds-accent hover:underline">{t('team.setup', 'Set up departments')}</Link>}
        />
      ) : (
        <>
          {headline && <p className="max-w-3xl text-lg leading-relaxed text-ds-ink">{headline}</p>}

          <ol className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
            <li className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_90px_110px_32px] gap-6 bg-ds-background px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-muted md:grid" aria-hidden="true">
              <span>{t('team.col.department', 'Department')}</span>
              <span>{t('team.col.completionTarget', 'Completion (line = {{target}}%)', { target: TARGET })}</span>
              <span className="text-end">{t('team.col.overdue', 'Overdue')}</span>
              <span className="text-end">{t('team.col.sopShort', 'SOPs read')}</span>
              <span />
            </li>
            {rows.map((d) => (
              <li key={d.departmentId}>
                <Link
                  to="/manage/risk"
                  className="grid gap-3 px-5 py-4 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_90px_110px_32px] md:items-center md:gap-6"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-ds-ink">{d.departmentName}</span>
                    <span className="block truncate text-xs text-ds-muted">
                      {[d.headName ?? t('team.noLead', 'No manager'), t('team.people', '{{count}} people', { count: d.staffCount })].join(' · ')}
                    </span>
                  </span>
                  <Bar d={d} />
                  <span className={cn('font-mono text-lg tabular-nums md:text-end', d.overdue > 0 ? 'font-medium text-ds-danger' : 'text-ds-muted')}>
                    <span className="me-1 text-xs font-sans text-ds-muted md:hidden">{t('team.col.overdue', 'Overdue')}</span>{d.overdue}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ds-ink md:text-end">
                    <span className="me-1 text-xs font-sans text-ds-muted md:hidden">{t('team.col.sopShort', 'SOPs read')}</span>
                    {d.sopRate === null ? '—' : `${Math.round(d.sopRate)}%`}
                  </span>
                  <ChevronRight aria-hidden="true" className="hidden h-4 w-4 text-ds-muted md:block rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
