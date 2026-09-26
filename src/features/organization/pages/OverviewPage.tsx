/**
 * Organization > Overview - the Organization workspace home.
 *
 * "What organization action is blocked?" Setup gaps come first, grouped by
 * kind with the action that resolves each one; the organization's structure
 * and administration areas follow as a plain index.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Building, ChevronRight, ClipboardList, Settings, UserPlus, Users, type LucideIcon } from 'lucide-react'

import { TenantOnboardingGuide } from '@/components/onboarding/TenantOnboardingGuide'
import { useTenant } from '@/contexts/TenantContext'
import { useCapabilities } from '@/hooks/useCapabilities'
import { EmptyState, ErrorState, ExceptionGroup, Skeleton, WorkspaceHeader, headerActionClass, type ExceptionItem, type ExceptionTone } from '@/ui'

import { useSetupGaps } from '../hooks'
import { SETUP_GAP_ORDER, type SetupGap, type SetupGapKind } from '../model'

const TONE: Record<SetupGapKind, ExceptionTone> = {
  unplaced_member: 'danger',
  expired_invitation: 'warning',
  pending_invitation: 'neutral',
  department_without_manager: 'info',
  missing_logo: 'neutral',
}

function hrefFor(gap: SetupGap): string {
  switch (gap.kind) {
    case 'unplaced_member':
      return '/admin/structure?tab=memberships'
    case 'pending_invitation':
    case 'expired_invitation':
      return '/admin/invitations'
    case 'department_without_manager':
      return '/admin/structure?tab=departments'
    case 'missing_logo':
      return '/admin/settings'
  }
}

export default function OverviewPage() {
  const { t, i18n } = useTranslation('admin')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const { currentOrganization } = useTenant()
  const { can } = useCapabilities()
  const query = useSetupGaps()

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '')

  const copy: Record<SetupGapKind, { title: string; description: string; action: string }> = {
    unplaced_member: {
      title: t('overview.gaps.unplaced_member.title', 'People not placed in a department'),
      description: t('overview.gaps.unplaced_member.body', 'They miss training assigned by department, and no manager follows them up.'),
      action: t('overview.gaps.unplaced_member.action', 'Place'),
    },
    expired_invitation: {
      title: t('overview.gaps.expired_invitation.title', 'Invitations that expired'),
      description: t('overview.gaps.expired_invitation.body', 'These people never joined. Resend or cancel the invitation.'),
      action: t('overview.gaps.expired_invitation.action', 'Resend'),
    },
    pending_invitation: {
      title: t('overview.gaps.pending_invitation.title', 'Invitations waiting to be accepted'),
      description: t('overview.gaps.pending_invitation.body', 'Sent but not accepted yet.'),
      action: t('overview.gaps.pending_invitation.action', 'View'),
    },
    department_without_manager: {
      title: t('overview.gaps.department_without_manager.title', 'Departments without a manager'),
      description: t('overview.gaps.department_without_manager.body', 'Overdue training in these departments has no one to follow it up.'),
      action: t('overview.gaps.department_without_manager.action', 'Assign manager'),
    },
    missing_logo: {
      title: t('overview.gaps.missing_logo.title', 'No organization logo'),
      description: t('overview.gaps.missing_logo.body', 'Certificates, emails and the sign-in page show the Altus mark instead of yours.'),
      action: t('overview.gaps.missing_logo.action', 'Add logo'),
    },
  }

  const metaFor = (gap: SetupGap): string | undefined => {
    if (gap.kind === 'unplaced_member') return t(`overview.missing.${gap.detail}`, gap.detail ?? '')
    if (gap.kind === 'pending_invitation' || gap.kind === 'expired_invitation')
      return [t(`nav:shell.roles.${gap.detail}`, gap.detail ?? ''), date(gap.since)].filter(Boolean).join(' · ')
    if (gap.kind === 'department_without_manager') return gap.detail ?? undefined
    return undefined
  }

  const groups = query.data
  const total = groups ? [...groups.values()].reduce((n, list) => n + list.length, 0) : 0

  const areas: { to: string; icon: LucideIcon; title: string; body: string; show: boolean }[] = [
    { to: '/admin/users', icon: Users, title: t('overview.areas.people', 'People'), body: t('overview.areas.peopleHint', 'Members, roles and access'), show: can('people.manage') || can('org.admin') },
    { to: '/admin/structure', icon: Building, title: t('overview.areas.structure_org', 'Structure'), body: t('overview.areas.structureHint_org', 'Departments and reporting lines'), show: can('org.admin') },
    { to: '/admin/settings', icon: Settings, title: t('overview.areas.settings', 'Settings'), body: t('overview.areas.settingsHint', 'Profile, branding and policies'), show: can('org.settings') },
    { to: '/admin/audit', icon: ClipboardList, title: t('overview.areas.audit', 'Audit'), body: t('overview.areas.auditHint', 'Who changed what, and when'), show: can('audit.view') },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('overview.eyebrow', 'Organization')}
        title={currentOrganization?.name ?? t('overview.title', 'Organization overview')}
        context={query.isLoading
          ? null
          : total > 0
            ? t('overview.needsAttention', '{{count}} setup items need attention', { count: total })
            : t('overview.allSet', 'Setup is complete. Nothing is blocking your teams.')}
        actions={<Link to="/admin/invitations" className={headerActionClass.primary}><UserPlus aria-hidden="true" className="h-4 w-4" />{t('overview.invite', 'Invite people')}</Link>}
      />

      <TenantOnboardingGuide />

      {query.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton variant="card" className="h-40" />
          <Skeleton variant="card" className="h-40" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title={t('overview.errorTitle', 'Setup checks could not be loaded')}
          message={t('overview.errorHint', 'Check your connection and try again.')}
          onRetry={() => void query.refetch()}
        />
      ) : total === 0 ? (
        <EmptyState
          title={t('overview.clearTitle', 'Nothing is blocking your teams')}
          description={t('overview.clearBody', 'Everyone is placed and every department has a manager.')}
        />
      ) : (
        <div className="space-y-4">
          {SETUP_GAP_ORDER.map((kind) => {
            const list = groups?.get(kind) ?? []
            const items: ExceptionItem[] = list.map((gap) => ({
              id: `${kind}-${gap.subjectId}`,
              title: gap.subjectName || t('overview.unnamed', 'Unnamed'),
              meta: metaFor(gap),
              href: hrefFor(gap),
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

      <section aria-labelledby="org-areas" className="space-y-3">
        <h2 id="org-areas" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{t('overview.manage', 'Manage the organization')}</h2>
        <ul className="grid gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-2">
          {areas.filter((a) => a.show).map((a) => (
            <li key={a.to} className="bg-ds-surface">
              <Link to={a.to} className="group flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent">
                <a.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ds-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ds-ink">{a.title}</span>
                  <span className="block truncate text-xs text-ds-muted">{a.body}</span>
                </span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-ds-muted rtl:rotate-180" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
