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
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X,
  ChevronDown,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/common/ThemeToggle'
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // Auto-expand groups with active items
  useEffect(() => {
    const activeGroups = groupedNavigation
      .filter(group => group.items.some(item => item.isActive))
      .map(group => group.config.id)

    setExpandedGroups(prev => {
      const newExpanded = [...new Set([...prev, ...activeGroups])]
      return newExpanded
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

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={handleNavClick}
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

        {!collapsed && (
          <>
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
          </>
        )}
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
            {!collapsed && (
              <>
                <span className="flex-1 text-left">
                  {t(group.config.title, { defaultValue: group.config.id.replace('_', ' ') })}
                </span>
                {hasActiveBadge && (
                  <div className="w-2 h-2 rounded-full bg-hotel-gold animate-pulse" />
                )}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </>
            )}
            {collapsed && <GroupIcon className="h-4 w-4" />}
          </button>
        ) : (
          !collapsed && (
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t(group.config.title, { defaultValue: group.config.id.replace('_', ' ') })}
            </div>
          )
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
        isMobile ? "lg:hidden w-[85vw] max-w-[320px]" : "hidden lg:block lg:translate-x-0 w-[280px]",
        isOpen ? "translate-x-0" : (document.dir === 'rtl' ? "translate-x-full" : "-translate-x-full"),
        collapsed && !isMobile && "lg:w-20"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center justify-between px-6 border-b border-hotel-navy-dark bg-hotel-navy",
            collapsed && "justify-center px-0"
          )}>
            <div className="flex items-center gap-3">
              <img
                src="/prime-logo-light.png"
                alt="Prime Hotels"
                className="h-8 w-auto"
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
                className="text-gray-300 hover:bg-hotel-navy-light hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {!isMobile && !collapsed && onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="ms-auto text-gray-400 hover:bg-hotel-navy-light hover:text-white h-8 w-8 transition-colors"
              >
                <ChevronDown className="h-4 w-4 ltr:rotate-90 rtl:-rotate-90" />
              </Button>
            )}
          </div>

          {/* User Profile Summary */}
          {!collapsed && (
            <div className="px-4 py-5">
              <div className="p-3 rounded-xl bg-hotel-navy-dark border border-hotel-navy-light">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-hotel-gold flex items-center justify-center border-2 border-hotel-navy shadow-sm">
                    <span className="font-bold text-hotel-navy text-sm">
                      {profile?.full_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate font-serif">
                      {profile?.full_name || 'Guest User'}
                    </p>
                    <p className="text-[10px] text-hotel-gold-light uppercase tracking-wider font-medium truncate">
                      {profile?.job_title || (primaryRole ? t(`common:roles.${primaryRole}`, primaryRole.replace('_', ' ')) : 'Guest')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {groupedNavigation.map(renderGroup)}
          </nav>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t border-hotel-navy-dark space-y-3 bg-hotel-navy-dark",
            collapsed && "p-2 items-center flex flex-col"
          )}>
            <div className={cn(
              "flex items-center gap-2",
              collapsed && "flex-col gap-3"
            )}>
              <ThemeToggle />
              <div className="text-white/80 hover:text-white">
                <LanguageSwitcher />
              </div>
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
      </div>
    </>
  )
}
