import { NotificationBell } from '@/components/notifications/NotificationBell'
import { GlobalSearch } from '@/components/search/GlobalSearch'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuSub as DropdownSub,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
} from '@/components/ui/select'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { isConsolidatedPropertyId } from '@/lib/propertyScope'
import { cn } from '@/lib/utils'
import {
    Bell,
    Building,
    Check,
    ChevronDown,
    Globe,
    LogOut,
    Menu,
    Settings,
    Sparkles,
    User
} from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (value: boolean) => void
}

export function Header({
  sidebarCollapsed,
  setSidebarCollapsed
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, profile, primaryRole, signOut } = useAuth()
  const { currentProperty, availableProperties, isMultiPropertyUser, switchProperty } = useProperty()
  const { t } = useTranslation(['common', 'nav'])
  const isConsolidatedContext = isConsolidatedPropertyId(currentProperty?.id)
  const consolidatedProperties = availableProperties.filter((property) => isConsolidatedPropertyId(property.id))
  const scopedProperties = availableProperties.filter((property) => !isConsolidatedPropertyId(property.id))
  const hasConsolidatedOption = consolidatedProperties.length > 0

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

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
              aria-label={sidebarCollapsed ? t('accessibility.expand_sidebar', 'Expand sidebar') : t('accessibility.collapse_sidebar', 'Collapse sidebar')}
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
                <Select value={currentProperty?.id ?? ''} onValueChange={switchProperty}>
                  <SelectTrigger className={cn(
                    "w-[290px] h-14 bg-hotel-navy-dark border border-hotel-gold/30 text-white hover:bg-hotel-navy-light focus:ring-hotel-gold/50 focus:ring-2 transition-all duration-300 rounded-xl shadow-lg relative group overflow-hidden [&>svg]:text-hotel-gold/80 [&>svg]:opacity-100 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:transition-transform [&>svg]:duration-300 ps-3 pe-4",
                    isConsolidatedContext && "border-hotel-gold/60 bg-gradient-to-r from-hotel-navy-dark to-hotel-navy-light shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                  )}>
                    {isConsolidatedContext && (
                        <div className="absolute inset-0 bg-hotel-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    )}
                    <div className="flex items-center gap-3 w-full pr-1">
                      <div className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-all duration-300",
                        isConsolidatedContext ? "bg-gradient-to-br from-hotel-gold via-yellow-500 to-yellow-600 text-hotel-navy shadow-md" : "bg-hotel-navy/80 text-hotel-gold border border-hotel-gold/20 group-hover:bg-hotel-navy"
                      )}>
                        {isConsolidatedContext ? (
                          <Globe className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          <Building className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden min-w-0 text-left pt-0.5">
                        <span className={cn(
                          "text-[9.5px] uppercase tracking-[0.1em] font-bold leading-tight mb-0.5 transition-colors duration-300",
                          isConsolidatedContext ? "text-hotel-gold" : "text-hotel-gold/70 group-hover:text-hotel-gold/90"
                        )}>
                          {isConsolidatedContext ? 'Administrative Context' : 'Active Property'}
                        </span>
                        <span className="text-[13px] font-semibold truncate w-full text-white/95 tracking-wide">
                          {currentProperty?.name || 'Select Property'}
                        </span>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="w-[340px] max-h-[500px] border border-hotel-gold/20 bg-hotel-navy shadow-2xl shadow-black/40 rounded-xl p-0 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-4 bg-gradient-to-br from-hotel-navy-dark to-hotel-navy border-b border-hotel-gold/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-hotel-gold/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                      <p className="text-xs font-bold text-hotel-gold uppercase tracking-[0.1em] relative z-10">Available Properties</p>
                      <p className="text-[11px] text-white/50 mt-1 font-medium relative z-10">Select your working context</p>
                    </div>
                    {/* Property List - Dynamically Grouped by Region */}
                    <div className="py-2">
                      {/* Administrative/Consolidated View First */}
                      {consolidatedProperties.map(prop => (
                        <SelectItem
                          key={prop.id}
                          value={prop.id}
                          className={cn(
                            "cursor-pointer mx-2 my-1.5 rounded-lg border transition-all duration-200 focus:bg-hotel-navy-light/60 focus:text-white ps-3 [&>span.absolute]:hidden",
                            currentProperty?.id === prop.id
                              ? "bg-hotel-navy-light/80 text-white border-hotel-gold/40 shadow-[0_2px_10px_rgba(212,175,55,0.1)] py-3"
                              : "hover:bg-hotel-navy-light/40 border-transparent py-2.5 text-white/80"
                          )}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors duration-300",
                              currentProperty?.id === prop.id ? "bg-gradient-to-br from-hotel-gold to-yellow-600 text-hotel-navy" : "bg-white/10 text-hotel-gold/80"
                            )}>
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={cn(
                                "font-semibold text-[13px] truncate",
                                currentProperty?.id === prop.id ? "text-white" : "text-white/90"
                              )}>
                                {prop.name}
                              </span>
                              <span className={cn(
                                "text-[10px] truncate",
                                currentProperty?.id === prop.id ? "text-hotel-gold/90 font-medium" : "text-white/50"
                              )}>
                                Corporate Headquarters & Global Operations
                              </span>
                            </div>
                            {currentProperty?.id === prop.id && (
                              <div className="ms-auto shrink-0 ps-3">
                                <div className="w-5 h-5 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center shadow-lg">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}

                      {/* Divider if both types exist */}
                      {hasConsolidatedOption && scopedProperties.length > 0 && (
                        <div className="my-3 mx-4 h-px bg-hotel-gold/20" />
                      )}

                      {/* Dynamic Region Grouping */}
                      {(() => {
                        // Extract all unique regions from property addresses
                        const regionMap = new Map<string, typeof availableProperties>()
                        const regionOrder = ['Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Khobar', 'Tabuk', 'Abha', 'Taif', 'Buraidah', 'Hail', 'Jubail', 'Yanbu', 'Najran', 'Hafar Al-Batin', 'Other']

                        scopedProperties
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
                          <div key={region} className="mb-3">
                            <p className="px-4 py-2 mt-2 mb-1 text-[10px] font-bold text-hotel-gold uppercase tracking-[0.15em] flex items-center gap-2 bg-hotel-navy-dark/40 border-y border-hotel-gold/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-hotel-gold shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
                              {region}
                            </p>
                            {props.map(prop => (
                              <SelectItem
                                key={prop.id}
                                value={prop.id}
                                className={cn(
                                  "cursor-pointer mx-2 my-1 rounded-lg border transition-all duration-200 focus:bg-hotel-navy-light/60 focus:text-white ps-3 [&>span.absolute]:hidden",
                                  currentProperty?.id === prop.id
                                    ? "bg-hotel-navy-light/80 text-white border-hotel-gold/40 shadow-[0_2px_10px_rgba(212,175,55,0.1)] py-3"
                                    : "hover:bg-hotel-navy-light/40 border-transparent py-2.5 text-white/80"
                                )}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors duration-300",
                                    currentProperty?.id === prop.id ? "bg-hotel-gold/20 text-hotel-gold border border-hotel-gold/30" : "bg-white/5 text-white/60"
                                  )}>
                                    <Building className="h-4 w-4" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                      "font-medium text-[13px] truncate",
                                      currentProperty?.id === prop.id ? "text-white" : "text-white/90"
                                    )}>
                                      {prop.name}
                                    </span>
                                    {prop.address && (
                                      <span className={cn(
                                        "text-[10px] truncate",
                                        currentProperty?.id === prop.id ? "text-hotel-gold/80" : "text-white/50"
                                      )}>
                                        {prop.address}
                                      </span>
                                    )}
                                  </div>
                                  {currentProperty?.id === prop.id && (
                                    <div className="ms-auto shrink-0 ps-3">
                                      <div className="w-5 h-5 rounded-full bg-hotel-gold text-hotel-navy flex items-center justify-center shadow-lg">
                                        <Check className="w-3 h-3 stroke-[3]" />
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
                    aria-label={t('nav.user_menu', "User menu")}
                  >
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-sm font-medium text-white leading-none mb-1 group-hover:text-hotel-gold transition-colors capitalize">
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
                      <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-green-500 border-2 border-hotel-navy rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
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
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-hotel-gold/40 flex-shrink-0">
                        <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                        <AvatarFallback className="bg-hotel-gold/20 text-hotel-gold font-bold">
                          {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold text-hotel-gold font-serif tracking-wide capitalize">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-white/60 truncate font-mono">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10 mx-2" />

                  <DropdownMenuGroup>
                    <DropdownSub>
                      <DropdownMenuSubTrigger className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                          <span>{t('common:status')}</span>
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
                      <User className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:scale-110" />
                      <span>{t('nav.my_profile', 'My Profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/settings')}
                    >
                      <Settings className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-90" />
                      <span>{t('nav.settings', 'Settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/notifications')}
                    >
                      <Bell className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-12" />
                      <span>{t('notifications', 'Notifications')}</span>
                      <Badge className="ms-auto h-4 px-1 bg-hotel-gold text-hotel-navy text-[10px]">99+</Badge>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10 mx-2" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/training/certificates')}
                    >
                      <Sparkles className="me-3 h-4 w-4 text-hotel-gold" />
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
                        <LogOut className="me-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
