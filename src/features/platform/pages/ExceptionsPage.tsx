/**
 * Platform > Exceptions - the operator console home.
 *
 * "Which organization or operation needs attention?" Only exceptions are
 * listed, each linked to where an operator resolves it. Fleet totals and
 * global search live on the statistics page one step away.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BarChart3, Building2 } from 'lucide-react'

import { EmptyState, ErrorState, ExceptionGroup, Skeleton, WorkspaceHeader, headerActionClass, type ExceptionItem, type ExceptionTone } from '@/ui'

import { usePlatformExceptions } from '../hooks'
import { PLATFORM_EXCEPTION_ORDER, type PlatformException, type PlatformExceptionKind } from '../model'

const TONE: Record<PlatformExceptionKind, ExceptionTone> = {
  failed_job: 'danger',
  suspended_organization: 'danger',
  subscription_problem: 'warning',
  organization_without_admin: 'warning',
  trial_ending: 'info',
  active_session: 'neutral',
}

function hrefFor(item: PlatformException): string {
  if (item.kind === 'failed_job') return '/platform/operations'
  if (item.kind === 'active_session') return '/platform/audit'
  return item.organizationId ? `/platform/organizations/${item.organizationId}` : '/platform/organizations'
}

export default function ExceptionsPage() {
  const { t, i18n } = useTranslation('admin')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const query = usePlatformExceptions()

  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

  const copy: Record<PlatformExceptionKind, { title: string; description: string; action: string }> = {
    failed_job: {
      title: t('exceptions.failed_job.title', 'Failed jobs in the last 7 days'),
      description: t('exceptions.failed_job.body', 'AI course generation that did not finish. Retry or inspect the error.'),
      action: t('exceptions.failed_job.action', 'Open operations'),
    },
    suspended_organization: {
      title: t('exceptions.suspended_organization.title', 'Suspended organizations'),
      description: t('exceptions.suspended_organization.body', 'Their members cannot sign in to learn.'),
      action: t('exceptions.suspended_organization.action', 'Review'),
    },
    subscription_problem: {
      title: t('exceptions.subscription_problem.title', 'Billing problems'),
      description: t('exceptions.subscription_problem.body', 'Subscriptions that are past due, unpaid or cancelled.'),
      action: t('exceptions.subscription_problem.action', 'Review'),
    },
    organization_without_admin: {
      title: t('exceptions.organization_without_admin.title', 'Organizations without an admin'),
      description: t('exceptions.organization_without_admin.body', 'Nobody in the organization can invite people or change settings.'),
      action: t('exceptions.organization_without_admin.action', 'Assign admin'),
    },
    trial_ending: {
      title: t('exceptions.trial_ending.title', 'Trials ending within 14 days'),
      description: t('exceptions.trial_ending.body', 'Agree a plan before access changes.'),
      action: t('exceptions.trial_ending.action', 'Review plan'),
    },
    active_session: {
      title: t('exceptions.active_session.title', 'Open operator sessions inside organizations'),
      description: t('exceptions.active_session.body', 'Break-glass access in progress. Every action is audited.'),
      action: t('exceptions.active_session.action', 'View audit'),
    },
  }

  const metaFor = (item: PlatformException) => {
    if (item.kind === 'failed_job') return [item.detail, when(item.since)].filter(Boolean).join(' · ')
    if (item.kind === 'trial_ending') return t('exceptions.endsOn', 'Ends {{date}}', { date: when(item.since) })
    if (item.kind === 'subscription_problem') return item.detail ?? undefined
    if (item.kind === 'active_session') return [item.detail, t('exceptions.startedAt', 'started {{date}}', { date: when(item.since) })].filter(Boolean).join(' · ')
    return undefined
  }

  const groups = query.data
  const total = groups ? [...groups.values()].reduce((n, list) => n + list.length, 0) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('exceptions.eyebrow', 'Altus platform')}
        title={t('exceptions.title', 'Exceptions')}
        context={query.isLoading
          ? null
          : total > 0
            ? t('exceptions.count', '{{count}} items need an operator', { count: total })
            : t('exceptions.none', 'All organizations and operations are healthy.')}
        actions={
          <>
            <Link to="/platform/control-center" className={headerActionClass.secondary}><BarChart3 aria-hidden="true" className="h-4 w-4" />{t('exceptions.statistics', 'Platform statistics')}</Link>
            <Link to="/platform/organizations" className={headerActionClass.primary}><Building2 aria-hidden="true" className="h-4 w-4" />{t('exceptions.organizations', 'Organizations')}</Link>
          </>
        }
      />

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-40" />
          <Skeleton variant="card" className="h-40" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('exceptions.errorTitle', 'Exceptions could not be loaded')}
          message={t('exceptions.errorHint', 'Check your connection and operator permissions, then try again.')}
          onRetry={() => void query.refetch()}
        />
      ) : total === 0 ? (
        <EmptyState
          title={t('exceptions.clearTitle', 'Nothing needs an operator')}
          description={t('exceptions.clearBody', 'No failed jobs, suspended organizations, billing problems or open sessions.')}
        />
      ) : (
        <div className="space-y-4">
          {PLATFORM_EXCEPTION_ORDER.map((kind) => {
            const items: ExceptionItem[] = (groups?.get(kind) ?? []).map((item) => ({
              id: `${kind}-${item.subjectId}`,
              title: item.organizationName ?? t('exceptions.noOrganization', 'No organization'),
              meta: metaFor(item),
              href: hrefFor(item),
              actionLabel: copy[kind].action,
            }))
            return (
              <ExceptionGroup
                key={kind}
                tone={TONE[kind]}
                title={copy[kind].title}
                description={copy[kind].description}
                items={items}
                showAllLabel={(n) => t('overview.showAll', 'Show all {{count}}', { count: n })}
                showLessLabel={t('overview.showLess', 'Show fewer')}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
