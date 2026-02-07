import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import {
    Bell,
    CheckCircle2,
    Clock,
    Filter,
    MoreVertical,
    Search,
    Trash2,
    AlertCircle,
    Info,
    Building,
    GraduationCap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/lib/types'

export default function Notifications() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications()
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const navigate = useNavigate()

    const filteredNotifications = notifications
        .filter(n => filter === 'all' || !n.is_read)
        .filter(n =>
            n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.message?.toLowerCase().includes(searchQuery.toLowerCase())
        )

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'approval_required': return <AlertCircle className="w-5 h-5 text-hotel-gold" />
            case 'training_assigned': return <GraduationCap className="w-5 h-5 text-blue-500" />
            case 'maintenance_assigned': return <Building className="w-5 h-5 text-orange-500" />
            case 'announcement_new': return <Bell className="w-5 h-5 text-purple-500" />
            default: return <Info className="w-5 h-5 text-gray-400" />
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead.mutate(notification.id)
        }
        // Logic for navigation based on type
        if (notification.link) navigate(notification.link)
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-hotel-navy">Notifications</h1>
                    <p className="text-muted-foreground mt-1">
                        Stay updated with your latest assignments and company news
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => markAllAsRead.mutate()}
                            className="border-hotel-gold/30 text-hotel-gold hover:bg-hotel-gold/5"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark all as read
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border-hotel-gold/10 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="border-b bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-white rounded-lg border p-1 w-fit">
                            <Button
                                variant={filter === 'all' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter('all')}
                                className={cn(filter === 'all' && "bg-hotel-navy text-white hover:bg-hotel-navy-light")}
                            >
                                All
                            </Button>
                            <Button
                                variant={filter === 'unread' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setFilter('unread')}
                                className={cn(filter === 'unread' && "bg-hotel-navy text-white hover:bg-hotel-navy-light")}
                            >
                                Unread
                                {unreadCount > 0 && <Badge className="ml-2 bg-hotel-gold text-hotel-navy">{unreadCount}</Badge>}
                            </Button>
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search notifications..."
                                className="pl-9 bg-white border-gray-200 focus:border-hotel-gold focus:ring-hotel-gold/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-muted-foreground animate-pulse">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            Loading your notifications...
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                <Bell className="w-8 h-8 opacity-40" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">No notifications found</CardTitle>
                                <p className="text-muted-foreground">You're all caught up! Check back later for updates.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-hotel-gold/5">
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "group flex items-start gap-4 p-5 transition-all hover:bg-hotel-gold/[0.02] cursor-pointer relative",
                                        !notification.is_read && "bg-hotel-gold/5 border-l-4 border-l-hotel-gold"
                                    )}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="mt-1">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={cn(
                                                "font-medium leading-none",
                                                !notification.is_read ? "text-hotel-navy font-bold" : "text-gray-700"
                                            )}>
                                                {notification.title}
                                            </h3>
                                            <div className="flex items-center text-[10px] text-muted-foreground whitespace-nowrap">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                            {notification.message}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-gray-400 hover:text-red-500 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            // Delete logic would go here
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                <Info className="w-3 h-3" />
                <span>Notifications are cleared after 30 days. You can adjust your preferences in <button className="text-hotel-gold underline hover:no-underline" onClick={() => navigate('/settings')}>Settings</button>.</span>
            </div>
        </div>
    )
}
