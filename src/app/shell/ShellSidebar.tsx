import { Building2, ChevronRight, Compass, Crown, GraduationCap, LifeBuoy, LogOut, PenTool, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useNavigation'
import { useWizard } from '@/hooks/useWizard'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { cn } from '@/lib/utils'
import type { WorkspaceId } from '@/stores/workspaceStore'

const WORKSPACE_ICON: Record<WorkspaceId, LucideIcon> = {
  LEARN: GraduationCap,
  STUDIO: PenTool,
  MANAGE: ShieldCheck,
  ORGANIZATION: Building2,
  PLATFORM: Crown,
}

interface ShellSidebarProps {
  /** Called after a navigation, so the mobile sheet can close itself. */
  onNavigate?: () => void
}

/**
 * The workspace rail. Every workspace the member can open is listed, so the
 * product's five-part structure is always visible; the active one expands to
 * show its pages. Navy chrome is the product's structural colour in both themes.
 */
export function ShellSidebar({ onNavigate }: ShellSidebarProps) {
  const { t, i18n } = useTranslation('nav')
  const isArabic = i18n.language?.startsWith('ar')
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { openWhatCanIDo } = useWizard()
  const { workspaceNavigation } = useNavigation()
  const { activeWorkspace, authorizedWorkspaces } = useWorkspaces()

  return (
    <div className="flex h-full w-full flex-col bg-ds-chrome text-ds-chrome-text">
      {/* Identity */}
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex h-14 shrink-0 items-center gap-3 border-b border-ds-chrome-border px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-chrome-accent"
      >
        <img src="/altus-emblem-icon.png" alt="" className="h-7 w-auto" aria-hidden="true" />
        <span className="flex flex-col leading-none">
          <span className="font-editorial text-[19px] font-semibold tracking-[0.08em] text-white">ALTUS</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.32em] text-ds-chrome-accent">Connect</span>
        </span>
      </Link>

      <nav aria-label={t('mainNavigation', 'Main navigation')} className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {authorizedWorkspaces.map((ws) => {
            const Icon = WORKSPACE_ICON[ws.id]
            const isActive = ws.id === activeWorkspace
            const label = isArabic ? ws.labelAr : ws.label
            return (
              <li key={ws.id}>
                <Link
                  to={ws.defaultPath}
                  onClick={onNavigate}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'group flex min-h-[44px] items-center gap-3 rounded-md px-3 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent',
                    isActive ? 'text-white' : 'text-ds-chrome-muted hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn('h-4 w-4 shrink-0', isActive ? 'text-ds-chrome-accent' : 'text-ds-chrome-muted group-hover:text-white')}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {!isActive && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />}
                </Link>

                {isActive && workspaceNavigation.length > 0 && (
                  <ul className="mb-3 mt-1 space-y-0.5 border-s border-ds-chrome-border ms-5 ps-3">
                    {workspaceNavigation.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            onClick={onNavigate}
                            aria-current={item.isActive ? 'page' : undefined}
                            className={cn(
                              'relative flex min-h-[40px] items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent',
                              item.isActive
                                ? 'bg-white/[0.08] font-medium text-white before:absolute before:-start-[13px] before:top-2 before:bottom-2 before:w-[2px] before:bg-ds-chrome-accent'
                                : 'text-ds-chrome-muted hover:bg-white/[0.04] hover:text-white'
                            )}
                          >
                            <ItemIcon aria-hidden="true" className={cn('h-4 w-4 shrink-0', item.isActive ? 'text-ds-chrome-accent' : 'opacity-70')} />
                            <span className="flex-1 truncate">{t(item.title)}</span>
                            {item.badgeCount !== undefined && item.badgeCount > 0 && (
                              <span className="min-w-5 rounded-full bg-ds-chrome-accent/20 px-1.5 text-center text-[11px] font-semibold tabular-nums text-ds-chrome-accent">
                                {item.badgeCount}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-ds-chrome-border px-3 py-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            setTimeout(() => openWhatCanIDo(), 100)
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-sm text-ds-chrome-muted hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent"
        >
          <Compass aria-hidden="true" className="h-4 w-4" />
          {t('shell.roleGuide', 'What can I do here?')}
        </button>
        <Link
          to="/knowledge"
          onClick={onNavigate}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-sm text-ds-chrome-muted hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent"
        >
          <LifeBuoy aria-hidden="true" className="h-4 w-4" />
          {t('shell.help', 'Help and SOPs')}
        </Link>
        <button
          type="button"
          onClick={async () => {
            onNavigate?.()
            await signOut()
            navigate('/login')
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-sm text-ds-chrome-muted hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-chrome-accent"
        >
          <LogOut aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          {t('logout', 'Sign out')}
        </button>
      </div>
    </div>
  )
}
