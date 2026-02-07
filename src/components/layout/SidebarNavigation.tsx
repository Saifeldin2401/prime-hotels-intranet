/**
 * SidebarNavigation Component
 * 
 * Premium hotel-themed sidebar navigation using centralized navigation config.
 * Features:
 * - Role-based route filtering
 * - Collapsible navigation groups
 * - Dynamic badge counts
 * - Theme/language switcher
 * - Mobile responsive
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sidebarItemVariants } from '@/lib/motion'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProperty } from '@/contexts/PropertyContext'
import {
  X,
  ChevronDown,
  LogOut,
  Globe,
  Building,
  User,
  Settings,
  Bell,
  ChevronsUpDown,
  Sparkles
} from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub as DropdownSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog as AlertDialogRoot,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as AlertDialogTriggerRoot,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@/hooks/useNavigation'
import type { NavigationGroupWithItems, NavigationItem } from '@/hooks/useNavigation'

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
  const { primaryRole, profile, signOut } = useAuth()
  const { groupedNavigation } = useNavigation()
  const { currentProperty } = useProperty()
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // Auto-expand groups with active items
  useEffect(() => {
    const activeGroups = groupedNavigation
      .filter(group => group.items.some(item => item.isActive))
      .map(group => group.config.id)

    setExpandedGroups(prev => {
      // Only add groups that aren't already in prev to avoid infinite re-renders
      const newGroups = activeGroups.filter(id => !prev.includes(id))
      // Only update state if there are ACTUALLY new groups to add
      if (newGroups.length === 0) return prev
      return [...prev, ...newGroups]
    })
  }, [groupedNavigation])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (isMobile) onClose()
  }

  const renderNavItem = (item: NavigationItem) => {
    const Icon = item.icon
    // Extract nav identifier for tour targeting (e.g., /admin/users -> users)
    const navId = item.path.split('/').filter(Boolean).pop() || item.path

    return (
      <Link
        key={item.path}
        to={item.resolvedPath}
        onClick={handleNavClick}
        data-nav={navId}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group min-h-touch",
          item.isActive
            ? "bg-gradient-to-r from-hotel-gold to-hotel-gold-dark text-hotel-navy shadow-lg shadow-black/20"
            : "text-gray-300 hover:bg-hotel-navy-light hover:text-white hover:shadow-inner",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? t(item.title, { defaultValue: item.title }) : undefined}
      >
        {/* Active indicator for collapsed mode */}
        {item.isActive && collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-hotel-gold rounded-e-full" />
        )}

        <Icon className={cn(
          "h-5 w-5 flex-shrink-0",
          item.isActive ? "text-hotel-navy" : "text-white/60 group-hover:text-hotel-gold transition-colors"
        )} />

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              variants={sidebarItemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex-1 flex items-center min-w-0 overflow-hidden"
            >
              <span className="flex-1 tracking-wide truncate">
                {t(item.title, { defaultValue: item.title.split('.').pop() })}
              </span>
              {item.badgeCount && item.badgeCount > 0 && (
                <Badge className={cn(
                  "ms-auto text-[10px] h-5 px-1.5 font-bold min-w-[20px] justify-center",
                  item.isActive ? "bg-hotel-navy/20 text-hotel-navy" : "bg-hotel-gold text-hotel-navy"
                )}>
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    )
  }

  const renderGroup = (group: NavigationGroupWithItems) => {
    const GroupIcon = group.config.icon
    const isExpanded = expandedGroups.includes(group.config.id) || !group.config.collapsible
    const hasActiveBadge = group.items.some(item => item.badgeCount && item.badgeCount > 0)

    return (
      <div key={group.config.id} className="mb-2">
        {/* Group Header */}
        {group.config.collapsible ? (
          <button
            onClick={() => toggleGroup(group.config.id)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-md",
              "text-gray-400 hover:text-white hover:bg-hotel-navy-light/50",
              collapsed && "justify-center px-0"
            )}
          >
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  variants={sidebarItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex-1 flex items-center gap-3 min-w-0 overflow-hidden"
                >
                  <span className="flex-1 text-left truncate">
                    {t(group.config.title, { defaultValue: group.config.id.replace('_', ' ') })}
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
                </motion.div>
              )}
            </AnimatePresence>
            {collapsed && <GroupIcon className="h-4 w-4" />}
          </button>
        ) : (
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                variants={sidebarItemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap overflow-hidden"
              >
                {t(group.config.title, { defaultValue: group.config.id.replace('_', ' ') })}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Group Items */}
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
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[105] lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-[110] bg-hotel-navy text-white transform transition-all duration-300 ease-in-out shadow-2xl",
        "start-0 border-e border-hotel-navy-dark",
        isMobile ? "lg:hidden w-[85vw] max-w-[320px]" : "hidden lg:block w-[280px]",
        isMobile && (isOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"),
        collapsed && !isMobile && "lg:w-20"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-20 items-center justify-center relative px-6 border-b border-hotel-navy-dark bg-hotel-navy",
            collapsed && "px-0 h-16"
          )}>
            <div id="sidebar-logo" className={cn("flex items-center gap-3", collapsed ? "" : "absolute left-1/2 transform -translate-x-1/2")}>
              <img
                src="/prime-logo-light.png"
                alt="Prime Hotels"
                className={cn("w-auto transition-all duration-300", collapsed ? "h-8" : "h-14")}
              />
              {!collapsed && (
                <div className="animate-fade-in sr-only">
                  <h1 className="text-lg font-bold text-white tracking-wide font-serif">
                    Prime Hotels
                  </h1>
                </div>
              )}
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-4 text-gray-300 hover:bg-hotel-navy-light hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {!isMobile && !collapsed && onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="absolute right-2 text-gray-400 hover:bg-hotel-navy-light hover:text-white h-8 w-8 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronDown className="h-4 w-4 ltr:rotate-90 rtl:-rotate-90" />
              </Button>
            )}
          </div>

          {/* User Profile Summary - Enhanced with Avatar & Quick Actions */}
          {!collapsed && (
            <div className="px-4 py-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full relative h-auto py-3 px-3 rounded-xl bg-hotel-navy-dark/50 hover:bg-hotel-navy-light border border-white/5 hover:border-hotel-gold/20 shadow-sm transition-all duration-200 group flex items-center gap-3 justify-start"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-hotel-gold/20 group-hover:border-hotel-gold transition-colors shadow-sm">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-hotel-navy text-hotel-gold font-bold">
                          {profile?.full_name
                            ? profile.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-hotel-navy rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-white truncate font-serif tracking-wide group-hover:text-hotel-gold transition-colors">
                        {profile?.full_name || 'Guest User'}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium truncate">
                          {profile?.job_title || (primaryRole ? t(`common:roles.${primaryRole}`) : 'Guest')}
                        </p>
                        {currentProperty && (
                          <div className="flex items-center gap-1 text-[9px] text-hotel-gold/80 italic truncate">
                            {currentProperty.id === 'all' ? <Globe className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                            <span>{currentProperty.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[240px] bg-hotel-navy-dark border-hotel-gold/20 text-white shadow-xl"
                  align="start"
                  side="right"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-hotel-gold">{profile?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuGroup>
                    <DropdownSub>
                      <DropdownMenuSubTrigger className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                          <span>Status</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white shadow-2xl">
                        <DropdownMenuItem className="focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90">
                          <div className="w-2 h-2 rounded-full bg-green-500 me-2" />
                          Online
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90">
                          <div className="w-2 h-2 rounded-full bg-amber-500 me-2" />
                          Away
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90">
                          <div className="w-2 h-2 rounded-full bg-red-500 me-2" />
                          Busy
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownSub>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90"
                      onSelect={() => navigate('/profile')}
                    >
                      <User className="mr-2 h-4 w-4 text-white/60 group-hover:text-hotel-gold" />
                      <span>{t('nav.my_profile', 'My Profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90"
                      onSelect={() => navigate('/settings')}
                    >
                      <Settings className="mr-2 h-4 w-4 text-white/60 group-hover:text-hotel-gold" />
                      <span>{t('nav.settings', 'Settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90"
                      onSelect={() => navigate('/notifications')}
                    >
                      <Bell className="mr-2 h-4 w-4 text-white/60 group-hover:text-hotel-gold" />
                      <span>{t('notifications', 'Notifications')}</span>
                      <Badge className="ml-auto h-4 px-1 bg-hotel-gold text-hotel-navy text-[10px]">New</Badge>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90"
                      onSelect={() => navigate('/training/certificates')}
                    >
                      <Sparkles className="mr-2 h-4 w-4 text-hotel-gold" />
                      <span>{t('my_awards', 'My Awards')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <AlertDialogRoot>
                    <AlertDialogTriggerRoot asChild>
                      <DropdownMenuItem
                        className="focus:bg-red-900/30 focus:text-red-400 text-red-400 cursor-pointer"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t('nav.logout', 'Sign out')}</span>
                      </DropdownMenuItem>
                    </AlertDialogTriggerRoot>
                    <AlertDialogContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-hotel-gold font-serif">Confirm Sign Out</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          Are you sure you want to sign out of PRIME Connect? You will need to log back in to access your dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSignOut}
                          className="bg-red-600 text-white hover:bg-red-700 border-none"
                        >
                          Sign Out
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialogRoot>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Navigation */}
          <nav id="sidebar-nav" className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {groupedNavigation.map(renderGroup)}
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t border-hotel-navy-dark space-y-3 bg-hotel-navy-dark",
            collapsed && "p-2 items-center flex flex-col"
          )}>
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
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 me-2" />
              {!collapsed && "Sign Out"}
            </Button>
          </div>
        </div>
      </div >
    </>
  )
}
