import { useState, useMemo } from 'react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { Users, Circle, MessageSquare, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePresence } from '@/contexts/PresenceContext'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

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
    const minutes = Math.floor((Date.now() - new Date(onlineAt).getTime()) / 60000)
    if (minutes < 1) return t('online_users.just_now', 'Just now')
    if (minutes < 60) return t('online_users.minutes', '{{count}}m', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('online_users.hours', '{{count}}h', { count: hours })
    return t('online_users.days', '{{count}}d', { count: Math.floor(hours / 24) })
  }

  return (
    <LazyMotion features={domAnimation}>
    <Card className="border-slate-100 shadow-xl overflow-hidden bg-white/70 backdrop-blur-sm border">
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-300" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 rounded-xl bg-emerald-50">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                {t('widgets.online_users_title', 'Online Now')}
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">
                {t('widgets.online_users_desc', '{{count}} team members active', { count: totalOnline })}
              </CardDescription>
            </div>
          </div>

          {totalOnline > 0 && (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
              <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 mr-1.5" />
              {totalOnline}
            </Badge>
          )}
        </div>

        {/* Search */}
        {totalCount > 3 && (
          <div className="relative mt-3">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400",
              isRTL ? "right-3" : "left-3"
            )} />
            <Input
              placeholder={t('online_users.search_placeholder', 'Search team members...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors",
                isRTL ? "pr-9" : "pl-9"
              )}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 right-1 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {sortedUsers.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {t('online_users.no_active', 'No other team members online right now')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t('online_users.check_back', 'Check back later')}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className={cn(
              "pr-4",
              showAll ? "h-[320px]" : "h-[240px]"
            )}>
              <m.div
                variants={ANIMATION_CONFIG.container}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {displayedUsers.map((onlineUser) => (
                    <m.div
                      key={onlineUser.user_id}
                      variants={ANIMATION_CONFIG.item}
                      layout
                      className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarImage src={onlineUser.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 text-xs font-bold">
                            {getInitials(onlineUser.full_name || onlineUser.email || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {onlineUser.full_name || onlineUser.email?.split('@')[0] || t('common.user', 'User')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="truncate">{onlineUser.role || t('common.team_member', 'Team Member')}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-600 font-medium">{getTimeOnline(onlineUser.online_at)}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        asChild
                      >
                        <Link to={`/messages?user=${onlineUser.user_id}`}>
                          <MessageSquare className="w-4 h-4 text-slate-400 hover:text-emerald-600" />
                        </Link>
                      </Button>
                    </m.div>
                  ))}
                </AnimatePresence>
              </m.div>
            </ScrollArea>

            {/* Show More/Less */}
            {sortedUsers.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-xs text-slate-500 hover:text-emerald-700"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? t('common.show_less', 'Show Less')
                  : t('common.show_more', 'Show {{count}} More', { count: sortedUsers.length - 5 })
                }
              </Button>
            )}
          </>
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
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="h-1.5 bg-emerald-100" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {skeletonRows.map((id) => (
            <div key={id} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default OnlineUsersWidget
