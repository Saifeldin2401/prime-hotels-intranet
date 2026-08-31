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
import type { NavigationGroupWithItems } from '@/hooks/useNavigation'
import { useNavigation } from '@/hooks/useNavigation'
import { DURATION, EASING } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ChevronRight,
    LogOut
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe } from 'lucide-react'

export function Sidebar() {
  const { t } = useTranslation('nav')
  const { t: t_ext } = useTranslation('extracted')
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { currentOrganization, currentHotel, isPlatformAdmin } = useTenant()
  const { groupedNavigation } = useNavigation()

  // Track open states for collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const isGroupOpen = (group: NavigationGroupWithItems) => {
    if (openGroups[group.config.id] !== undefined) {
      return openGroups[group.config.id]
    }
    return group.isExpanded
  }

  return (
    <div className="flex flex-col w-64 bg-card border-e border-border/60 h-screen select-none">
      <div className="flex flex-col gap-2.5 p-4 border-b border-border/60 bg-white/50 dark:bg-hotel-navy/50 backdrop-blur-md overflow-hidden">
        <Link to="/dashboard" className="flex items-center justify-center gap-3 py-1 group">
          <img
            src="/altus-emblem-icon.png"
            alt="ALTUS Advisory"
            className="h-10 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col text-start">
            <span className="font-serif text-lg font-bold text-foreground tracking-wide leading-none">
              ALTUS
            </span>
            <span className="font-sans text-[8px] tracking-[0.25em] text-altus-copper font-bold mt-0.5">
              ADVISORY
            </span>
          </div>
        </Link>

        {/* Tenant Organization & Scope context */}
        {currentOrganization && (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-hotel-gold/10 border border-hotel-gold/25 text-hotel-navy dark:text-hotel-gold text-[11px] font-semibold max-w-full truncate shadow-xs">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-hotel-gold" />
              <span className="truncate">{currentOrganization.name}</span>
            </div>
            {currentHotel && (
              <p className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
                {currentHotel.name}
              </p>
            )}
          </div>
        )}

        {isMultiPropertyUser && !currentOrganization && (
          <Select
            value={currentProperty?.id ?? ''}
            onValueChange={switchProperty}
          >
            <SelectTrigger className="w-full h-9 text-xs font-medium border-border/80 bg-muted/50">
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

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {groupedNavigation.map((group) => {
          // If items are empty, don't show group
          if (group.items.length === 0) return null

          // If not collapsible, render items directly (like Home group)
          if (!group.config.collapsible) {
            return (
              <div key={group.config.id} className="space-y-1">
                {group.config.title && group.config.id !== 'personal_space' && (
                  <h3 className="px-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
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
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[transform,background-color,color] duration-150 ease-out relative active:scale-[0.98]',
                        item.isActive
                          ? 'bg-hotel-navy text-white dark:bg-hotel-gold/15 dark:text-hotel-gold shadow-sm font-semibold before:absolute before:start-0 before:top-2 before:bottom-2 before:w-1 before:rounded-e-full before:bg-hotel-gold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                      )}
                    >
                      <motion.div
                        whileHover={{ scale: 1.08 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                      </motion.div>
                      <span className="flex-1 truncate">{t(item.title)}</span>
                      {item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-altus-copper text-[10px] text-white font-mono font-bold shadow-xs">
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
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]',
                  isGroupActive && !isOpen
                    ? 'bg-hotel-gold/15 text-hotel-navy dark:text-hotel-gold font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.15 }}
                >
                  {group.config.icon && <group.config.icon className="w-4 h-4 shrink-0" />}
                </motion.div>

                <span className="flex-1 text-start truncate">{t(group.config.title)}</span>
                <ChevronRight className={cn("w-4 h-4 transition-transform duration-200 ease-out", isOpen && "rotate-90")} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ms-3 mt-1 space-y-1 border-s border-border/70 ps-2">
                      {group.items.map(item => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.path}
                            to={item.resolvedPath}
                            className={cn(
                              'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-[transform,background-color,color] duration-150 ease-out relative active:scale-[0.98]',
                              item.isActive
                                ? 'bg-hotel-gold/10 text-hotel-navy dark:text-hotel-gold font-semibold before:absolute before:start-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-e-full before:bg-hotel-gold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            )}
                          >
                            <div className="flex-shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="flex-1 truncate">{t(item.title)}</span>
                            {item.badgeCount !== undefined && item.badgeCount > 0 && (
                              <span className="flex-shrink-0 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-altus-copper text-[10px] text-white font-mono font-bold">
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

      <div className="p-3 border-t border-border/60">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-150"
          onClick={async () => { await signOut(); navigate('/login') }}
        >
          <motion.div
            whileHover={{ x: -2 }}
            transition={{ duration: 0.15 }}
          >
            <LogOut className="w-4 h-4 me-3" />
          </motion.div>
          {t('logout')}
        </Button>
      </div>
    </div>
  )
}
