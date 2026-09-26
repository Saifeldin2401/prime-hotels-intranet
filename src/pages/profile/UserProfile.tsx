/**
 * A colleague's profile - who they are, where they sit and how to reach them.
 *
 * Contact first (that is why people open it), then place in the organization
 * with the manager and team as links, then skills. The training record is
 * folded: it matters to managers, not to everyone who looks someone up.
 */

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { ArrowLeft, Mail } from 'lucide-react'

import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePublicProfile } from '@/features/account/colleagueApi'
import { cn } from '@/lib/utils'
import { EmptyState, ErrorState, Skeleton, headerActionClass } from '@/ui'
import EmployeeTrainingHistory from './EmployeeTrainingHistory'

const isValidUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

function initials(name?: string | null) {
  return name ? name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?'
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['profile', 'common'])
  const dfLocale = i18n.language?.startsWith('ar') ? ar : enGB
  const valid = isValidUuid(id)
  const { data: profile, isLoading, error, refetch } = usePublicProfile(id, valid)

  const back = (
    <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-[40px] items-center gap-1.5 text-sm text-ds-muted hover:text-ds-ink">
      <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />{t('common:go_back', 'Back')}
    </button>
  )

  if (!valid) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <EmptyState title={t('profile:colleague.notFound', 'This profile does not exist')} description={t('profile:colleague.notFoundBody', 'The link may be incomplete or out of date.')} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" aria-busy="true">
        <Skeleton variant="card" className="h-24" />
        <Skeleton variant="card" className="h-48" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ErrorState title={t('profile:colleague.loadFailed', 'This profile could not be loaded')} onRetry={() => refetch()} />
      </div>
    )
  }

  const reports = Array.isArray(profile.direct_reports) ? profile.direct_reports : []
  const certifications = profile.certifications ?? []
  const place = [
    { label: t('profile:colleague.hotels', 'Hotel'), value: (profile.property_names ?? []).join(', ') },
    { label: t('profile:colleague.departments', 'Department'), value: (profile.department_names ?? []).join(', ') },
    {
      label: t('profile:reports_to', 'Reports to'),
      value: profile.manager_id && profile.manager_name ? (
        <Link to={`/profile/${profile.manager_id}`} className="font-medium text-ds-accent hover:underline">
          {profile.manager_name}{profile.manager_title ? <span className="font-normal text-ds-muted"> · {profile.manager_title}</span> : null}
        </Link>
      ) : null,
    },
    { label: t('profile:hire_date', 'Joined'), value: profile.joining_date ? format(new Date(profile.joining_date), 'MMMM yyyy', { locale: dfLocale }) : null },
    { label: t('profile:staff_id', 'Staff ID'), value: profile.staff_id },
  ].filter((r) => !!r.value)

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {back}

      {/* Identity + contact */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarImage src={profile.avatar_url || undefined} className="object-cover" alt="" />
          <AvatarFallback className="bg-ds-ink text-xl text-ds-on-ink">{initials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ds-ink">{profile.full_name}</h1>
          {profile.job_title && <p className="text-sm text-ds-muted">{profile.job_title}</p>}
          {!profile.is_active && (
            <p className="mt-1 inline-block rounded-[3px] bg-ds-surface-subtle px-1.5 py-0.5 text-xs text-ds-muted">
              {t('profile:colleague.inactive', 'No longer active')}
            </p>
          )}
        </div>
        {profile.work_email && (
          <a href={`mailto:${profile.work_email}`} className={headerActionClass.primary}>
            <Mail aria-hidden="true" className="h-4 w-4" />{t('profile:colleague.email', 'Email')}
          </a>
        )}
      </header>

      <dl className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
        {profile.work_email && (
          <Row label={t('profile:email', 'Email')}>
            <a href={`mailto:${profile.work_email}`} className="break-all text-ds-ink hover:text-ds-accent" dir="ltr">{profile.work_email}</a>
          </Row>
        )}
        {profile.phone_extension && (
          <Row label={t('profile:me.extension', 'Desk extension')}><span dir="ltr">{profile.phone_extension}</span></Row>
        )}
        {place.map((r) => <Row key={r.label} label={r.label}>{r.value}</Row>)}
      </dl>

      {profile.bio && (
        <section aria-labelledby="colleague-bio" className="space-y-2">
          <h2 id="colleague-bio" className="text-lg font-semibold text-ds-ink">{t('profile:me.bio', 'Introduction')}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ds-ink-secondary">{profile.bio}</p>
        </section>
      )}

      {reports.length > 0 && (
        <section aria-labelledby="colleague-team" className="space-y-3">
          <h2 id="colleague-team" className="text-lg font-semibold text-ds-ink">
            {t('profile:colleague.team', 'Team')} <span className="font-mono text-sm font-normal tabular-nums text-ds-muted">{reports.length}</span>
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-[6px] border border-ds-border bg-ds-border sm:grid-cols-2">
            {reports.map((r) => (
              <li key={r.id} className="bg-ds-surface">
                <Link to={`/profile/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.avatar_url || undefined} alt="" />
                    <AvatarFallback className="text-xs">{initials(r.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ds-ink">{r.full_name}</span>
                    {r.job_title && <span className="block truncate text-xs text-ds-muted">{r.job_title}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="colleague-skills" className="space-y-3 border-t border-ds-border pt-8">
        <h2 id="colleague-skills" className="text-lg font-semibold text-ds-ink">{t('profile:skills_and_competencies', 'Skills')}</h2>
        <UserSkillsDisplay userId={id} />
        {certifications.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-ds-ink">{t('profile:certifications', 'Certifications')}</h3>
            <ul className="flex flex-wrap gap-2">
              {certifications.map((c) => (
                <li key={c} className="rounded-[3px] border border-ds-border px-2 py-0.5 text-xs text-ds-ink">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <details className="group border-t border-ds-border pt-6">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-lg font-semibold text-ds-ink">
          {t('profile:colleague.training', 'Training record')}
          <span aria-hidden="true" className="text-sm font-normal text-ds-muted group-open:hidden">{t('profile:colleague.show', 'Show')}</span>
        </summary>
        <div className={cn('pt-4')}>
          <EmployeeTrainingHistory userId={id} />
        </div>
      </details>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="text-sm text-ds-muted sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 text-sm text-ds-ink">{children}</dd>
    </div>
  )
}
