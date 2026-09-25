import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { cn } from '@/lib/utils'
import { Award, Bell, BookOpen, GraduationCap, Home, Menu, Search, User } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

interface MobileNavigationProps {
  className?: string
  onOpenMenu?: () => void
}

export function MobileNavigation({ className, onOpenMenu }: MobileNavigationProps) {
  const { t, i18n } = useTranslation('nav')
  const isRTL = i18n.dir() === 'rtl'
  const location = useLocation()
  const { notifications } = useNotifications()
  const { activeWorkspace, activeWorkspaceConfig } = useWorkspaces()

  // Calculate unread notifications
  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.is_read).length || 0
  }, [notifications])

  // Haptic feedback
  const handleHaptic = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'currentTarget' in e && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur()
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Ignore
      }
    }
  }, [])

  const isActive = useCallback((path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }, [location.pathname])

  const isLearner = activeWorkspace === 'LEARN'

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 lg:hidden print:hidden font-sans',
        className
      )}
      aria-label={t('mobileNav', { defaultValue: 'Mobile navigation' })}
    >
      {/* Solid architectural background (No glassmorphism, Section 13) */}
      <div className="absolute inset-0 bg-ds-surface dark:bg-ds-chrome border-t border-ds-border dark:border-ds-chrome-border shadow-none" />

      {/* Safe Area Spacer */}
      <div className="relative flex items-center justify-around h-16 max-w-lg mx-auto pb-safe">
        {isLearner ? (
          <>
            {/* 1. Home */}
            <NavButton
              to="/learn"
              isActive={isActive('/learn', true)}
              onClick={handleHaptic}
              icon={<Home className="w-5 h-5" />}
              label={t('home', 'Home')}
            />

            {/* 2. Learn */}
            <NavButton
              to="/learn/my"
              isActive={isActive('/learn/my') || isActive('/learn/courses') || isActive('/learn/player')}
              onClick={handleHaptic}
              icon={<GraduationCap className="w-5 h-5" />}
              label={t('my_learning', 'Learn')}
            />

            {/* 3. Search */}
            <NavButton
              to="/knowledge"
              isActive={isActive('/knowledge')}
              onClick={handleHaptic}
              icon={<Search className="w-5 h-5" />}
              label={t('search', 'Search')}
            />

            {/* 4. Certificates */}
            <NavButton
              to="/learn/certificates"
              isActive={isActive('/learn/certificates')}
              onClick={handleHaptic}
              icon={<Award className="w-5 h-5" />}
              label={t('certificates', 'Certificates')}
            />

            {/* 5. Me / Profile or Drawer */}
            {onOpenMenu ? (
              <ActionButton
                onClick={(e) => {
                  handleHaptic(e)
                  onOpenMenu()
                }}
                icon={<Menu className="w-5 h-5" />}
                label={t('menu', 'Menu')}
                badge={unreadCount > 0 ? unreadCount : undefined}
              />
            ) : (
              <NavButton
                to="/profile"
                isActive={isActive('/profile')}
                onClick={handleHaptic}
                icon={<User className="w-5 h-5" />}
                label={t('profile', 'Me')}
              />
            )}
          </>
        ) : (
          <>
            {/* Other workspaces: their landing, knowledge, alerts, and the
                drawer holding the full workspace navigation. */}
            <NavButton
              to={activeWorkspaceConfig.defaultPath}
              isActive={isActive(activeWorkspaceConfig.defaultPath, true)}
              onClick={handleHaptic}
              icon={<Home className="w-5 h-5" />}
              label={isRTL ? activeWorkspaceConfig.labelAr : activeWorkspaceConfig.label}
            />

            <NavButton
              to="/knowledge"
              isActive={isActive('/knowledge')}
              onClick={handleHaptic}
              icon={<BookOpen className="w-5 h-5" />}
              label={t('knowledge', 'Knowledge')}
            />

            <NavButton
              to="/notifications"
              isActive={isActive('/notifications')}
              onClick={handleHaptic}
              icon={<Bell className="w-5 h-5" />}
              label={t('alerts', 'Alerts')}
              badge={unreadCount > 0 ? unreadCount : undefined}
            />

            {onOpenMenu && (
              <ActionButton
                onClick={(e) => {
                  handleHaptic(e)
                  onOpenMenu()
                }}
                icon={<Menu className="w-5 h-5" />}
                label={t('menu', 'Workspaces')}
              />
            )}
          </>
        )}
      </div>
    </nav>
  )
}

interface NavButtonProps {
  to: string
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  icon: React.ReactNode
  label: string
  badge?: number
}

function NavButton({ to, isActive, onClick, icon, label, badge }: NavButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        'w-14 h-12 rounded-[6px] transition-colors duration-150',
        'min-h-[44px] min-w-[44px]',
        'relative select-none',
        isActive
          ? 'text-ds-accent font-semibold'
          : 'text-ds-muted hover:text-ds-ink'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -end-2 h-4 min-w-4 px-1 text-[9px] font-mono font-bold flex items-center justify-center bg-ds-danger text-white"
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </div>
      <span className="text-[10px] leading-tight">
        {label}
      </span>
    </Link>
  )
}

interface ActionButtonProps {
  onClick: (e: React.MouseEvent) => void
  icon: React.ReactNode
  label: string
  badge?: number
}

function ActionButton({ onClick, icon, label, badge }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        'w-14 h-12 rounded-[6px] transition-colors duration-150',
        'min-h-[44px] min-w-[44px]',
        'relative select-none text-ds-muted hover:text-ds-ink'
      )}
      aria-label={label}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -end-2 h-4 min-w-4 px-1 text-[9px] font-mono font-bold flex items-center justify-center bg-ds-danger text-white"
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </div>
      <span className="text-[10px] leading-tight">
        {label}
      </span>
    </button>
  )
}
