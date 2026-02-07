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
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Sparkles,
  Building,
  Globe,
  ChevronsUpDown,
  Bell
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
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (value: boolean) => void
  handleLogout: () => void
}

export function Header({
  sidebarCollapsed,
  setSidebarCollapsed,
  handleLogout
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, profile, primaryRole, signOut } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { t } = useTranslation(['common', 'nav'])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

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

            {/* User Menu - Enhanced Premium Dropdown */}
            <div id="user-menu" className="ms-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 hover:bg-hotel-navy-light px-3 py-2 rounded-full border border-transparent hover:border-hotel-navy-dark transition-all duration-200 group"
                  >
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-sm font-medium text-white leading-none mb-1 group-hover:text-hotel-gold transition-colors">
                        {profile?.full_name || user?.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-hotel-gold-light uppercase tracking-wider font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Display job title or translated primary role */}
                        {profile?.job_title || (primaryRole ? t(`roles.${primaryRole}`) : t('roles.staff'))}
                      </span>
                    </div>

                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-hotel-gold/30 group-hover:border-hotel-gold transition-all duration-300 shadow-sm ring-2 ring-hotel-navy/50">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-hotel-gold text-hotel-navy font-bold">
                          {profile?.full_name
                            ? profile.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                            : (user?.email?.[0]?.toUpperCase() || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-hotel-navy rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    </div>
                    <ChevronDown className="h-4 w-4 text-hotel-gold-light transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-64 bg-hotel-navy-dark border-hotel-gold/20 text-white shadow-2xl rounded-xl p-1"
                  align="end"
                  side="bottom"
                  sideOffset={12}
                >
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-semibold text-hotel-gold font-serif tracking-wide">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-white/60 truncate font-mono">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10 mx-2" />

                  <DropdownMenuGroup>
                    <DropdownSub>
                      <DropdownMenuSubTrigger className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                          <span>Status</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white shadow-2xl min-w-[150px]">
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
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/profile')}
                    >
                      <User className="mr-3 h-4 w-4 text-hotel-gold transition-transform group-hover:scale-110" />
                      <span>{t('nav.my_profile', 'My Profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/settings')}
                    >
                      <Settings className="mr-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-90" />
                      <span>{t('nav.settings', 'Settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/notifications')}
                    >
                      <Bell className="mr-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-12" />
                      <span>{t('notifications', 'Notifications')}</span>
                      <Badge className="ml-auto h-4 px-1 bg-hotel-gold text-hotel-navy text-[10px]">99+</Badge>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10 mx-2" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/training/certificates')}
                    >
                      <Sparkles className="mr-3 h-4 w-4 text-hotel-gold" />
                      <span>{t('my_awards', 'My Awards')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10 mx-2" />

                  <AlertDialogRoot>
                    <AlertDialogTriggerRoot asChild>
                      <DropdownMenuItem
                        className="focus:bg-red-900/30 focus:text-red-400 text-red-400 cursor-pointer group m-1"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        <span>{t('nav.logout', 'Sign out')}</span>
                      </DropdownMenuItem>
                    </AlertDialogTriggerRoot>
                    <AlertDialogContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-hotel-gold font-serif">Confirm Sign Out</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          Are you sure you want to sign out? Your current session will be ended.
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
          </div>
        </div>
      </div>
    </header >
  )
}
