import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const getNotificationLink = (notification: Notification): string | null => {
    // Check if metadata has specific link
    if (notification.metadata?.link) return notification.metadata.link

    const type = notification.notification_type || (notification as any).type // Handle type alias

    switch (type) {
      case 'approval_required':
      case 'request_approved':
      case 'request_rejected':
        return '/approvals' // Or specific ID if available
      case 'training_assigned':
      case 'training_deadline':
        return '/training'
      case 'document_published':
      case 'document_acknowledgment_required':
        return '/documents' // or /profile?tab=documents
      case 'announcement_new':
        return '/announcements'
      case 'maintenance_assigned':
      case 'maintenance_resolved':
        return '/maintenance'
      case 'referral_status_update':
        return '/jobs/referrals'
      default:
        return null
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white rounded-full text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
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
                disabled={markAllAsRead.isPending}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <div className="h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
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
