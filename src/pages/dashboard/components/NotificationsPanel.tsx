import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, Check, Trash2, Settings, Filter, CheckCheck, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationAction, useMarkAllNotificationsRead, useApproveRequest } from '@/hooks/useQuickActions'
import { formatDistanceToNow } from 'date-fns'
import { useTranslation } from "react-i18next";
import { useState } from 'react'
import { toast } from 'sonner'

const notificationIcons: Record<string, any> = {
  task: Check,
  announcement: Bell,
  mention: Bell,
  system: Settings,
  approval: ThumbsUp,
  request: ThumbsUp,
  default: Bell
}

interface NotificationsPanelProps {
  onClose: () => void
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { notifications, isLoading } = useNotifications()
  const notificationAction = useNotificationAction()
  const markAllRead = useMarkAllNotificationsRead()
  const approveRequest = useApproveRequest()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setProcessingIds(prev => new Set(prev).add(notificationId))
    
    try {
      await notificationAction.mutateAsync({ notificationId, action: 'mark_read' })
    } catch (error) {
      toast.error(t('notifications.failed_to_mark_read', 'Failed to mark as read'))
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const handleDelete = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setProcessingIds(prev => new Set(prev).add(notificationId))
    
    try {
      await notificationAction.mutateAsync({ notificationId, action: 'delete' })
    } catch (error) {
      toast.error(t('notifications.failed_to_delete', 'Failed to delete notification'))
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync()
    } catch (error) {
      toast.error(t('notifications.failed_to_mark_all_read', 'Failed to mark all as read'))
    }
  }

  const handleApproveRequest = async (notificationId: string, requestId: string, action: 'approve' | 'reject', e?: React.MouseEvent) => {
    e?.stopPropagation()
    setProcessingIds(prev => new Set(prev).add(notificationId))
    
    try {
      await approveRequest.mutateAsync({ requestId, action })
      // Also mark the notification as read
      await notificationAction.mutateAsync({ notificationId, action: 'mark_read' })
    } catch (error) {
      toast.error(t(`notifications.failed_to_${action}`, `Failed to ${action} request`))
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const isProcessing = (id: string) => processingIds.has(id)

  const getNotificationActions = (notification: any) => {
    const actions = []
    
    // Mark as read action for unread notifications
    if (!notification.is_read) {
      actions.push({
        icon: Check,
        label: t('notifications.mark_read', 'Mark read'),
        onClick: (e: React.MouseEvent) => handleMarkAsRead(notification.id, e),
        variant: 'ghost' as const,
        className: ''
      })
    }

    // Approval actions for approval notifications
    if (notification.type === 'approval' || notification.type === 'request' || notification.metadata?.entity_type === 'request') {
      const requestId = notification.metadata?.entity_id || notification.metadata?.request_id || notification.entity_id
      if (requestId) {
        actions.push({
          icon: ThumbsUp,
          label: t('notifications.approve', 'Approve'),
          onClick: (e: React.MouseEvent) => handleApproveRequest(notification.id, requestId, 'approve', e),
          variant: 'outline' as const,
          className: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
        })
        actions.push({
          icon: ThumbsDown,
          label: t('notifications.reject', 'Reject'),
          onClick: (e: React.MouseEvent) => handleApproveRequest(notification.id, requestId, 'reject', e),
          variant: 'outline' as const,
          className: 'text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700'
        })
      }
    }

    return actions
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "fixed top-0 h-full w-full sm:w-[420px] z-50",
        isRTL ? "left-0" : "right-0"
      )}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <Card className={cn(
        "absolute top-0 h-full w-full border-0 shadow-2xl overflow-hidden bg-white z-10",
        isRTL ? "left-0 rounded-none sm:rounded-r-2xl" : "right-0 rounded-none sm:rounded-l-2xl"
      )}>
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleMarkAllRead}
                  disabled={markAllRead.isPending || unreadCount === 0}
                >
                  <CheckCheck className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} />
                  {t('notifications.mark_all_read') || 'Mark all read'}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700">
                  <Trash2 className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} />
                  {t('notifications.clear_all') || 'Clear all'}
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="divide-y">
                  <AnimatePresence>
                    {notifications?.map((notification, index) => {
                      const Icon = notificationIcons[notification.type] || notificationIcons.default
                      const actions = getNotificationActions(notification)
                      const processing = isProcessing(notification.id)

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "p-4 hover:bg-slate-50 transition-colors",
                            !notification.is_read && "bg-blue-50/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                              notification.is_read ? "bg-slate-300" : "bg-blue-500"
                            )} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className={cn(
                                  "flex items-center gap-2",
                                  isRTL && "flex-row-reverse"
                                )}>
                                  <Icon className="w-4 h-4 text-slate-400" />
                                  <p className={cn(
                                    "font-medium text-sm",
                                    !notification.is_read && "text-primary"
                                  )}>
                                    {notification.title}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>

                              {/* Quick Action Buttons */}
                              {actions.length > 0 && (
                                <div className={cn(
                                  "flex items-center gap-2 mt-3 flex-wrap",
                                  isRTL && "flex-row-reverse justify-end"
                                )}>
                                  {actions.map((action, actionIndex) => (
                                    <Button
                                      key={actionIndex}
                                      variant={action.variant}
                                      size="sm"
                                      onClick={action.onClick}
                                      disabled={processing}
                                      className={cn(
                                        "h-7 text-xs px-2",
                                        action.className
                                      )}
                                    >
                                      {processing ? (
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                          className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                                        />
                                      ) : (
                                        <>
                                          <action.icon className={cn("w-3 h-3", isRTL ? "ml-1" : "mr-1")} />
                                          {action.label}
                                        </>
                                      )}
                                    </Button>
                                  ))}
                                  
                                  {/* Delete button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleDelete(notification.id, e)}
                                    disabled={processing}
                                    className={cn(
                                      "h-7 text-xs px-2 text-slate-400 hover:text-red-600 hover:bg-red-50",
                                      !isRTL && "ml-auto",
                                      isRTL && "mr-auto"
                                    )}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}

                              {/* View Details Link */}
                              {notification.link && actions.length === 0 && (
                                <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
                                  {t('notifications.view_details') || 'View details'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
