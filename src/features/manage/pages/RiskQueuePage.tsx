/**
 * Manage > Risk queue - the Manage home.
 *
 * Starts from "what needs attention" and lets a manager drill from
 * department to the person and the item, then act. Counts are filters, not
 * decoration; every row leads to an action.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle, Award, ChevronRight, ClipboardList, FileQuestion, LineChart } from 'lucide-react'

import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, Skeleton } from '@/ui'

import { useRiskQueue } from '../hooks'
import { countRisks, groupRisks, sortByUrgency, type RiskItem, type RiskKind } from '../model'

type Filter = RiskKind | 'all'

const KIND_STYLE: Record<RiskKind, { stripe: string; pill: string; icon: typeof AlertTriangle }> = {
  overdue: { stripe: 'bg-ds-danger', pill: 'bg-ds-danger-soft text-ds-danger', icon: AlertTriangle },
  failed_quiz: { stripe: 'bg-ds-warning', pill: 'bg-ds-warning-soft text-ds-warning', icon: FileQuestion },
  expiring_certificate: { stripe: 'bg-ds-info', pill: 'bg-ds-info-soft text-ds-info', icon: Award },
}

function actionFor(item: RiskItem): string {
  if (item.kind === 'overdue') return `/manage/assignments?course=${item.itemId}`
  if (item.kind === 'failed_quiz') return `/manage/assignments/quizzes?quiz=${item.itemId}`
  return '/manage/certificates'
}

export default function RiskQueuePage() {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-US'
  const { currentOrganization } = useTenant()
  const query = useRiskQueue()
  const [filter, setFilter] = useState<Filter>('all')
  const [department, setDepartment] = useState<{ id: string | null; name: string | null } | null>(null)

  const inContext = useMemo(() => query.data ?? [], [query.data])
  const counts = useMemo(() => countRisks(inContext), [inContext])
  const departmentsNeedingReview = useMemo(
    () => groupRisks(inContext).filter((g) => g.id && g.counts.overdue > 0).length,
    [inContext],
  )

  const filtered = useMemo(
    () => inContext.filter((i) =>
      (filter === 'all' || i.kind === filter) &&
      (!department || i.departmentId === department.id)),
    [inContext, filter, department],
  )

  // Drill level: departments -> items. Skip it when there is only one department.
  const departmentGroups = useMemo(() => groupRisks(filtered), [filtered])
  const level: 'department' | 'items' = !department && departmentGroups.length > 1 ? 'department' : 'items'
  const urgent = useMemo(() => sortByUrgency(filtered), [filtered])

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''

  const statusText = (item: RiskItem) => {
    if (item.kind === 'overdue') return t('risk.overdueDays', '{{count}} days overdue', { count: item.daysOverdue ?? 0 })
    if (item.kind === 'failed_quiz') return t('risk.scored', 'Scored {{score}}%', { score: Math.round(item.score ?? 0) })
    return (item.daysOverdue ?? 0) > 0
      ? t('risk.expiredAgo', 'Expired {{date}}', { date: formatDate(item.dueDate) })
      : t('risk.expiresOn', 'Expires {{date}}', { date: formatDate(item.dueDate) })
  }

  const kindLabel: Record<RiskKind, string> = {
    overdue: t('risk.kind.overdue', 'Overdue assignments'),
    failed_quiz: t('risk.kind.failed_quiz', 'Quizzes below pass mark'),
    expiring_certificate: t('risk.kind.expiring_certificate', 'Certificates expiring'),
  }
  const actionLabel: Record<RiskKind, string> = {
    overdue: t('risk.action.overdue', 'Follow up'),
    failed_quiz: t('risk.action.failed_quiz', 'Reassign quiz'),
    expiring_certificate: t('risk.action.expiring_certificate', 'Plan recertification'),
  }

  const scopeName = currentOrganization?.name ?? ''

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-ds-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{t('risk.eyebrow', 'Manage')}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ds-ink sm:text-[28px]">{t('risk.title', 'What needs attention')}</h1>
          <p className="text-sm text-ds-muted">{scopeName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/manage/compliance" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-ds-border bg-ds-surface px-4 text-sm font-medium text-ds-ink hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
            <LineChart aria-hidden="true" className="h-4 w-4" />{t('risk.trends', 'Compliance trends')}
          </Link>
          <Link to="/manage/assignments" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-ds-ink px-4 text-sm font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent focus-visible:ring-offset-2">
            <ClipboardList aria-hidden="true" className="h-4 w-4" />{t('risk.assign', 'Assign training')}
          </Link>
        </div>
      </header>

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-20" />
          <Skeleton variant="card" className="h-64" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('risk.errorTitle', 'The risk queue could not be loaded')}
          message={t('risk.errorHint', 'Check your connection and try again. Nothing has been changed.')}
          onRetry={() => void query.refetch()}
        />
      ) : counts.total === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" aria-hidden="true" />}
          title={t('risk.clearTitle', 'Nothing needs attention')}
          description={t('risk.clearOrg', 'No overdue training, failed quizzes or expiring certificates in this organization.')}
          action={<Link to="/manage/tracking" className="text-sm font-semibold text-ds-accent hover:underline">{t('risk.seeTracking', 'See course progress')}</Link>}
        />
      ) : (
        <>
          {/* Summary as filters: one line a manager can read in two seconds */}
          <div role="group" aria-label={t('risk.filterLabel', 'Filter the queue')} className="grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border lg:grid-cols-4">
            {(['overdue', 'failed_quiz', 'expiring_certificate'] as RiskKind[]).map((kind) => {
              const Icon = KIND_STYLE[kind].icon
              const active = filter === kind
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(active ? 'all' : kind)}
                  className={cn(
                    'relative flex min-h-[76px] flex-col items-start justify-center gap-1 bg-ds-surface px-4 py-3 text-start transition-colors hover:bg-ds-surface-subtle focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent',
                    active && 'bg-ds-surface-subtle'
                  )}
                >
                  <span className={cn('absolute inset-x-0 top-0 h-[3px]', counts[kind] > 0 ? KIND_STYLE[kind].stripe : 'bg-transparent')} aria-hidden="true" />
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-medium tabular-nums text-ds-ink">{counts[kind]}</span>
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ds-muted" />
                  </span>
                  <span className="text-xs text-ds-muted">{kindLabel[kind]}</span>
                </button>
              )
            })}
            <div className="flex min-h-[76px] flex-col items-start justify-center gap-1 bg-ds-surface px-4 py-3">
              <span className="font-mono text-2xl font-medium tabular-nums text-ds-ink">{departmentsNeedingReview}</span>
              <span className="text-xs text-ds-muted">{t('risk.departmentsReview', 'Departments with overdue training')}</span>
            </div>
          </div>

          {/* Drill path */}
          <nav aria-label={t('risk.drillLabel', 'Drill-down')} className="flex flex-wrap items-center gap-1.5 text-sm">
            <button type="button" onClick={() => setDepartment(null)} className={cn('min-h-[36px] rounded px-1.5 font-medium hover:underline', !department ? 'text-ds-ink' : 'text-ds-accent')}>
              {t('risk.allDepartments', 'All departments')}
            </button>
            {department && (
              <>
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-ds-muted rtl:rotate-180" />
                <span className="px-1.5 font-medium text-ds-ink">{department.name ?? t('risk.noDepartment', 'No department assigned')}</span>
              </>
            )}
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')} className="ms-auto min-h-[36px] text-xs font-semibold text-ds-accent hover:underline">
                {t('risk.clearFilter', 'Show all types')}
              </button>
            )}
          </nav>

          {level !== 'items' ? (
            <section aria-labelledby="risk-groups" className="overflow-x-auto rounded-[6px] border border-ds-border bg-ds-surface">
              <h2 id="risk-groups" className="sr-only">{t('risk.byDepartment', 'By department')}</h2>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-ds-border bg-ds-background text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-muted">
                    <th scope="col" className="px-4 py-2.5 text-start">{t('risk.department', 'Department')}</th>
                    <th scope="col" className="px-4 py-2.5 text-end">{t('risk.col.overdue', 'Overdue')}</th>
                    <th scope="col" className="px-4 py-2.5 text-end">{t('risk.col.failed', 'Failed quizzes')}</th>
                    <th scope="col" className="px-4 py-2.5 text-end">{t('risk.col.expiring', 'Expiring')}</th>
                    <th scope="col" className="w-10 px-4 py-2.5"><span className="sr-only">{t('risk.open', 'Open')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {departmentGroups.map((g) => (
                    <tr key={g.id ?? 'none'} className="border-b border-ds-border/60 last:border-0 hover:bg-ds-surface-subtle">
                      <th scope="row" className="px-4 py-3 text-start font-medium text-ds-ink">
                        <button
                          type="button"
                          onClick={() => setDepartment({ id: g.id, name: g.name })}
                          className="min-h-[36px] text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                        >
                          {g.name ?? t('risk.noDepartment', 'No department assigned')}
                        </button>
                      </th>
                      <td className={cn('px-4 py-3 text-end font-mono tabular-nums', g.counts.overdue > 0 ? 'font-semibold text-ds-danger' : 'text-ds-muted')}>{g.counts.overdue}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums text-ds-ink">{g.counts.failed_quiz}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums text-ds-ink">{g.counts.expiring_certificate}</td>
                      <td className="px-4 py-3 text-end" aria-hidden="true"><ChevronRight className="ms-auto h-4 w-4 text-ds-muted rtl:rotate-180" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section aria-labelledby="risk-items" className="space-y-3">
            <h2 id="risk-items" className="text-base font-semibold text-ds-ink">
              {level === 'items' ? t('risk.people', 'People and items') : t('risk.mostUrgent', 'Most urgent')}
            </h2>
            {urgent.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-ds-border px-4 py-6 text-center text-sm text-ds-muted">
                {t('risk.noneForFilter', 'Nothing of this type here.')}{' '}
                <button type="button" onClick={() => setFilter('all')} className="font-semibold text-ds-accent hover:underline">{t('risk.clearFilter', 'Show all types')}</button>
              </p>
            ) : (
              <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                {urgent.slice(0, level === 'items' ? 200 : 8).map((item) => (
                  <li key={`${item.kind}-${item.userId}-${item.itemId}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className={cn('hidden h-9 w-[3px] shrink-0 rounded-full sm:block', KIND_STYLE[item.kind].stripe)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ds-ink">
                        <Link to={`/profile/${item.userId}`} className="hover:underline">{item.personName || t('risk.unknownPerson', 'Unnamed member')}</Link>
                        <span className="text-ds-muted"> · {item.itemTitle}</span>
                      </p>
                      <p className="truncate text-xs text-ds-muted">
                        {item.departmentName || t('risk.noPlacement', 'Not placed in a department')}
                      </p>
                    </div>
                    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-[4px] px-2 py-1 text-xs font-medium', KIND_STYLE[item.kind].pill)}>
                      {statusText(item)}
                    </span>
                    <Link
                      to={actionFor(item)}
                      className="inline-flex min-h-[40px] shrink-0 items-center gap-1 text-sm font-semibold text-ds-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
                    >
                      {actionLabel[item.kind]}
                      <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
