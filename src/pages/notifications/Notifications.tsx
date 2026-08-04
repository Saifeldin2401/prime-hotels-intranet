import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getNotificationLink } from '@/lib/notificationLinks'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, isThisWeek, isToday, isYesterday } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
    AlertCircle,
    Bell,
    BellOff,
    Building,
    CheckCircle2,
    Clock,
    FileText,
    GraduationCap,
    Inbox,
    Info,
    MessageSquare,
    Search,
    Trash2,
    Users
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

type FilterType = 'all' | 'unread' | 'approval' | 'training' | 'maintenance' | 'announcement'

export default function Notifications() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications()
    const { hasPermission } = usePermissions()
    const [filter, setFilter] = useState<FilterType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const navigate = useNavigate()
    const { t } = useTranslation('common')
    const { toast } = useToast()

    const filteredNotifications = useMemo(() => {
        return notifications
            .filter(n => {
                if (filter === 'unread') return !n.is_read
                if (filter === 'approval') return n.type === 'approval_required'
                if (filter === 'training') return n.type === 'training_assigned'
                if (filter === 'maintenance') return n.type === 'maintenance_assigned'
                if (filter === 'announcement') return n.type === 'announcement_new'
                return true
            })
            .filter(n =>
                n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.message?.toLowerCase().includes(searchQuery.toLowerCase())
            )
    }, [notifications, filter, searchQuery])

    // Group notifications by date
    const groupedNotifications = useMemo(() => {
        const groups: { label: string; items: typeof filteredNotifications }[] = []
        const today: typeof filteredNotifications = []
        const yesterday: typeof filteredNotifications = []
        const thisWeek: typeof filteredNotifications = []
        const older: typeof filteredNotifications = []

        filteredNotifications.forEach(n => {
            const date = new Date(n.created_at)
            if (isToday(date)) today.push(n)
            else if (isYesterday(date)) yesterday.push(n)
            else if (isThisWeek(date)) thisWeek.push(n)
            else older.push(n)
        })

        if (today.length) groups.push({ label: t('today', 'Today'), items: today })
        if (yesterday.length) groups.push({ label: t('yesterday', 'Yesterday'), items: yesterday })
        if (thisWeek.length) groups.push({ label: t('this_week', 'This Week'), items: thisWeek })
        if (older.length) groups.push({ label: t('older', 'Older'), items: older })

        return groups
    }, [filteredNotifications, t])

    const getNotificationIcon = (type: string) => {
        const iconConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
            'approval_required': { icon: <AlertCircle className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
            'training_assigned': { icon: <GraduationCap className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
            'maintenance_assigned': { icon: <Building className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
            'announcement_new': { icon: <MessageSquare className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
            'task_assigned': { icon: <FileText className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
            'team_update': { icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
        }
        const config = iconConfig[type] || { icon: <Bell className="w-5 h-5 text-gray-500" />, bg: 'bg-gray-50' }
        return (
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
                {config.icon}
            </div>
        )
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id)
        }
        const link = getNotificationLink(notification, { hasPermission })
        if (link) navigate(link)
    }

    const filterButtons: { key: FilterType; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: t('all', 'All'), icon: <Inbox className="w-3.5 h-3.5" /> },
        { key: 'unread', label: t('unread', 'Unread'), icon: <Bell className="w-3.5 h-3.5" /> },
        { key: 'approval', label: t('approvals', 'Approvals'), icon: <AlertCircle className="w-3.5 h-3.5" /> },
        { key: 'training', label: t('training', 'Training'), icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { key: 'maintenance', label: t('maintenance', 'Maintenance'), icon: <Building className="w-3.5 h-3.5" /> },
    ]

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900">
                        {t('notifications_page.title', 'Notifications')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('notifications_page.subtitle', 'Stay updated with your latest assignments and company news')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => markAllAsRead.mutate()}
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        >
                            <CheckCircle2 className="w-4 h-4 me-2" />
                            {t('notifications_page.mark_all_read', 'Mark all read')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
                            <p className="text-xs text-gray-500">{t('notifications_page.total', 'Total')}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                            <p className="text-xs text-gray-500">{t('notifications_page.unread_count', 'Unread')}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{notifications.length - unreadCount}</p>
                            <p className="text-xs text-gray-500">{t('notifications_page.read_count', 'Read')}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {notifications.filter(n => isToday(new Date(n.created_at))).length}
                            </p>
                            <p className="text-xs text-gray-500">{t('notifications_page.today_count', 'Today')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search */}
            <Card className="border-gray-100 shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b border-gray-100 bg-gray-50 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Filter Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {filterButtons.map(fb => (
                                <Button
                                    key={fb.key}
                                    variant={filter === fb.key ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setFilter(fb.key)}
                                    className={cn(
                                        "gap-1.5 text-xs",
                                        filter === fb.key
                                            ? "bg-gray-900 text-white hover:bg-gray-800"
                                            : "text-gray-600 hover:bg-gray-100"
                                    )}
                                >
                                    {fb.icon}
                                    {fb.label}
                                    {fb.key === 'unread' && unreadCount > 0 && (
                                        <Badge className="ms-1 bg-amber-500 text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px]">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </Button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-full md:w-72">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={t('notifications_page.search', 'Search notifications...')}
                                className="ps-9 bg-white border-gray-200 focus:border-indigo-400 focus:ring-indigo-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Bell className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-400">{t('loading', 'Loading...')}</p>
                        </div>
                    ) : groupedNotifications.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto">
                                <BellOff className="w-10 h-10 text-gray-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700">
                                    {t('notifications_page.empty_title', 'No notifications')}
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    {t('notifications_page.empty_desc', "You're all caught up! Check back later for updates.")}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <AnimatePresence>
                                {groupedNotifications.map((group) => (
                                    <div key={group.label}>
                                        {/* Date Group Header */}
                                        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                {group.label}
                                            </span>
                                        </div>

                                        {/* Notification Items */}
                                        {group.items.map((notification, idx) => (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className={cn(
                                                    "group flex items-start gap-4 p-5 border-b border-gray-50 transition-all hover:bg-gray-50 cursor-pointer relative",
                                                    !notification.is_read && "bg-indigo-50/40"
                                                )}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                {/* Unread dot */}
                                                {!notification.is_read && (
                                                    <div className="absolute start-1.5 top-7 w-2 h-2 rounded-full bg-indigo-500" />
                                                )}

                                                {/* Icon */}
                                                <div className="mt-0.5">
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className={cn(
                                                            "text-sm leading-snug",
                                                            !notification.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700"
                                                        )}>
                                                            {notification.title}
                                                        </h3>
                                                        <span className="flex items-center text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                                                            <Clock className="w-3 h-3 me-1" />
                                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteNotification.mutate(notification.id, {
                                                            onSuccess: () => {
                                                                toast({
                                                                    title: t('notifications_page.delete_success', 'Notification deleted'),
                                                                })
                                                            }
                                                        })
                                                    }}
                                                    aria-label={t('accessibility.delete', 'Delete')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer hint */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                <Info className="w-3 h-3" />
                <span>
                    {t('notifications_page.footer', 'Notifications are cleared after 30 days.')}
                    {' '}
                    <button className="text-indigo-500 underline hover:no-underline" onClick={() => navigate('/settings')}>
                        {t('notifications_page.settings_link', 'Manage preferences')}
                    </button>
                </span>
            </div>
        </div>
    )
}
