import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { usePresence } from '@/contexts/PresenceContext'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { Circle, MessageSquare, Search, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const ANIMATION_CONFIG = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  }
}

export function OnlineUsersWidget() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { onlineUsers } = usePresence()
  const { user: currentUser } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // All users including self for the count badge in header
  const totalOnline = onlineUsers.length

  // Filter out current user and apply search for the visible list
  const filteredUsers = useMemo(() => {
    const otherUsers = onlineUsers.filter(u => u.user_id !== currentUser?.id)
    if (!searchQuery.trim()) return otherUsers

    const query = searchQuery.toLowerCase()
    return otherUsers.filter(u =>
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    )
  }, [onlineUsers, currentUser?.id, searchQuery])

  // Sort by online status (newest first) and then by name
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const timeCompare = new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
      if (timeCompare !== 0) return timeCompare
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
  }, [filteredUsers])

  const displayedUsers = showAll ? sortedUsers : sortedUsers.slice(0, 5)
  const totalCount = sortedUsers.length

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getTimeOnline = (onlineAt: string) => {
    const minutes = Math.floor((currentTime - new Date(onlineAt).getTime()) / 60000)
    if (minutes < 1) return t('online_users.just_now', 'Just now')
    if (minutes < 60) return t('online_users.minutes', '{{count}}m', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('online_users.hours', '{{count}}h', { count: hours })
    return t('online_users.days', '{{count}}d', { count: Math.floor(hours / 24) })
  }

  return (
    <LazyMotion features={domAnimation}>
      <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="pb-4 pt-6 px-6 relative z-10 bg-white border-b border-slate-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                </span>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">
                  {t('widgets.online_users_title', 'Online Now')}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-500 mt-1">
                  {t('widgets.online_users_desc', '{{count}} team members active', { count: totalOnline })}
                </CardDescription>
              </div>
            </div>

            {totalOnline > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-2.5 shadow-sm text-sm">
                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 mr-1.5" />
                {totalOnline}
              </Badge>
            )}
          </div>

          {/* Search */}
          {totalCount > 3 && (
            <div className="relative mt-4">
              <Search className={cn(
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50",
                isRTL ? "right-3" : "left-3"
              )} />
              <Input
                placeholder={t('online_users.search_placeholder', 'Search team members...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "h-10 text-[14px] font-medium bg-emerald-50/50 border-emerald-100/50 focus:bg-white focus:border-emerald-300 focus:ring-emerald-200/50 shadow-inner rounded-xl transition-all",
                  isRTL ? "pr-10" : "pl-10"
                )}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 right-1 h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-1 relative bg-slate-50/30">
          {sortedUsers.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-slate-100 shadow-sm">
                <Users className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-800 font-bold text-lg">
                {t('online_users.no_active', 'No other team members online')}
              </p>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {t('online_users.check_back', 'Check back later')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <ScrollArea className={cn(
                "px-6 pb-2 pt-4 flex-1"
              )}>
                <m.div
                  variants={ANIMATION_CONFIG.container}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {displayedUsers.map((onlineUser) => (
                      <m.div
                        key={onlineUser.user_id}
                        variants={ANIMATION_CONFIG.item}
                        layout
                        className="group flex items-center gap-4 p-3 rounded-2xl bg-white shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:shadow-md border border-slate-100 hover:border-emerald-100 transition-all ease-out"
                      >
                        <div className="relative">
                          <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-1 ring-emerald-100/50">
                            <AvatarImage src={onlineUser.avatar_url} />
                            <AvatarFallback className="bg-emerald-50 text-emerald-700 text-[13px] font-bold">
                              {getInitials(onlineUser.full_name || onlineUser.email || 'User')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors leading-tight mb-0.5">
                            {onlineUser.full_name || onlineUser.email?.split('@')[0] || t('common.user', 'User')}
                          </p>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <span className="truncate">{onlineUser.role || t('common.team_member', 'Team Member')}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-600">{getTimeOnline(onlineUser.online_at)}</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 bg-white"
                          asChild
                        >
                          <Link to={`/messages?user=${onlineUser.user_id}`}>
                            <MessageSquare className="w-4 h-4 fill-emerald-100/50" />
                          </Link>
                        </Button>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </m.div>
              </ScrollArea>

              {/* Show More/Less */}
              {sortedUsers.length > 5 && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/30">
                  <Button
                    variant="outline"
                    className="w-full font-bold text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 border-slate-200 rounded-xl bg-white/50"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll
                      ? t('common.show_less', 'Show Less')
                      : t('common.show_more', 'Show {{count}} More', { count: sortedUsers.length - 5 })
                    }
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </LazyMotion>
  )
}

// Loading skeleton
export function OnlineUsersWidgetSkeleton() {
  const skeletonRows = ['u1', 'u2', 'u3', 'u4']

  return (
    <Card className="h-full border border-slate-200 shadow-sm rounded-2xl bg-white p-6">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="space-y-4">
        {skeletonRows.map((rowKey) => (
          <div key={rowKey} className="flex gap-4 items-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default OnlineUsersWidget
