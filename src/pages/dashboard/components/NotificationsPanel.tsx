import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Check, Trash2, Settings, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from "react-i18next";

const notificationIcons: Record<string, any> = {
  task: Check,
  announcement: Bell,
  mention: Bell,
  system: Settings,
  default: Bell
}

interface NotificationsPanelProps {
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { t } = useTranslation('dashboard')
  const { notifications, isLoading } = useNotifications()

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full sm:w-[400px] z-50"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <Card className="absolute right-0 top-0 h-full w-full border-0 shadow-2xl rounded-none sm:rounded-l-2xl overflow-hidden bg-white z-10">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{t('notifications.title') || 'Notifications'}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? t('notifications.unread_count', { count: unreadCount }) || `${unreadCount} unread` : t('notifications.all_caught_up') || 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : notifications?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-20" />
              <p>{t('notifications.no_notifications') || 'No notifications yet'}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b">
                <Button variant="ghost" size="sm" className="h-8 text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  {t('notifications.mark_all_read') || 'Mark all read'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3 mr-1" />
                  {t('notifications.clear_all') || 'Clear all'}
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="divide-y">
                  {notifications?.map((notification, index) => {
                    const Icon = notificationIcons[notification.type] || notificationIcons.default

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer",
                          !notification.is_read && "bg-blue-50/50"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          notification.is_read ? "bg-slate-300" : "bg-blue-500"
                        )} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              "font-medium text-sm",
                              !notification.is_read && "text-primary"
                            )}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.link && (
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
                              {t('notifications.view_details') || 'View details'}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div >
  )
}
