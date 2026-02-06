import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
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
                <Select value={currentProperty?.id} onValueChange={switchProperty}>
                  <SelectTrigger className={cn(
                    "w-[300px] h-11 bg-hotel-navy-dark/80 border-hotel-gold/30 text-white hover:bg-hotel-navy-light/50 focus:ring-hotel-gold focus:ring-2 transition-all duration-200 rounded-lg shadow-lg",
                    currentProperty?.id === 'all' && "border-hotel-gold bg-hotel-navy-light/30"
                  )}>
                    <div className="flex items-center gap-3 truncate w-full">
                      <div className={cn(
                        "p-2 rounded-md shrink-0",
                        currentProperty?.id === 'all' ? "bg-hotel-gold text-hotel-navy" : "bg-hotel-gold/20 text-hotel-gold"
                      )}>
                        {currentProperty?.id === 'all' ? (
                          <Globe className="h-4 w-4" />
                        ) : (
                          <Building className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden min-w-0">
                        <span className="text-[10px] text-hotel-gold/80 uppercase tracking-wider font-semibold leading-none">
                          {currentProperty?.id === 'all' ? 'Administrative Context' : 'Active Property'}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {currentProperty?.name || 'Select Property'}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-hotel-gold/60 ml-auto shrink-0" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="w-[340px] max-h-[450px] border-hotel-navy/20 bg-white dark:bg-hotel-navy shadow-2xl rounded-xl p-0">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-hotel-navy to-hotel-navy-light border-b border-hotel-gold/20">
                      <p className="text-xs font-bold text-hotel-gold uppercase tracking-wider">Available Properties</p>
                      <p className="text-[10px] text-white/60 mt-0.5">Select your working context</p>
                    </div>
                    {/* Property List - Dynamically Grouped by Region */}
                    <div className="py-2">
                      {/* Administrative/Consolidated View First */}
                      {availableProperties.filter(p => p.id === 'all').map(prop => (
                        <SelectItem 
                          key={prop.id} 
                          value={prop.id} 
                          className={cn(
                            "cursor-pointer mx-2 my-1 rounded-lg border transition-all duration-200",
                            currentProperty?.id === prop.id 
                              ? "bg-hotel-navy text-white border-hotel-gold/50 py-3" 
                              : "hover:bg-hotel-navy/5 border-transparent py-2.5"
                          )}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                              "p-2 rounded-md shrink-0",
                              currentProperty?.id === prop.id ? "bg-hotel-gold text-hotel-navy" : "bg-hotel-navy/10 text-hotel-navy"
                            )}>
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={cn(
                                "font-semibold text-sm truncate",
                                currentProperty?.id === prop.id ? "text-white" : "text-foreground"
                              )}>
                                {prop.name}
                              </span>
                              <span className={cn(
                                "text-[10px] truncate",
                                currentProperty?.id === prop.id ? "text-hotel-gold/80" : "text-muted-foreground"
                              )}>
                                Corporate Headquarters & Global Operations
                              </span>
                            </div>
                            {currentProperty?.id === prop.id && (
                              <div className="ml-auto shrink-0">
                                <div className="w-5 h-5 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}

                      {/* Divider if both types exist */}
                      {availableProperties.some(p => p.id === 'all') && availableProperties.some(p => p.id !== 'all') && (
                        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      )}

                      {/* Dynamic Region Grouping */}
                      {(() => {
                        // Extract all unique regions from property addresses
                        const regionMap = new Map<string, typeof availableProperties>()
                        const regionOrder = ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Tabuk', 'Abha', 'Taif', 'Buraidah', 'Hail', 'Jubail', 'Yanbu', 'Najran', 'Hafar Al-Batin', 'Other']
                        
                        availableProperties
                          .filter(p => p.id !== 'all')
                          .forEach(prop => {
                            const address = (prop.address || '').toLowerCase()
                            // Find matching region from known KSA cities
                            let region = 'Other'
                            for (const city of regionOrder) {
                              if (address.includes(city.toLowerCase())) {
                                region = city
                                break
                              }
                            }
                            
                            if (!regionMap.has(region)) {
                              regionMap.set(region, [])
                            }
                            regionMap.get(region)!.push(prop)
                          })
                        
                        // Sort regions by predefined order, new regions go to end
                        const sortedRegions = Array.from(regionMap.entries()).sort((a, b) => {
                          const indexA = regionOrder.indexOf(a[0])
                          const indexB = regionOrder.indexOf(b[0])
                          if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0])
                          if (indexA === -1) return 1
                          if (indexB === -1) return -1
                          return indexA - indexB
                        })
                        
                        return sortedRegions.map(([region, props]) => (
                          <div key={region} className="mb-2">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-hotel-navy/60 dark:text-hotel-gold/70 uppercase tracking-wider flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-hotel-gold/60" />
                              {region}
                            </p>
                            {props.map(prop => (
                              <SelectItem 
                                key={prop.id} 
                                value={prop.id} 
                                className={cn(
                                  "cursor-pointer mx-2 my-0.5 rounded-lg border transition-all duration-200",
                                  currentProperty?.id === prop.id 
                                    ? "bg-hotel-navy-light/90 text-white border-hotel-gold/30 py-3" 
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent py-2.5"
                                )}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={cn(
                                    "p-1.5 rounded shrink-0",
                                    currentProperty?.id === prop.id ? "bg-hotel-gold/20 text-hotel-gold" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                  )}>
                                    <Building className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                      "font-medium text-sm truncate",
                                      currentProperty?.id === prop.id ? "text-white" : "text-foreground"
                                    )}>
                                      {prop.name}
                                    </span>
                                    {prop.address && (
                                      <span className={cn(
                                        "text-[10px] truncate",
                                        currentProperty?.id === prop.id ? "text-white/60" : "text-muted-foreground"
                                      )}>
                                        {prop.address}
                                      </span>
                                    )}
                                  </div>
                                  {currentProperty?.id === prop.id && (
                                    <div className="ml-auto shrink-0">
                                      <div className="w-5 h-5 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))
                      })()}
                    </div>
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
