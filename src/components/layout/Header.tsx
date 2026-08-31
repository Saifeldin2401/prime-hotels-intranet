import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { SyncStatus } from '@/components/common/SyncStatus'
import { TenantScopeSelector } from '@/components/layout/TenantScopeSelector'
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
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
    Bell,
    Check,
    ChevronDown,
    LogOut,
    Menu,
    Search,
    Settings,
    Sparkles,
    User
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  sidebarCollapsed?: boolean
  setSidebarCollapsed?: (value: boolean) => void
  setCommandPaletteOpen?: (value: boolean) => void
  onOpenSearch?: () => void
}

export function Header({
  sidebarCollapsed = false,
  setSidebarCollapsed,
  setCommandPaletteOpen,
  onOpenSearch
}: HeaderProps) {
  const navigate = useNavigate()
  const { user, profile, primaryRole, signOut } = useAuth()
  const { t } = useTranslation(['common', 'nav'])
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy'>('online')

  const statusColors = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    away: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
  }

  const handleOpenSearch = () => {
    if (onOpenSearch) {
      onOpenSearch()
    } else if (setCommandPaletteOpen) {
      setCommandPaletteOpen(true)
    }
  }

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-200">
      {/* Altus Advisory Premium Header Bar - Executive Navy Background with Gold/Copper Accent */}
      <div className="bg-hotel-navy text-white shadow-md border-b-2 border-hotel-gold/70 relative">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            {setSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-gray-200 hover:bg-hotel-navy-light hover:text-white active:scale-[0.98] transition-transform duration-150"
                aria-label={sidebarCollapsed ? t('accessibility.expand_sidebar', 'Expand sidebar') : t('accessibility.collapse_sidebar', 'Collapse sidebar')}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Center Search - Premium Sleek Style */}
          <div className="flex-1 max-w-2xl mx-4 lg:mx-6 hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              className="w-full justify-start text-sm text-slate-300 bg-hotel-navy-dark/80 border-hotel-navy-light/60 hover:bg-hotel-navy-light hover:text-white hover:border-hotel-gold/40 active:scale-[0.99] transition-all duration-150 shadow-inner"
              onClick={handleOpenSearch}
            >
              <Search className="me-2 h-4 w-4 text-hotel-gold/80" />
              <span className="truncate">{t('nav:search_placeholder', 'Search pages, people, documents...')}</span>
            </Button>
            <kbd className="hidden lg:inline-flex h-6 select-none items-center gap-1 rounded border border-hotel-gold/30 bg-hotel-navy-dark/90 px-2 font-mono text-[10px] font-semibold text-hotel-gold shadow-sm" aria-hidden="true">
              Ctrl+K
            </kbd>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-Tenant Scope Hierarchy Selector (Org / Brand / Hotel) */}
            <div className="hidden sm:flex items-center me-1 sm:me-2">
              <TenantScopeSelector />
            </div>

            {/* Sync Status */}
            <SyncStatus className="hidden md:flex" />

            {/* Language Switcher */}
            <div id="language-switcher" className="text-white">
              <LanguageSwitcher
                variant="ghost"
                className="text-white/90 hover:text-white hover:bg-hotel-navy-light text-xs font-semibold h-9 px-2.5 rounded-lg border-transparent active:scale-[0.98] transition-transform duration-150"
              />
            </div>

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
                    className="flex items-center gap-3 hover:bg-hotel-navy-light px-3 py-2 rounded-full border border-transparent hover:border-hotel-navy-dark active:scale-[0.98] transition-all duration-150 group"
                    aria-label={t('nav:user_menu', "User menu")}
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
                      <Avatar className="h-9 w-9 border-2 border-hotel-gold/40 group-hover:border-hotel-gold transition-all duration-200 shadow-sm ring-2 ring-hotel-navy/50">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-hotel-gold text-hotel-navy font-bold">
                          {profile?.full_name
                            ? profile.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                            : (user?.email?.[0]?.toUpperCase() || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute bottom-0 end-0 w-2.5 h-2.5 border-2 border-hotel-navy rounded-full transition-all duration-200", statusColors[userStatus])} />
                    </div>
                    <ChevronDown className="h-4 w-4 text-hotel-gold-light transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
                          <div className={cn("w-2 h-2 rounded-full", userStatus === 'online' ? 'bg-green-500' : userStatus === 'away' ? 'bg-amber-500' : 'bg-red-500')} />
                          <span>{t('common:status')}</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white shadow-2xl min-w-[150px]">
                        <DropdownMenuItem 
                          onClick={() => setUserStatus('online')}
                          className={cn(
                            "focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90 flex items-center justify-between",
                            userStatus === 'online' && "bg-hotel-navy-light font-semibold"
                          )}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 me-2" />
                            {t('common:status_online', 'Online')}
                          </div>
                          {userStatus === 'online' && <Check className="w-3.5 h-3.5 text-hotel-gold" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setUserStatus('away')}
                          className={cn(
                            "focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90 flex items-center justify-between",
                            userStatus === 'away' && "bg-hotel-navy-light font-semibold"
                          )}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-amber-500 me-2" />
                            {t('common:status_away', 'Away')}
                          </div>
                          {userStatus === 'away' && <Check className="w-3.5 h-3.5 text-hotel-gold" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setUserStatus('busy')}
                          className={cn(
                            "focus:bg-hotel-navy-light focus:text-white cursor-pointer text-white/90 flex items-center justify-between",
                            userStatus === 'busy' && "bg-hotel-navy-light font-semibold"
                          )}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 me-2" />
                            {t('common:status_busy', 'Busy')}
                          </div>
                          {userStatus === 'busy' && <Check className="w-3.5 h-3.5 text-hotel-gold" />}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownSub>

                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/profile')}
                    >
                      <User className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:scale-110" />
                      <span>{t('nav:my_profile', 'My Profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/settings')}
                    >
                      <Settings className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-90" />
                      <span>{t('nav:settings', 'Settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="focus:bg-hotel-navy-light focus:text-white cursor-pointer group text-white/90 m-1"
                      onSelect={() => navigate('/notifications')}
                    >
                      <Bell className="me-3 h-4 w-4 text-hotel-gold transition-transform group-hover:rotate-12" />
                      <span>{t('nav:notifications', 'Notifications')}</span>
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
                      <span>{t('nav:my_awards', 'My Awards')}</span>
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
                        <span>{t('nav:logout', 'Sign out')}</span>
                      </DropdownMenuItem>
                    </AlertDialogTriggerRoot>
                    <AlertDialogContent className="bg-hotel-navy-dark border-hotel-gold/20 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-hotel-gold font-serif">{t('nav:confirm_sign_out', 'Confirm Sign Out')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          {t('nav:sign_out_description', 'Are you sure you want to sign out? Your current session will be ended.')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                          {t('common:cancel', 'Cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSignOut}
                          className="bg-red-600 text-white hover:bg-red-700 border-none"
                        >
                          {t('nav:logout', 'Sign Out')}
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
