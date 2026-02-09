/**
 * MobileNavigation Component
 * 
 * Bottom navigation bar for mobile devices.
 * Uses centralized navigation config for role-based quick actions.
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/hooks/useNavigation'
import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'

interface MobileNavigationProps {
  onMenuClick?: () => void
}

export function MobileNavigation({ onMenuClick }: MobileNavigationProps) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const { quickActions, isPathActive } = useNavigation()

  // Take first 4 quick actions + menu button
  const displayItems = quickActions.slice(0, 4)

  const handleHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10) // Light tap vibration
      } catch (e) {
        // Ignore vibration errors (e.g. permission issues or unsupported)
      }
    }
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border lg:hidden shadow-lg pb-safe"
      aria-label={t('mobileNav', { defaultValue: 'Mobile navigation' })}
    >
      <div className="grid grid-cols-5 gap-0">
        {displayItems.map((item) => {
          const Icon = item.icon
          const isActive = isPathActive(item.resolvedPath)

          return (
            <Link
              key={item.path}
              to={item.resolvedPath}
              onClick={handleHaptic}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-3 px-1 transition-all duration-150 relative",
                "min-h-[3.5rem] touch-action-manipulation", // Ensure min height for touch
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-hotel-gold",
                isActive
                  ? "text-hotel-gold font-semibold bg-hotel-gold/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 active:bg-accent/80"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-colors", isActive && "text-hotel-gold")} />
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-0.5 flex items-center justify-center text-[9px] bg-red-500 text-white border-white border-[1.5px] shadow-sm">
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] sm:text-[11px] font-medium truncate max-w-[64px] transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {t(item.title)}
              </span>
            </Link>
          )
        })}

        {/* Menu button - always last */}
        <button
          onClick={() => {
            handleHaptic()
            onMenuClick?.()
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-3 px-1 transition-all duration-150",
            "min-h-[3.5rem] touch-action-manipulation",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "active:scale-95 active:bg-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-hotel-gold"
          )}
          aria-label={t('openMenu', { defaultValue: 'Open navigation menu' })}
          aria-expanded="false"
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[10px] sm:text-[11px] font-medium truncate max-w-[64px]" aria-hidden="true">
            {t('menu', { defaultValue: 'Menu' })}
          </span>
        </button>
      </div>
    </nav>
  )
}
