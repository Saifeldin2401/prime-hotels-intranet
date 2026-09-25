import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useNavigation'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { WorkspaceSwitcher } from '@/ui/components/WorkspaceSwitcher'
import { cn } from '@/lib/utils'
import {
  Compass,
  LogOut,
  Building2,
  Crown,
  Building
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useWizard } from '@/hooks/useWizard'
import { CONSOLIDATED_PROPERTY_ID } from '@/lib/propertyScope'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { t, i18n } = useTranslation(['nav', 'admin', 'common'])
  const { t: t_ext } = useTranslation('extracted')
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProperty, availableProperties, switchProperty } = useProperty()
  const { currentOrganization, isPlatformAdmin, isImpersonating, isPlatformScope, returnToPlatformScope } = useTenant()
  const { openWhatCanIDo } = useWizard()
  const { workspaceNavigation } = useNavigation()
  const { activeWorkspaceConfig } = useWorkspaces()

  const isPlatformActive = Boolean(isPlatformAdmin && (isPlatformScope || location.pathname.startsWith('/platform')))
  const logoHref = isPlatformActive ? '/platform' : '/learn'

  const getTourAttr = (path: string) => {
    if (path === '/learn') return 'nav-dashboard'
    if (path.startsWith('/learn') || path.startsWith('/studio')) return 'nav-training'
    if (path.startsWith('/knowledge')) return 'nav-knowledge'
    if (path === '/admin/users') return 'nav-users'
    if (path === '/admin/properties') return 'nav-properties'
    if (path === '/platform/organizations') return 'nav-organizations'
    if (path === '/platform/operations') return 'nav-operations'
    if (path.endsWith('/audit')) return 'nav-audit-logs'
    return undefined
  }

  return (
    <div className="flex flex-col w-full lg:w-[248px] bg-ds-chrome border-e border-ds-chrome-border h-full lg:h-screen select-none text-ds-chrome-text font-sans">
      {/* Brand Header */}
      <div className="flex flex-col gap-3 p-4 border-b border-ds-chrome-border bg-ds-chrome">
        <Link to={logoHref} onClick={onNavigate} data-tour="sidebar-logo" className="flex items-center gap-2.5 py-1 group">
          {!isPlatformActive && currentOrganization?.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name}
              className="h-8 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-ds-brass text-white font-bold font-mono text-xs">
                AC
              </div>
              <div className="flex flex-col text-start">
                <span className="font-semibold text-xs text-white tracking-wider leading-none">
                  ALTUS CONNECT
                </span>
                <span className="text-[9px] tracking-widest text-ds-chrome-muted font-mono mt-0.5 uppercase">
                  Hospitality
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Scope Context Banner */}
        {isPlatformActive ? (
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[6px] bg-ds-chrome-raised border border-ds-chrome-border text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Crown className="w-3.5 h-3.5 shrink-0 text-ds-chrome-accent" />
              <span className="text-ds-chrome-text font-medium text-[11px] truncate">
                {t('admin:global_saas_scope', 'Platform Operator')}
              </span>
            </div>
          </div>
        ) : isImpersonating && currentOrganization ? (
          <div className="flex flex-col gap-1.5 p-2 rounded-[6px] bg-ds-chrome-raised border border-ds-chrome-accent/40 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-ds-chrome-accent uppercase tracking-wider">
                {t('admin:acting_as', 'Impersonating')}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await returnToPlatformScope()
                  navigate('/platform')
                }}
                className="h-5 px-1.5 text-[10px] text-ds-chrome-accent hover:bg-white/10"
              >
                Exit
              </Button>
            </div>
            <span className="text-white font-semibold text-xs truncate">
              {currentOrganization.name}
            </span>
          </div>
        ) : currentOrganization ? (
          <div className="flex items-center justify-between px-2.5 py-1 rounded-[6px] bg-ds-chrome-raised border border-ds-chrome-border text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-ds-chrome-accent" />
              <span className="text-white font-medium text-[11px] truncate">
                {currentOrganization.name}
              </span>
            </div>
          </div>
        ) : null}

        {/* Multi-property Selector */}
        {!isPlatformScope && availableProperties.length > 1 && (
          <div className="w-full">
            <Select
              value={currentProperty?.id ?? CONSOLIDATED_PROPERTY_ID}
              onValueChange={switchProperty}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium border-ds-chrome-border bg-ds-chrome-raised text-ds-chrome-text hover:bg-ds-chrome-raised/80 rounded-[6px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Building className="w-3.5 h-3.5 text-ds-chrome-muted shrink-0" />
                  <SelectValue placeholder={t_ext('select_property', 'Select Property')} />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-ds-chrome border-ds-chrome-border text-ds-chrome-text">
                {availableProperties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id} className="text-xs text-ds-chrome-text focus:bg-ds-chrome-raised">
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Workspace Switcher (Section 18) */}
        <WorkspaceSwitcher variant="sidebar" isRTL={i18n.dir() === 'rtl'} />
      </div>

      {/* Navigation Links Area */}
      <nav data-tour="sidebar-nav" aria-label={t('mainNavigation', 'Main navigation')} className="flex-1 p-2 space-y-2 overflow-y-auto">
        <h2 className="px-2 pt-1 text-[10px] font-bold text-ds-chrome-muted uppercase tracking-wider">
          {i18n.dir() === 'rtl' ? activeWorkspaceConfig.labelAr : activeWorkspaceConfig.label}
        </h2>
        <ul className="space-y-0.5">
          {workspaceNavigation.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  data-tour={getTourAttr(item.path)}
                  aria-current={item.isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-xs font-medium transition-colors duration-150 min-h-[44px]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent',
                    item.isActive
                      ? 'bg-white/10 text-white font-semibold border-s-2 border-ds-chrome-accent ps-2'
                      : 'text-ds-chrome-muted hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon aria-hidden="true" className={cn('w-4 h-4 shrink-0', item.isActive ? 'text-ds-chrome-accent' : 'text-ds-chrome-muted')} />
                  <span className="flex-1 truncate">{t(item.title)}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-ds-brass text-[10px] text-white font-mono font-bold">
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Navigation: Role Guide & Logout */}
      <div className="p-2 border-t border-ds-chrome-border space-y-0.5">
        <Button
          variant="ghost"
          className="w-full justify-start text-ds-chrome-muted hover:text-white hover:bg-white/5 min-h-[40px] rounded-[6px] text-xs font-medium"
          onClick={() => {
            onNavigate?.()
            setTimeout(() => openWhatCanIDo(), 100)
          }}
        >
          <Compass className="w-4 h-4 me-2.5 text-ds-chrome-accent" />
          <span>{t('actions.my_guide', 'My Role Guide')}</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-ds-chrome-muted hover:text-ds-danger hover:bg-ds-danger/10 min-h-[40px] rounded-[6px] text-xs font-medium"
          onClick={async () => {
            onNavigate?.()
            await signOut()
            navigate('/login')
          }}
        >
          <LogOut className="w-4 h-4 me-2.5" />
          <span>{t('logout', 'Sign Out')}</span>
        </Button>
      </div>
    </div>
  )
}
