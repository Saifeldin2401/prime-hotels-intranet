import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Award, ChevronDown, Compass, Crown, LogOut, Menu, PlayCircle, Search, Settings, Trophy, UserRound } from 'lucide-react'

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/hooks/useAuth'
import { useWizard } from '@/hooks/useWizard'
import { DropdownMenu } from '@/ui'

import { useShellContext } from './useShellContext'

interface TopBarProps {
  onOpenSearch: () => void
  onOpenContext: () => void
  onOpenMobileMenu: () => void
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

/**
 * The top bar answers "where am I" before anything else: the organization,
 * department and role are one tap away from the context switcher. Search,
 * notifications and the member's own menu sit at the end.
 */
export function TopBar({ onOpenSearch, onOpenContext, onOpenMobileMenu }: TopBarProps) {
  const { t } = useTranslation(['nav', 'common', 'wizard'])
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const { openWhatCanIDo, startTour } = useWizard()
  const { isPlatformAdmin, returnToPlatformScope } = useTenant()
  const ctx = useShellContext()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || ''
  const place = ctx.isPlatformPlane
    ? t('shell.platformPlaneShort', 'Altus platform')
    : [ctx.organizationName, ctx.departmentName].filter(Boolean).join(' › ')

  return (
    <header className="sticky top-0 z-40 border-b border-ds-border bg-ds-surface/95 supports-[backdrop-filter]:bg-ds-surface/90">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label={t('openMenu', 'Open navigation menu')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ds-ink hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        {/* Context: organization › department · role */}
        <button
          type="button"
          onClick={onOpenContext}
          aria-label={t('shell.openContext', 'Working in {{place}}. Change context', { place: place || '…' })}
          className="group flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-md px-2 text-start hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
        >
          {ctx.isPlatformPlane ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-ds-chrome text-ds-chrome-accent" aria-hidden="true">
              <Crown className="h-4 w-4" />
            </span>
          ) : ctx.organizationLogo ? (
            <img src={ctx.organizationLogo} alt="" className="h-8 w-8 shrink-0 rounded-[4px] border border-ds-border object-contain" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-ds-accent-soft text-xs font-semibold text-ds-accent" aria-hidden="true">
              {initials(ctx.organizationName ?? 'A')}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ds-ink max-w-[46vw] sm:max-w-[320px]">{place || '…'}</span>
            {ctx.roleLabel && (
              <span className="block truncate text-xs text-ds-muted">
                {[ctx.departmentName, ctx.roleLabel].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ds-muted transition-transform group-hover:translate-y-0.5" />
        </button>

        {ctx.isOperatorSession && (
          <span className="hidden rounded-[4px] bg-ds-warning-soft px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ds-warning md:inline">
            {t('shell.operatorSession', 'Operator session')}
          </span>
        )}

        <div className="flex-1" />

        {/* Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-10 w-full max-w-[340px] items-center gap-2.5 rounded-md border border-ds-border bg-ds-background px-3 text-sm text-ds-muted hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent md:flex"
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          <span className="flex-1 truncate text-start">{t('shell.searchPlaceholder', 'Search courses, articles, people…')}</span>
          <kbd className="rounded-[3px] border border-ds-border bg-ds-surface px-1.5 font-mono text-[10px] text-ds-muted">Ctrl K</kbd>
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t('search', 'Search')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ds-ink hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent md:hidden"
        >
          <Search aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <LanguageSwitcher variant="ghost" className="h-10 px-2 text-xs font-semibold text-ds-ink hover:bg-ds-surface-subtle" />
        </div>
        <NotificationBell />

        <DropdownMenu
          align="end"
          header={
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ds-ink">{displayName}</p>
              <p className="truncate text-xs text-ds-muted">{user?.email}</p>
            </div>
          }
          trigger={
            <button
              type="button"
              aria-label={t('user_menu', 'Account menu')}
              className="ms-1 inline-flex h-11 items-center gap-2 rounded-full ps-1 pe-2 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-ink text-xs font-semibold text-ds-on-ink" aria-hidden="true">
                  {initials(displayName || 'U')}
                </span>
              )}
              <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-ds-muted sm:block" />
            </button>
          }
          items={[
            { id: 'profile', label: t('my_profile', 'My profile'), icon: <UserRound className="h-4 w-4" />, onClick: () => navigate('/profile') },
            { id: 'certificates', label: t('my_certificates', 'Certificates'), icon: <Award className="h-4 w-4" />, onClick: () => navigate('/learn/certificates') },
            { id: 'achievements', label: t('workspace.achievements', 'Achievements'), icon: <Trophy className="h-4 w-4" />, onClick: () => navigate('/learn/achievements') },
            { id: 'settings', label: t('settings', 'Settings'), icon: <Settings className="h-4 w-4" />, onClick: () => navigate('/settings') },
            { id: 'd1', label: null, divider: true },
            { id: 'guide', label: t('shell.roleGuide', 'What can I do here?'), icon: <Compass className="h-4 w-4" />, onClick: () => setTimeout(() => openWhatCanIDo(), 50) },
            { id: 'tour', label: t('wizard:actions.start_tour', 'Tour this page'), icon: <PlayCircle className="h-4 w-4" />, onClick: () => setTimeout(() => startTour(), 50) },
            ...(isPlatformAdmin && !ctx.isPlatformPlane
              ? [{ id: 'platform', label: t('shell.returnToPlatform', 'Return to the Altus platform'), icon: <Crown className="h-4 w-4" />, onClick: async () => { await returnToPlatformScope(); navigate('/platform') } }]
              : []),
            { id: 'd2', label: null, divider: true },
            { id: 'signout', label: t('logout', 'Sign out'), icon: <LogOut className="h-4 w-4 rtl:rotate-180" />, destructive: true, onClick: async () => { await signOut(); navigate('/login') } },
          ]}
        />
      </div>
    </header>
  )
}
