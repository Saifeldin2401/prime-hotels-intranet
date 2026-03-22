/**
 * MobileNavigation Component
 * 
 * Bottom navigation bar for mobile devices.
 * Redesigned with glassmorphism and floating action button.
 */

import { ActionSheet } from '@/components/mobile/ActionSheet'
import { useNavigation } from '@/hooks/useNavigation'
import { cn } from '@/lib/utils'
import { GraduationCap, Home, LayoutDashboard, Menu, MessageSquare } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

interface MobileNavigationProps {
  onMenuClick?: () => void
  className?: string
}

export function MobileNavigation({ onMenuClick, className }: MobileNavigationProps) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const navigate = useNavigate()
  const { quickActions: _quickActions } = useNavigation()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleHaptic = useCallback((e?: React.MouseEvent) => {
    // Blur to prevent aria-hidden conflict
    if (e && e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur()
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10)
      } catch (_e) {
        // Ignore
      }
    }
  }, [])

  const handleFabClick = useCallback((event: React.MouseEvent) => {
    handleHaptic(event)
    setIsSheetOpen(true)
  }, [handleHaptic])

  const handleNewRequestAction = useCallback(() => {
    handleHaptic()
    setIsSheetOpen(false)
    navigate('/hr/leave-requests')
  }, [handleHaptic, navigate])

  const handleReportIssueAction = useCallback(() => {
    handleHaptic()
    setIsSheetOpen(false)
    navigate('/maintenance/submit')
  }, [handleHaptic, navigate])

  const handleMenuClickWrapper = useCallback(() => {
    handleHaptic()
    onMenuClick?.()
  }, [handleHaptic, onMenuClick])

  return (
    <div className={cn("fixed bottom-[max(env(safe-area-inset-bottom),1rem)] inset-x-4 z-30 max-w-full mx-auto print:hidden", className)}>
      <nav
        className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl px-2 py-2 flex items-center justify-between relative"
        aria-label={t('mobileNav', { defaultValue: 'Mobile navigation' })}
      >
        {/* Home */}
        <Link
          to="/"
          onClick={handleHaptic}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px]",
            location.pathname === '/'
              ? "text-hotel-primary"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1.5 rounded-full transition-all", location.pathname === '/' && "bg-hotel-primary/10")}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{t('home', 'Home')}</span>
        </Link>

        {/* Training */}
        <Link
          to="/training"
          onClick={handleHaptic}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px]",
            location.pathname.startsWith('/training')
              ? "text-hotel-primary"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1.5 rounded-full transition-all", location.pathname.startsWith('/training') && "bg-hotel-primary/10")}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{t('training', 'Training')}</span>
        </Link>

        {/* Floating Action Button (FAB) */}
        <div className="relative -top-6">
          <ActionSheet
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            trigger={
              <button
                onClick={handleFabClick}
                className="w-14 h-14 rounded-full bg-hotel-gold text-white shadow-lg shadow-hotel-gold/40 flex items-center justify-center transform active:scale-95 transition-transform border-4 border-gray-50"
              >
                <div className="relative">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
              </button>
            }
            title={t('quickActions', 'Quick Actions')}
            description={t('quickActionsDesc', 'Access common tasks instantly')}
          >
            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                onClick={handleNewRequestAction}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{t('newRequest', 'New Request')}</span>
              </button>
              <button
                onClick={handleReportIssueAction}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{t('reportIssue', 'Report Issue')}</span>
              </button>
              {/* Add more quick actions as needed */}
            </div>
          </ActionSheet>
        </div>

        {/* Messages */}
        <Link
          to="/messaging"
          onClick={handleHaptic}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px]",
            location.pathname.startsWith('/messaging')
              ? "text-hotel-primary"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1.5 rounded-full transition-all", location.pathname.startsWith('/messaging') && "bg-hotel-primary/10")}>
            <MessageSquare className="w-5 h-5" />
            {/* Simple dot for unread messages if needed */}
          </div>
          <span className="text-[10px] font-medium">{t('chat', 'Chat')}</span>
        </Link>

        {/* Menu */}
        <button
          onClick={handleMenuClickWrapper}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600 min-h-[44px]"
          )}
        >
          <div className="p-1.5 rounded-full">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{t('menu', 'Menu')}</span>
        </button>
      </nav>
    </div>
  )
}
