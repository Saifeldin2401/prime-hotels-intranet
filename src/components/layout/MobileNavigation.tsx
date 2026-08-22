/**
 * MobileNavigation Component
 * 
 * Enhanced bottom navigation bar for mobile devices.
 * Features 5 primary destinations: Home, Tasks, Documents, Alerts, and Profile.
 * 
 * Design inspired by modern mobile app navigation patterns:
 * - Direct mapping to primary destinations
 * - Smooth animations and haptic feedback
 * - Safe area support for notched devices
 * - Apple HIG minimum touch target size (44x44px)
 * - Bi-directional logical layout properties (RTL support)
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { Bell, Briefcase, Home, FileText } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

interface MobileNavigationProps {
  className?: string
}

/**
 * MobileNavigation - Bottom navigation for mobile screens mapping to the primary destinations
 */
export function MobileNavigation({ className }: MobileNavigationProps) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const { notifications } = useNotifications()
  const { profile } = useAuth()

  // Calculate unread notifications
  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.is_read).length || 0
  }, [notifications])

  // Get user initials for avatar fallback
  const userInitials = useMemo(() => {
    if (!profile?.full_name) return 'U'
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [profile?.full_name])

  // Haptic feedback
  const handleHaptic = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'currentTarget' in e && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur()
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch {
        // Ignore vibration errors
      }
    }
  }, [])

  // Check if a path is active
  const isActive = useCallback((path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }, [location.pathname])

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50',
        'print:hidden',
        className
      )}
      aria-label={t('mobileNav', { defaultValue: 'Mobile navigation' })}
    >
      {/* Glassmorphism Background — tokenized so it adapts to light/dark */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" />
      
      {/* Safe Area Spacer */}
      <div className="relative flex items-end justify-around h-20 max-w-lg mx-auto pb-safe">
        
        {/* Home */}
        <NavButton
          to="/dashboard"
          isActive={isActive('/dashboard', true) || isActive('/', true)}
          onClick={handleHaptic}
          icon={<Home className="w-5 h-5" />}
          activeIcon={<Home className="w-5 h-5 fill-current" />}
          label={t('home', 'Home')}
        />

        {/* Tasks */}
        <NavButton
          to="/tasks"
          isActive={isActive('/tasks')}
          onClick={handleHaptic}
          icon={<Briefcase className="w-5 h-5" />}
          activeIcon={<Briefcase className="w-5 h-5 fill-current" />}
          label={t('tasks', 'Tasks')}
        />

        {/* Documents */}
        <NavButton
          to="/documents"
          isActive={isActive('/documents')}
          onClick={handleHaptic}
          icon={<FileText className="w-5 h-5" />}
          activeIcon={<FileText className="w-5 h-5 fill-current" />}
          label={t('documents', 'Documents')}
        />

        {/* Alerts */}
        <NavButton
          to="/notifications"
          isActive={isActive('/notifications')}
          onClick={handleHaptic}
          icon={<Bell className="w-5 h-5" />}
          activeIcon={<Bell className="w-5 h-5 fill-current" />}
          label={t('alerts', 'Alerts')}
          badge={unreadCount > 0 ? unreadCount : undefined}
        />

        {/* Profile */}
        <NavButton
          to="/profile"
          isActive={isActive('/profile')}
          onClick={handleHaptic}
          icon={
            <Avatar className={cn(
              'h-5 w-5 transition-all duration-300 ring-2 ring-transparent',
              isActive('/profile') && 'ring-hotel-gold'
            )}>
              <AvatarImage 
                src={profile?.avatar_url || undefined}
                alt={profile?.full_name || 'User'}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-hotel-gold to-hotel-gold-dark text-hotel-navy text-[9px] font-semibold flex items-center justify-center">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          }
          label={t('profile', 'Profile')}
        />
      </div>
    </nav>
  )
}

interface NavButtonProps {
  to: string
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
  badge?: number
}

function NavButton({ to, isActive, onClick, icon, activeIcon, label, badge }: NavButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        'w-16 h-14 rounded-2xl transition-all duration-300',
        'min-h-touch min-w-touch', // Enforces minimum touch hit target size of 44x44px
        'relative',
        isActive
          ? 'text-hotel-gold'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {/* Active indicator pill — widened from a 4px dot so the active tab is actually visible */}
      {isActive && (
        <div className="absolute -top-1 w-5 h-1 rounded-full bg-hotel-gold animate-in fade-in zoom-in duration-200" />
      )}

      {/* Icon container */}
      <div className={cn(
        'relative p-1.5 rounded-xl transition-all duration-300',
        isActive && 'bg-hotel-gold/10'
      )}>
        {isActive ? activeIcon || icon : icon}
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <Badge 
            variant="destructive" 
            className={cn(
              'absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center',
              'animate-in zoom-in duration-200'
            )}
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </div>
      
      {/* Label */}
      <span className={cn(
        'text-[11px] font-medium transition-all duration-300',
        isActive ? 'text-hotel-gold' : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </Link>
  )
}
