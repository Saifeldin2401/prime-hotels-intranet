import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { Crown, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SelectTenant() {
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization, 
    isLoading, 
    isPlatformAdmin, 
    exitImpersonation 
  } = useTenant()
  const account = useAccountContext()
  const { t, i18n } = useTranslation(['admin', 'common', 'nav'])
  const isRtl = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const location = useLocation()
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const handleSelectTenant = async (orgId: string) => {
    await switchOrganization(orgId)
    const destination = account.recommendedDestination && account.recommendedDestination !== '/platform'
      ? account.recommendedDestination
      : '/dashboard'
    navigate(destination)
  }

  const handleGoToPlatform = async () => {
    await exitImpersonation()
    navigate('/platform')
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-background p-4">
      <main className="w-full max-w-lg space-y-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">Altus Connect</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ds-ink sm:text-[28px]">
            {t('admin:select_organization', 'Choose an organization')}
          </h1>
          <p className="text-sm text-ds-muted">
            {t('admin:select_organization_subtitle', 'You belong to more than one. You can switch later from the top bar.')}
          </p>
        </div>

        {isPlatformAdmin && (
          <button
            type="button"
            onClick={handleGoToPlatform}
            className="group flex w-full items-center justify-between gap-3 rounded-[6px] border border-ds-border bg-ds-surface px-4 py-3.5 text-start hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ds-ink text-ds-on-ink">
                <Crown aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ds-ink">{t('admin:platform_control_plane', 'Platform')}</span>
                <span className="block truncate text-xs text-ds-muted">{t('admin:operate_at_platform_level', 'Every organization, master content and operations')}</span>
              </span>
            </span>
            <ArrowIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted group-hover:text-ds-ink" />
          </button>
        )}

        {organizations.length === 0 ? (
          <p className="rounded-[6px] border border-dashed border-ds-border px-4 py-8 text-center text-sm text-ds-muted">
            {t('admin:no_organizations_available', 'No active organizations found for your account.')}
          </p>
        ) : (
          <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
            {organizations.map((org) => {
              const isSelected = currentOrganization?.id === org.id
              return (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTenant(org.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                        isSelected ? 'bg-ds-ink text-ds-on-ink' : 'border border-ds-border text-ds-ink')}>
                        {org.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ds-ink">{org.name}</span>
                        {isSelected
                          ? <span className="block text-xs text-ds-accent">{t('admin:current_organization', 'Current')}</span>
                          : org.industry && <span className="block text-xs capitalize text-ds-muted">{org.industry}</span>}
                      </span>
                    </span>
                    {isSelected
                      ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-accent" />
                      : <ArrowIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted group-hover:text-ds-ink" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
