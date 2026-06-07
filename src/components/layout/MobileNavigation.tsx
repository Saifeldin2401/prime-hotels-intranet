/**
 * MobileNavigation Component
 * 
 * Enhanced bottom navigation bar for mobile devices.
 * Features a prominent central FAB and user profile avatar.
 * 
 * Design inspired by modern mobile app navigation patterns:
 * - Central floating action button (FAB) for quick actions
 * - User avatar in menu button
 * - Smooth animations and haptic feedback
 * - Safe area support for notched devices
 */

import { ActionSheet, QuickActionButton, QuickActionGrid } from '@/components/mobile/ActionSheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Award, BookOpen, GraduationCap, HelpCircle, LayoutGrid } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface MobileNavigationProps {
  onMenuClick?: () => void
  className?: string
}

interface NavItem {
  path: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  label: string
  badge?: number
  exact?: boolean
}

/**
 * MobileNavigation - Premium bottom navigation with FAB and avatar
 * 
 * Features:
 * - Haptic feedback on tap
 * - Safe area support for notched devices
 * - Badge notifications with pulse animation
 * - Prominent quick action FAB with golden accent
 * - User avatar in menu button
 * - Active state highlighting with smooth transitions
 * - Animated indicator for selected tab
 */
export function MobileNavigation({ onMenuClick, className }: MobileNavigationProps) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

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

  // Quick action handlers
  const handleFabClick = useCallback((event: React.MouseEvent) => {
    handleHaptic(event)
    setIsSheetOpen(true)
  }, [handleHaptic])

  const handleQuickAction = useCallback((path: string) => {
    handleHaptic()
    setIsSheetOpen(false)
    navigate(path)
  }, [handleHaptic, navigate])

  const handleMenuClickWrapper = useCallback(() => {
    handleHaptic()
    onMenuClick?.()
  }, [handleHaptic, onMenuClick])

  // Check if a path is active
  const isActive = useCallback((path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }, [location.pathname])

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'print:hidden',
          className
        )}
        aria-label={t('mobileNav', { defaultValue: 'Mobile navigation' })}
      >
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" />
        
        {/* Safe Area Spacer */}
        <div className="relative flex items-end justify-around h-20 max-w-lg mx-auto pb-safe">
          
          {/* My Learning */}
          <NavButton
            to="/learning/my"
            isActive={isActive('/learning/my')}
            onClick={handleHaptic}
            icon={<GraduationCap className="w-5 h-5" />}
            activeIcon={<GraduationCap className="w-5 h-5 fill-current" />}
            label={t('my_training', 'Training')}
          />

          {/* Knowledge */}
          <NavButton
            to="/knowledge"
            isActive={isActive('/knowledge')}
            onClick={handleHaptic}
            icon={<BookOpen className="w-5 h-5" />}
            activeIcon={<BookOpen className="w-5 h-5 fill-current" />}
            label={t('knowledge_base', 'Knowledge')}
          />

          {/* Floating Action Button (FAB) */}
          <div className="relative -top-2 px-2">
            <button
              onClick={handleFabClick}
              className={cn(
                // Base styles
                'w-16 h-16 rounded-full',
                'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600',
                'text-white',
                // Enhanced shadow
                'shadow-lg shadow-amber-500/40',
                // Flex center
                'flex items-center justify-center',
                // Transitions
                'transform transition-all duration-300 ease-out',
                'active:scale-90 hover:scale-105',
                // White ring border
                'ring-4 ring-white',
                // Touch target
                'touch-target',
                // Hover glow effect
                'hover:shadow-amber-500/50 hover:shadow-xl'
              )}
              aria-label={t('quickActions', 'Quick Actions')}
            >
              <div className="relative">
                <LayoutGrid className="w-7 h-7" strokeWidth={2} />
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-white/20 rounded-full blur-sm" />
              </div>
            </button>
            {/* Optional: Pulse ring animation */}
            <div className="absolute inset-0 rounded-full ring-4 ring-amber-400/30 animate-ping pointer-events-none" />
          </div>

          {/* Certificates */}
          <NavButton
            to="/training/certificates"
            isActive={isActive('/training/certificates')}
            onClick={handleHaptic}
            icon={<Award className="w-5 h-5" />}
            activeIcon={<Award className="w-5 h-5 fill-current" />}
            label={t('my_certificates', 'Awards')}
          />

          {/* Menu with User Avatar */}
          <button
            onClick={handleMenuClickWrapper}
            className={cn(
              'flex flex-col items-center justify-center gap-1',
              'w-16 h-14 rounded-2xl transition-all duration-300',
              'min-h-[44px] min-w-[44px]',
              'group',
              'text-muted-foreground hover:text-foreground'
            )}
            aria-label={t('menu', 'Menu')}
          >
            <div className="relative">
              <Avatar className={cn(
                'h-7 w-7 transition-all duration-300',
                'ring-2 ring-transparent group-hover:ring-slate-200',
                'group-active:scale-95'
              )}>
                <AvatarImage 
                  src={profile?.avatar_url || undefined} 
                  alt={profile?.full_name || 'User'}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[10px] font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <span className="text-[10px] font-medium">{t('menu', 'Menu')}</span>
          </button>
        </div>
      </nav>

      {/* Quick Actions Sheet */}
      <ActionSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        title={t('quickActions', 'Quick Actions')}
        description={t('quickActionsDesc', 'Access common tasks instantly')}
        showCloseButton={true}
      >
        <QuickActionGrid className="py-4">
          {/* My Learning */}
          <QuickActionButton
            icon={<GraduationCap className="w-6 h-6" />}
            label={t('my_training', 'My Training')}
            description="Continue learning"
            color="blue"
            onClick={() => handleQuickAction('/learning/my')}
          />

          {/* Knowledge Base */}
          <QuickActionButton
            icon={<BookOpen className="w-6 h-6" />}
            label={t('knowledge_base', 'Knowledge')}
            description="Browse resources"
            color="amber"
            onClick={() => handleQuickAction('/knowledge')}
          />

          {/* Quizzes */}
          <QuickActionButton
            icon={<HelpCircle className="w-6 h-6" />}
            label={t('quizzes', 'Quizzes')}
            description="Manage assessments"
            color="green"
            onClick={() => handleQuickAction('/learning/quizzes')}
          />

          {/* Certificates */}
          <QuickActionButton
            icon={<Award className="w-6 h-6" />}
            label={t('my_certificates', 'Certificates')}
            description="View awards"
            color="purple"
            onClick={() => handleQuickAction('/training/certificates')}
          />
        </QuickActionGrid>
      </ActionSheet>
    </>
  )
}

/**
 * NavButton - Individual navigation button with active states
 */
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
        'min-h-[44px] min-w-[44px]',
        'relative',
        isActive 
          ? 'text-amber-600' 
          : 'text-slate-400 hover:text-slate-600'
      )}
    >
      {/* Active indicator dot */}
      {isActive && (
        <div className="absolute -top-1 w-1 h-1 rounded-full bg-amber-500 animate-in fade-in zoom-in duration-200" />
      )}
      
      {/* Icon container */}
      <div className={cn(
        'relative p-1.5 rounded-xl transition-all duration-300',
        isActive && 'bg-amber-50'
      )}>
        {isActive ? activeIcon || icon : icon}
        
        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <Badge 
            variant="destructive" 
            className={cn(
              'absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center',
              'animate-in zoom-in duration-200'
            )}
          >
            {badge > 99 ? '99+' : badge}
          </Badge>
        )}
      </div>
      
      {/* Label */}
      <span className={cn(
        'text-[10px] font-medium transition-all duration-300',
        isActive ? 'text-amber-600' : 'text-slate-400'
      )}>
        {label}
      </span>
    </Link>
  )
}
