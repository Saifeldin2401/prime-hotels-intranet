import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { DURATION, EASING } from '@/lib/motion'
import {
  LogOut,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigation } from '@/hooks/useNavigation'
import type { NavigationGroupWithItems } from '@/hooks/useNavigation'

export function Sidebar() {
  const location = useLocation()
  const { t } = useTranslation('nav')
  const { signOut } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { groupedNavigation } = useNavigation()

  // Track open states for collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  // Initialize open states based on active routes
  // This could be improved by using useEffect to update when location changes if needed,
  // but useNavigation already returns isExpanded which we can use as initial state if we want.
  // However, local state gives user control.
  // Let's use the isExpanded from useNavigation as default if key is missing? 
  // actually useNavigation's isExpanded is calculated based on active items.
  // So we can sync them or just rely on user interaction.
  // For a better UX, let's auto-expand groups with active items if not explicitly toggled?
  // Simpler approach: Use local state, initialized with defaults? 
  // No, let's blindly trust useNavigation for initial state? 
  // Let's implement a simple effect to open groups with active items on mount/navigation?
  // For now, simple toggling is fine. 

  // Actually, useNavigation returns `isExpanded` which is true if has active item AND strict mode isnt on?
  // Let's rely on local state but initialize/sync with active routes.

  const isGroupOpen = (group: NavigationGroupWithItems) => {
    // If user has explicitly toggled, use that
    if (openGroups[group.config.id] !== undefined) {
      return openGroups[group.config.id]
    }
    // Otherwise fall back to logic (e.g. if it has an active item, it should be open)
    return group.isExpanded
  }

  return (
    <div className="flex flex-col w-64 bg-card border-e h-screen">
      <div className="flex flex-col gap-4 p-4 border-b bg-hotel-navy overflow-hidden">
        <div className="flex items-center justify-center w-full">
          <img
            src="/prime-logo-light.png"
            alt="Prime Hotels"
            className="w-full h-auto object-contain transition-transform hover:scale-110 scale-125"
          />
        </div>

        {/* Property name display */}
        {!isMultiPropertyUser && currentProperty && (
          <div className="text-center">
            <p className="text-xs text-white/70 font-medium truncate" title={currentProperty.name}>
              {currentProperty.name}
            </p>
          </div>
        )}

        {isMultiPropertyUser && (
          <Select
            value={currentProperty?.id ?? ''}
            onValueChange={switchProperty}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder={t_ext('select_property', 'Select Property')} />
            </SelectTrigger>
            <SelectContent>
              {availableProperties.map(prop => (
                <SelectItem key={prop.id} value={prop.id} className="text-xs">
                  {prop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {groupedNavigation.map((group) => {
          // If items are empty, don't show group
          if (group.items.length === 0) return null

          // If not collapsible, render items directly (like Home group)
          if (!group.config.collapsible) {
            return (
              <div key={group.config.id} className="space-y-1">
                {/* Optional: Show title for non-collapsible groups if needed, 
                     but typically Home is just items. 
                     If title exists and it's not 'home', maybe show label? 
                     Design preference: 'home' usually silent. 'settings' maybe silent.
                 */}
                {group.config.title && group.config.id !== 'home' && group.config.id !== 'settings' && (
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t(group.config.title)}
                  </h3>
                )}

                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.resolvedPath}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                        item.isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>
                      <span className="flex-1">{t(item.title)}</span>
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-background">
                          {item.badgeCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          }

          // Collapsible Group
          const isOpen = isGroupOpen(group)
          const isGroupActive = group.items.some(i => i.isActive)

          return (
            <div key={group.config.id} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.config.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isGroupActive && !isOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <motion.div
                  whileHover={{ scale: 1.1, x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  {group.config.icon && <group.config.icon className="w-4 h-4" />}
                </motion.div>

                <span className="flex-1 text-start">{t(group.config.title)}</span>
                <ChevronRight className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DURATION.MEDIUM, ease: EASING.DEFAULT as any }}
                    className="overflow-hidden"
                  >
                    <div className="ms-4 mt-1 space-y-1 border-s-2 border-muted ps-2">
                      {group.items.map(item => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.resolvedPath}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                              item.isActive
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            )}
                          >
                            <div className="flex-shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="flex-1 truncate">{t(item.title)}</span>
                            {item.badgeCount !== undefined && item.badgeCount > 0 && (
                              <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                                {item.badgeCount}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <motion.div
            whileHover={{ x: -2 }}
            transition={{ duration: 0.2 }}
          >
            <LogOut className="w-4 h-4 me-3" />
          </motion.div>
          {t('logout')}
        </Button>
      </div>
    </div>
  )
}
