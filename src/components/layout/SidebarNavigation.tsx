import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialog as AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger as AlertDialogTriggerRoot,
} from "@/components/ui/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import type { NavigationGroupWithItems, NavigationItem } from '@/hooks/useNavigation'
import { useNavigation } from '@/hooks/useNavigation'
import { sidebarItemVariants } from '@/lib/motion'
import { isConsolidatedPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/stores/navigationStore'
import { AnimatePresence, LazyMotion, domAnimation, m, type PanInfo } from 'framer-motion'
import {
  Building,
  ChevronDown,
  Globe,
  LogOut,
  Star,
  X
} from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

interface SidebarNavigationProps {
  isOpen: boolean
  collapsed?: boolean
  onClose: () => void
  onToggleCollapse?: () => void
  isMobile?: boolean
}

export function SidebarNavigation({
  isOpen,
  collapsed = false,
  onClose,
  onToggleCollapse,
  isMobile = false
}: SidebarNavigationProps) {
  const { t } = useTranslation(['nav', 'common'])
  const navigate = useNavigate()

  const authState = useAuth()
  const { groupedNavigation, favoriteItems } = useNavigation()
  const { currentProperty } = useProperty()
  const { expandedGroups, toggleGroupExpanded, isFavorite, toggleFavorite } = useNavigationStore()

  const user = authState?.user
  const primaryRole = authState?.primaryRole
  const profile = authState?.profile
  const signOut = authState?.signOut

  const activeGroupIds = useMemo(
    () => groupedNavigation
      .filter((group) => group.items.some((item) => item.isActive))
      .map((group) => group.config.id),
    [groupedNavigation]
  )

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  const handleNavClick = useCallback(() => {
    if (isMobile) onClose()
  }, [isMobile, onClose])

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isMobile) return
    const swipeThreshold = 100
    if (info.offset.y > swipeThreshold) {
      onClose()
    }
  }

  const userInitials = useMemo(() => {
    const name = profile?.full_name || (typeof user?.email === 'string' ? user.email.split('@')[0] : '')
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [profile?.full_name, user?.email, user])

  const renderNavItem = (item: NavigationItem) => {
    const Icon = item.icon
    const navId = item.path.split('/').filter(Boolean).pop() || item.path
    const isFav = isFavorite(item.path)

    if (isMobile) {
      return (
        <Link
          key={item.path}
          to={item.resolvedPath}
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
            "active:scale-[0.98]",
            item.isActive
              ? "bg-white text-hotel-navy font-semibold shadow-lg shadow-white/10"
              : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            item.isActive ? "bg-hotel-gold/20" : "bg-white/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              item.isActive ? "text-hotel-navy" : "text-white/70"
            )} />
          </div>
          <span className="flex-1">{t(item.title, { defaultValue: item.title })}</span>
          {item.badgeCount && item.badgeCount > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-xs h-5 min-w-5 px-1.5">
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </Badge>
          )}
        </Link>
      )
    }

    return (
      <Link
        key={item.path}
        to={item.resolvedPath}
        onClick={handleNavClick}
        data-nav={navId}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group min-h-touch",
          item.isActive
            ? "bg-gradient-to-r from-hotel-gold to-hotel-gold-dark text-hotel-navy shadow-lg shadow-black/20 font-semibold"
            : "text-gray-300 hover:bg-hotel-navy-light hover:text-white hover:shadow-inner",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? t(item.title, { defaultValue: item.title }) : undefined}
      >
        {item.isActive && collapsed && (
          <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-hotel-gold rounded-e-full" />
        )}

        <Icon className={cn(
          "h-5 w-5 flex-shrink-0",
          item.isActive
            ? "text-hotel-navy"
            : "text-white/60 group-hover:text-hotel-gold transition-colors"
        )} />

        <AnimatePresence>
          {!collapsed && (
            <m.div
              variants={sidebarItemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex-1 flex items-center min-w-0 overflow-hidden"
            >
              <span className="flex-1 tracking-wide truncate">
                {t(item.title, { defaultValue: item.title })}
              </span>
              {item.badgeCount && item.badgeCount > 0 && (
                <Badge className="ms-auto text-[10px] h-5 px-1.5 font-bold min-w-[20px] justify-center bg-hotel-gold text-hotel-navy">
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </Badge>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleFavorite(item.path)
                }}
                className={cn(
                  "ms-1 p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity",
                  isFav && "opacity-100 text-amber-400"
                )}
                title={isFav ? "Unpin favorite" : "Pin favorite"}
              >
                <Star className={cn("h-3.5 w-3.5", isFav && "fill-amber-400 text-amber-400")} />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </Link>
    )
  }

  const renderGroup = (group: NavigationGroupWithItems) => {
    const GroupIcon = group.config.icon
    const isExpanded =
      expandedGroups.includes(group.config.id) ||
      activeGroupIds.includes(group.config.id) ||
      !group.config.collapsible
    const hasActiveBadge = group.items.some(item => item.badgeCount && item.badgeCount > 0)

    if (isMobile) {
      return (
        <div key={group.config.id} className="mb-2">
          {group.config.collapsible ? (
            <button
              onClick={() => toggleGroupExpanded(group.config.id)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors rounded-xl",
                "text-white/60 hover:text-white hover:bg-white/10",
                isExpanded && "text-white/90 bg-white/5"
              )}
            >
              <GroupIcon className="h-4 w-4" />
              <span className="flex-1 text-start">
                {t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })}
              </span>
              {hasActiveBadge && (
                <div className="w-2 h-2 rounded-full bg-hotel-gold animate-pulse flex-shrink-0" />
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200 flex-shrink-0",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          ) : (
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/40 whitespace-nowrap overflow-hidden">
              {t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })}
            </div>
          )}

          {isExpanded && (
            <div className="space-y-1 mt-1 ms-2 ps-2 border-s border-white/10">
              {group.items.map(renderNavItem)}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={group.config.id} className="mb-3">
        {group.config.collapsible ? (
          <button
            onClick={() => toggleGroupExpanded(group.config.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-md",
              "text-gray-400 hover:text-white hover:bg-hotel-navy-light/50",
              collapsed && "justify-center px-0"
            )}
          >
            <AnimatePresence>
              {!collapsed && (
                <m.div
                  variants={sidebarItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex-1 flex items-center gap-3 min-w-0 overflow-hidden"
                >
                  <GroupIcon className="h-3.5 w-3.5 text-hotel-gold/70 shrink-0" />
                  <span className="flex-1 text-start truncate">
                    {t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })}
                  </span>
                  {hasActiveBadge && (
                    <div className="w-2 h-2 rounded-full bg-hotel-gold animate-pulse flex-shrink-0" />
                  )}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 flex-shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </m.div>
              )}
            </AnimatePresence>
            {collapsed && <GroupIcon className="h-4 w-4" />}
          </button>
        ) : (
          <AnimatePresence>
            {!collapsed && (
              <m.div
                variants={sidebarItemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap overflow-hidden"
              >
                {t(group.config.title, { defaultValue: group.config.id.replace(/_/g, ' ') })}
              </m.div>
            )}
          </AnimatePresence>
        )}

        {(isExpanded || collapsed) && (
          <div className={cn(
            "space-y-1",
            !collapsed && group.config.collapsible && "mt-1 ms-2 ps-2 border-s border-white/10"
          )}>
            {group.items.map(renderNavItem)}
          </div>
        )}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      {isMobile && isOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 z-[998] lg:hidden animate-fade-in border-0 p-0"
          onClick={onClose}
          aria-label={t('common:actions.close', 'Close sidebar overlay')}
        />
      )}

      <m.div
        drag={isMobile && isOpen ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={isMobile ? { y: isOpen ? 0 : '100%' } : { x: collapsed ? -260 : 0 }}
        initial={isMobile ? { y: '100%' } : false}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed z-[1001] bg-hotel-navy text-white shadow-2xl overflow-hidden",
          isMobile
            ? "inset-x-0 bottom-0 h-[85vh] rounded-t-[2.5rem] border-t border-white/10"
            : "inset-y-0 start-0 w-[280px] border-e border-hotel-navy-dark block",
          collapsed && !isMobile && "lg:w-20",
          !isMobile && !isOpen && "hidden lg:block",
          isMobile && !isOpen && "pointer-events-none"
        )}>
        <div className="flex h-full flex-col">
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
          )}

          <div className={cn(
            "flex h-20 items-center justify-center relative px-6 border-b border-hotel-navy-dark bg-hotel-navy",
            collapsed && "px-0 h-16",
            isMobile && "h-auto border-none bg-transparent px-4 py-3"
          )}>
            {!isMobile && (
              <div id="sidebar-logo" className={cn("flex items-center justify-center", collapsed ? "" : "absolute start-1/2 transform -translate-x-1/2")}>
                {collapsed ? (
                  <img
                    src="/altus-emblem-icon.png"
                    alt="Altus"
                    className="h-9 w-9 object-contain transition-all duration-300 drop-shadow-[0_0_8px_rgba(197,160,101,0.3)]"
                  />
                ) : (
                  <img
                    src="/altus-logo-web.png"
                    alt="Altus Advisory"
                    className="h-12 w-auto object-contain transition-all duration-300"
                  />
                )}
              </div>
            )}
            {isMobile && (
                <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/altus-emblem-icon.png" alt="Altus" className="h-8 w-8 object-contain" />
                  <span className="text-sm font-semibold text-hotel-gold tracking-wider uppercase">ALTUS</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                  aria-label={t('common:actions.close', "Close sidebar")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            {!isMobile && !collapsed && onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="absolute end-2 text-gray-400 hover:bg-hotel-navy-light hover:text-white h-8 w-8 transition-colors"
                aria-label={t('nav.collapse', "Collapse sidebar")}
              >
                <ChevronDown className="h-4 w-4 ltr:rotate-90 rtl:-rotate-90" />
              </Button>
            )}
          </div>

          {/* Property / Cluster Mode Indicator - Desktop only */}
          {!collapsed && !isMobile && currentProperty && (
            <div className="px-4 py-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                isConsolidatedPropertyId(currentProperty.id)
                  ? "bg-hotel-gold/10 text-hotel-gold border-hotel-gold/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                {isConsolidatedPropertyId(currentProperty.id) ? (
                  <Globe className="w-3.5 h-3.5" />
                ) : (
                  <Building className="w-3.5 h-3.5" />
                )}
                <span className="truncate">{currentProperty.name}</span>
              </div>
            </div>
          )}

          {/* User Profile Section */}
          {!collapsed && (
            <div className={cn(
              "px-4 py-3",
              isMobile && "px-4 py-2 border-b border-white/10"
            )}>
              {isMobile ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-xl border-2 border-hotel-gold/30">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-hotel-gold to-amber-500 text-hotel-navy font-bold rounded-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-white/50 uppercase tracking-wider truncate">
                      {profile?.job_title || (primaryRole ? t(`common:roles.${primaryRole}`) : 'Guest')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full relative py-3 px-3 rounded-xl bg-hotel-navy-dark/30 border border-white/5 shadow-sm flex items-center gap-3 justify-start">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-hotel-gold/20 shadow-sm">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                      <AvatarFallback className="bg-hotel-navy text-hotel-gold font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-green-500 border-2 border-hotel-navy rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  </div>

                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm font-semibold text-white truncate font-serif tracking-wide">
                      {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                        {profile?.job_title || (primaryRole ? t(`common:roles.${primaryRole}`) : 'Guest')}
                      </p>
                      {currentProperty && (
                        <div className="flex items-center gap-1 text-[9px] text-hotel-gold/80 italic truncate">
                          {isConsolidatedPropertyId(currentProperty.id) ? <Globe className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                          <span>{currentProperty.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav id="sidebar-nav" className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {/* Pinned Favorites Section */}
            {!collapsed && favoriteItems.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-2">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span>{t('groups.favorites', { defaultValue: 'Favorites' })}</span>
                </div>
                <div className="space-y-1 mt-1">
                  {favoriteItems.map(renderNavItem)}
                </div>
                <div className="my-3 border-b border-white/10" />
              </div>
            )}

            {isMobile && (
              <div className="mb-3 px-1">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {t('nav.menu', 'Navigation')}
                </h3>
              </div>
            )}

            {groupedNavigation.map(renderGroup)}
          </nav>

          {/* Footer - Language & Sign Out */}
          <div className={cn(
            "p-4 border-t border-hotel-navy-dark space-y-3 bg-hotel-navy-dark",
            collapsed && "p-2 items-center flex flex-col",
            isMobile && "p-3"
          )}>
            {isMobile ? (
              <div className="flex items-center justify-between w-full">
                <LanguageSwitcher
                  variant="ghost"
                  showLabel={true}
                  className="text-white/70 hover:text-white hover:bg-white/10 border-none h-9"
                />
                <AlertDialogRoot>
                  <AlertDialogTriggerRoot asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4 me-2" />
                      {t('nav.logout', 'Sign Out')}
                    </Button>
                  </AlertDialogTriggerRoot>
                  <AlertDialogContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-hotel-gold">{t('common:auth.confirm_signout', 'Sign Out?')}</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/70">
                        {t('common:auth.signout_message', 'Are you sure you want to sign out?')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        {t('common:cancel', 'Cancel')}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleSignOut}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        {t('nav.logout', 'Sign Out')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialogRoot>
              </div>
            ) : (
              <>
                <div className={cn(
                  "flex items-center gap-2",
                  collapsed ? "flex-col-reverse gap-3" : "justify-between w-full"
                )}>
                  <LanguageSwitcher
                    variant="ghost"
                    showLabel={!collapsed}
                    className={cn(
                      "text-white/80 hover:text-white hover:bg-white/10 border-none h-9",
                      collapsed ? "w-9 justify-center px-0" : "justify-start px-2"
                    )}
                  />
                </div>

                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "sm"}
                  onClick={handleSignOut}
                  className={cn(
                    "text-white/60 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full border border-transparent",
                    !collapsed && "justify-start"
                  )}
                  title={t('nav.logout', "Sign out")}
                  aria-label={t('nav.logout', "Sign out")}
                >
                  <LogOut className="h-4 w-4 me-2" />
                  {!collapsed && t('nav.logout', "Sign out")}
                </Button>
              </>
            )}
          </div>
        </div>
      </m.div>
    </LazyMotion>
  )
}

