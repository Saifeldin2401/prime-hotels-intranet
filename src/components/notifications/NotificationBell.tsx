import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { motion, useAnimation } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { bellVariants } from '@/lib/motion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/lib/types'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from "react-i18next";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingRead } = useNotifications()
  const { roles } = useAuth()
  const { hasPermission } = usePermissions()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const controls = useAnimation()
  const prevUnreadCount = useRef(unreadCount)

  // Trigger shake only on NEW unread notifications
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current) {
      controls.start('shake')
    }
    prevUnreadCount.current = unreadCount
  }, [unreadCount, controls])

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.link) return notification.link
    const type = notification.type
    switch (type) {
      case 'approval_required':
      case 'request_approved':
      case 'request_rejected':
        return '/approvals'
      case 'training_assigned':
        return notification.entity_id ? `/learning/training/${notification.entity_id}` : '/learning/assignments'
      case 'training_deadline':
        return notification.entity_id ? `/learning/training/${notification.entity_id}` : '/learning/assignments'
      case 'document_published':
      case 'document_acknowledgment_required':
        return '/knowledge'
      case 'announcement_new':
        return '/announcements'
      case 'maintenance_assigned':
      case 'maintenance_resolved':
        return '/maintenance'
      case 'referral_status_update': {
        const isHR = hasPermission('hr.manage_referrals')
        return isHR ? '/hr/referrals' : '/jobs/referrals'
      }
      case 'message_received':
        return '/messaging'
      case 'system':
        return null
      default:
        return null
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }
    const link = getNotificationLink(notification)
    if (link) {
      navigate(link)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.div
          variants={bellVariants}
          initial="idle"
          animate={controls}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100/50" aria-label={t('common:notifications_label', 'Notifications')}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-[10px] border-2 border-white"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('common:notifications_label', 'Notifications')}
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto px-2 py-1"
                onClick={() => markAllAsRead.mutate()}
                disabled={isMarkingRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="h-[300px] overflow-y-auto">
          {(!notifications || notifications.length === 0) ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className={`text-sm ${!notification.is_read ? 'font-semibold' : 'text-foreground'}`}>
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
