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
    Compass,
    LogOut
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'
import { useWizard } from '@/hooks/useWizard'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe, Crown, Building } from 'lucide-react'
import { CONSOLIDATED_PROPERTY_ID } from '@/lib/propertyScope'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { t } = useTranslation(['nav', 'admin'])
  const { t: t_ext } = useTranslation('extracted')
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { currentOrganization, currentHotel, isPlatformAdmin, isImpersonating, isPlatformScope, returnToPlatformScope } = useTenant()
  const { openWhatCanIDo } = useWizard()
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

  const isPlatformActive = Boolean(isPlatformAdmin && (isPlatformScope || location.pathname.startsWith('/platform')))
  const logoHref = isPlatformActive ? '/platform' : '/dashboard'

  const getTourAttr = (path: string) => {
    if (path === '/dashboard') return 'nav-dashboard'
    if (path === '/platform/training') return 'nav-platform-training'
    if (path.includes('training') || path.includes('learning')) return 'nav-training'
    if (path.includes('requests') || path.includes('approvals')) return 'nav-requests'
    if (path.includes('knowledge')) return 'nav-knowledge'
    if (path.includes('users')) return 'nav-users'
    if (path.includes('departments')) return 'nav-departments'
    if (path.includes('properties')) return 'nav-properties'
    if (path.includes('organizations')) return 'nav-organizations'
    if (path.includes('operations')) return 'nav-operations'
    if (path.includes('audit-logs') || path.includes('logs')) return 'nav-audit-logs'
    return undefined
  }

  return (
    <div className="flex flex-col w-full lg:w-64 bg-card border-e border-border/60 h-full lg:h-screen select-none">
      <div className="flex flex-col gap-2.5 p-4 border-b border-border/60 bg-white/50 dark:bg-hotel-navy/50 backdrop-blur-md overflow-hidden">
        <Link to={logoHref} onClick={onNavigate} data-tour="sidebar-logo" className="flex items-center justify-center gap-3 py-1 group">
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

        {/* Scope Context Banner */}
        {isPlatformActive ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 text-[11px] font-semibold max-w-full truncate shadow-xs">
              <Crown className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="truncate">{t('groups.platform_operations', 'Platform Control Center')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
              {t('admin:global_saas_scope', 'Global SaaS Scope')}
            </p>
          </div>
        ) : isImpersonating && currentOrganization ? (
          <div className="flex flex-col items-center gap-1.5 text-center p-2 rounded-xl bg-amber-500/15 border border-amber-500/35">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[11px] font-semibold truncate max-w-full">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span className="truncate">{currentOrganization.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className="bg-amber-500 text-hotel-navy text-[8px] font-bold px-1.5 py-0 h-3.5">
                {t('admin:acting_as', 'Acting As')}
              </Badge>
              {currentHotel && (
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                  {currentHotel.name}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await returnToPlatformScope()
                navigate('/platform')
              }}
              className="w-full h-7 text-[11px] font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all duration-150 mt-0.5"
            >
              <Crown className="w-3 h-3 me-1 text-amber-500" />
              <span>{t('admin:return_to_platform', 'Return to Platform')}</span>
            </Button>
          </div>
        ) : isPlatformAdmin && currentOrganization ? (
          <div className="flex flex-col items-center gap-1.5 text-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wide uppercase">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>{t('admin:platform_operator_mode', 'Platform Operator')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground text-xs font-semibold truncate max-w-full">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-hotel-gold" />
              <span className="truncate">{currentOrganization.name}</span>
            </div>
            {currentHotel && (
              <p className="text-[10px] text-muted-foreground font-medium truncate max-w-full">
                {currentHotel.name}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await returnToPlatformScope()
                navigate('/platform')
              }}
              className="w-full h-7 text-[11px] font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all duration-150 mt-0.5"
            >
              <Crown className="w-3 h-3 me-1 text-amber-500" />
              <span>{t('admin:return_to_platform', 'Return to Platform')}</span>
            </Button>
          </div>
        ) : currentOrganization ? (
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
        ) : !isPlatformActive ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <Link
              to="/select-tenant"
              onClick={onNavigate}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-hotel-gold/15 border border-hotel-gold/30 text-hotel-gold text-[11px] font-semibold hover:bg-hotel-gold/25 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('admin:select_organization', 'Select Organization')}</span>
            </Link>
          </div>
        ) : null}

        {!isPlatformScope && availableProperties.length > 1 && (
          <div className="w-full mt-1">
            <Select
              value={currentProperty?.id ?? CONSOLIDATED_PROPERTY_ID}
              onValueChange={switchProperty}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium border-border/70 bg-muted/40 hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-1.5 truncate">
                  <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder={t_ext('select_property', 'Select Property')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {availableProperties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id} className="text-xs">
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <nav data-tour="sidebar-nav" className="flex-1 p-3 space-y-3 overflow-y-auto">
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
                      onClick={onNavigate}
                      data-tour={getTourAttr(item.path)}
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
                            onClick={onNavigate}
                            data-tour={getTourAttr(item.path)}
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

      <div className="p-3 border-t border-border/60 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-[0.98] transition-all duration-150"
          onClick={() => {
            onNavigate?.()
            setTimeout(() => openWhatCanIDo(), 100)
          }}
        >
          <Compass className="w-4 h-4 me-3 text-primary" />
          <span className="text-xs font-medium">{t('actions.my_guide', 'My Role Guide')}</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-150"
          onClick={async () => {
            onNavigate?.()
            await signOut()
            navigate('/login')
          }}
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
