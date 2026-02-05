import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useProperty } from '@/contexts/PropertyContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Button } from '@/components/ui/button'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  Menu,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Sparkles,
  Building,
  Globe
} from 'lucide-react'

interface HeaderProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (value: boolean) => void
  userMenuOpen: boolean
  setUserMenuOpen: (value: boolean) => void
  handleLogout: () => void
}

export function Header({
  sidebarCollapsed,
  setSidebarCollapsed,
  userMenuOpen,
  setUserMenuOpen,
  handleLogout
}: HeaderProps) {
  const { user, profile, primaryRole } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { t } = useTranslation(['common', 'nav'])

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Prime Connect Premium Header Bar - Navy Background */}
      <div className="bg-hotel-navy text-white shadow-md border-b-4 border-hotel-gold">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex text-gray-200 hover:bg-hotel-navy-light hover:text-white"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Center Search - Premium Style */}
          <GlobalSearch />

          <div className="flex items-center gap-3">
            {/* Property Switcher for Multi-Property Users */}
            {isMultiPropertyUser && (
              <div className="hidden md:flex flex-col items-start me-4">
                <span className="text-[9px] text-hotel-gold-light/70 uppercase tracking-widest font-bold mb-1 ps-1">
                  {currentProperty?.id === 'all' ? 'Administrative Context' : 'Active Property'}
                </span>
                <Select value={currentProperty?.id} onValueChange={switchProperty}>
                  <SelectTrigger className={cn(
                    "w-[280px] h-10 bg-hotel-navy-dark border-hotel-navy-light/30 text-white hover:bg-hotel-navy focus:ring-hotel-gold transition-all duration-300 rounded-lg shadow-inner",
                    currentProperty?.id === 'all' && "border-hotel-gold/50 bg-hotel-navy"
                  )}>
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        currentProperty?.id === 'all' ? "bg-hotel-gold text-hotel-navy" : "bg-hotel-navy text-hotel-gold"
                      )}>
                        {currentProperty?.id === 'all' ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          <Building className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-[9px] text-hotel-gold/60 uppercase tracking-widest font-bold leading-none mb-0.5">
                          {currentProperty?.id === 'all' ? 'Administrative Context' : 'Active Property'}
                        </span>
                        <SelectValue placeholder="Select Property" />
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px] border-hotel-navy-light/20 bg-white dark:bg-hotel-navy text-foreground dark:text-white shadow-2xl rounded-xl">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
                      Available Properties
                    </div>
                    {availableProperties.map(prop => (
                      <SelectItem key={prop.id} value={prop.id} className="cursor-pointer py-3 focus:bg-hotel-navy-light focus:text-white rounded-md mx-1 my-0.5">
                        <div className="flex items-center gap-3 w-full">
                          {prop.id === 'all' ? (
                            <Globe className="h-4 w-4 text-hotel-gold shrink-0" />
                          ) : (
                            <Building className="h-4 w-4 text-hotel-gold/60 shrink-0" />
                          )}
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-semibold text-sm",
                              prop.id === 'all' && "text-hotel-gold font-bold"
                            )}>
                              {prop.name}
                            </span>
                            {prop.address && <span className="text-[10px] opacity-70 italic">{prop.address}</span>}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notification Bell - Light Variant for Navy Header */}
            <div id="notifications-button" className="text-white">
              <NotificationBell />
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-hotel-navy-dark mx-1" />

            {/* User Menu */}
            <div id="user-menu" className="relative ms-1">
              <Button
                variant="ghost"
                className="flex items-center gap-3 hover:bg-hotel-navy-light px-3 py-2 rounded-full border border-transparent hover:border-hotel-navy-dark transition-all duration-200"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-white leading-none mb-1">
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-hotel-gold-light uppercase tracking-wider font-semibold">
                    {/* Display job title or translated primary role */}
                    {profile?.job_title || (primaryRole ? t(`roles.${primaryRole}`) : t('roles.staff'))}
                  </span>
                </div>

                <div className="h-9 w-9 rounded-full bg-hotel-gold flex items-center justify-center text-hotel-navy font-bold shadow-sm border-2 border-hotel-navy ring-2 ring-hotel-gold/30">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                </div>
                <ChevronDown className={`h-4 w-4 text-hotel-gold-light transition-transform duration-200 ${userMenuOpen ? 'transform rotate-180' : ''}`} />
              </Button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-950 rounded-xl shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-200 border border-border">
                    <div className="p-4 bg-hotel-navy text-white rounded-t-xl">
                      <p className="text-sm font-semibold">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-white/70 truncate">{user?.email}</p>
                    </div>

                    <div className="py-2">
                      <a
                        href="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <User className="me-3 h-4 w-4 text-hotel-gold transition-transform duration-300 group-hover:scale-110" />
                        <span>My Profile</span>
                      </a>
                      <a
                        href="/settings"
                        className="flex items-center px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <Settings className="me-3 h-4 w-4 text-hotel-gold transition-transform duration-300 group-hover:rotate-90" />
                        <span>Settings</span>
                      </a>
                      <div className="h-px bg-border my-2 mx-4" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-start flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium group"
                      >
                        <LogOut className="me-3 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
