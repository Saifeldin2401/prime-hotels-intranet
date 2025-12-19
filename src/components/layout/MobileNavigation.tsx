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

interface MobileNavigationProps {
  onMenuClick?: () => void
}

export function MobileNavigation({ onMenuClick }: MobileNavigationProps) {
  const { t } = useTranslation('nav')
  const location = useLocation()
  const { quickActions, isPathActive } = useNavigation()

  // Take first 4 quick actions + menu button
  const displayItems = quickActions.slice(0, 4)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border lg:hidden shadow-lg"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
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
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all duration-150 touch-target relative",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-hotel-gold",
                isActive
                  ? "text-hotel-gold font-semibold bg-hotel-gold/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 active:bg-accent/80"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", isActive && "text-hotel-gold")} />
                {item.badgeCount && item.badgeCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 text-[9px] bg-hotel-gold text-hotel-navy border-0">
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </Badge>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[56px]">
                {t(item.title, { defaultValue: item.title.split('.').pop() })}
              </span>
            </Link>
          )
        })}

        {/* Menu button - always last */}
        <button
          onClick={onMenuClick}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all duration-150 touch-target",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "active:scale-95 active:bg-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-hotel-gold"
          )}
          aria-label={t('openMenu', { defaultValue: 'Open navigation menu' })}
          aria-expanded="false"
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[56px]" aria-hidden="true">
            {t('menu', { defaultValue: 'Menu' })}
          </span>
        </button>
      </div>
    </nav>
  )
}
