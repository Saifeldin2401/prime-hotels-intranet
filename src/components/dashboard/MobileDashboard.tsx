/**
 * MobileDashboard Component - Enhanced Edition
 * 
 * Fully redesigned mobile dashboard with:
 * - Modern hero section with animated greeting
 * - Glassmorphism header with blur effects
 * - Horizontal scrolling stat cards with gradients
 * - Quick actions grid with haptic feedback
 * - Activity feed with swipe gestures
 * - Today's schedule with timeline view
 * - Performance insights mini-charts
 * - Pull to refresh with custom indicator
 * - Sticky bottom safe area handling
 */

// MobileStatsGrid import removed - not currently used
import { ActionSheet, QuickActionButton, QuickActionGrid } from '@/components/mobile/ActionSheet'
import { QuickTaskModal } from '@/components/dashboard/modals/QuickTaskModal'
import { getTimeBasedGreeting } from '@/lib/greetingUtils'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useDashboardStats'

import { useNotifications } from '@/hooks/useNotifications'
import { useUnifiedSocialFeed } from '@/hooks/useUnifiedSocialFeed'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import {
    Bell,
    Briefcase,
    Calendar,
    ChevronRight,
    Clock,
    FileText,
    GraduationCap,
    Info,
    LogOut,
    Mail,
    MessageCircle,
    MoreHorizontal,
    Settings,
    Sparkles,
    Star,
    TrendingUp,
    User,
    Zap
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface ActivityItem {
    id: string
    type: 'task' | 'training' | 'announcement' | 'approval' | 'message' | 'info'
    title: string
    description?: string
    time: string
    read: boolean
    actionable?: boolean
}

interface ScheduleItem {
    id: string
    title: string
    time: string
    duration: string
    type: 'meeting' | 'training' | 'deadline' | 'event'
    location?: string
}

/**
 * MobileDashboard - Enhanced mobile dashboard
 */
export function MobileDashboard() {
    const { t } = useTranslation('dashboard')
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, profile, signOut } = useAuth()
    const { data: stats, isLoading: _isLoading } = useDashboardStats()
    const { notifications, unreadCount, isLoading: isLoadingNotifications } = useNotifications()
    const { feedItems, isLoading: feedLoading } = useUnifiedSocialFeed({ enabled: true })

    const [showQuickActions, setShowQuickActions] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const { greetingText } = getTimeBasedGreeting(t)
    const greeting = greetingText

    const shortDate = format(new Date(), 'EEE, MMM d')

    // Enhanced quick stats with color schemes
    const quickStats = useMemo(() => [
        {
            label: t('tasks', 'Tasks'),
            // pendingTasks comes from get_dashboard_summary, which counts tasks assigned to
            // THIS user only - carry that same scope into the destination link (via the
            // assignedToIds param the Tasks dashboard already supports) instead of landing
            // on the fully unscoped board, which would show everyone's tasks.
            value: stats?.pendingTasks || 0,
            icon: Briefcase,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            href: user?.id ? `/tasks?assignedToIds=${user.id}` : '/tasks',
        },
        {
            label: t('training', 'Training'),
            value: stats?.inProgressTraining || 0,
            icon: GraduationCap,
            color: 'from-emerald-500 to-emerald-600',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            href: '/learning/my',
        },
        {
            label: t('documents', 'Docs'),
            value: stats?.documentsCount || 0,
            icon: FileText,
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600',
            href: '/documents',
        },
        {
            label: t('approvals', 'Approvals'),
            value: stats?.pendingApprovals || 0,
            icon: Zap,
            color: 'from-red-500 to-red-600',
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
            href: '/approvals',
        },
    ], [stats, t, user?.id])

    // Map notifications to activities
    const recentActivities: ActivityItem[] = useMemo(() => {
        if (!notifications || notifications.length === 0) return []
        
        return notifications.slice(0, 10).map(notification => {
            // Map notification type to activity type
            let type: ActivityItem['type'] = 'info'
            const title = notification.title || ''
            const message = notification.message || ''
            
            if (title.toLowerCase().includes('task') || message.toLowerCase().includes('task')) {
                type = 'task'
            } else if (title.toLowerCase().includes('training') || message.toLowerCase().includes('training')) {
                type = 'training'
            } else if (title.toLowerCase().includes('announcement') || message.toLowerCase().includes('announcement')) {
                type = 'announcement'
            } else if (title.toLowerCase().includes('approval') || title.toLowerCase().includes('approved') || message.toLowerCase().includes('approval')) {
                type = 'approval'
            } else if (title.toLowerCase().includes('message') || message.toLowerCase().includes('message')) {
                type = 'message'
            }
            
            // Format time
            const createdAt = new Date(notification.created_at)
            const now = new Date()
            const diffInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
            const diffInDays = Math.floor(diffInHours / 24)
            
            let time: string
            if (diffInHours < 1) {
                time = 'Just now'
            } else if (diffInHours < 24) {
                time = `${diffInHours}h ago`
            } else if (diffInDays < 7) {
                time = `${diffInDays}d ago`
            } else {
                time = format(createdAt, 'MMM d')
            }
            
            return {
                id: notification.id,
                type,
                title: notification.title || 'Notification',
                description: notification.message,
                time,
                read: notification.is_read,
                actionable: !notification.is_read,
            }
        })
    }, [notifications])

    // Today's schedule
    const todaySchedule: ScheduleItem[] = [
        {
            id: '1',
            title: 'Team Standup',
            time: '09:00 AM',
            duration: '30 min',
            type: 'meeting',
            location: 'Conference Room A',
        },
        {
            id: '2',
            title: 'Safety Training Module 3',
            time: '02:00 PM',
            duration: '1 hour',
            type: 'training',
        },
        {
            id: '3',
            title: 'Project Deadline',
            time: '05:00 PM',
            duration: 'All day',
            type: 'deadline',
        },
    ]

    const handleRefresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
            queryClient.invalidateQueries({ queryKey: ['notifications'] }),
            queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
        ])
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'task': return Briefcase
            case 'training': return GraduationCap
            case 'announcement': return Mail
            case 'approval': return Zap
            case 'message': return User
            case 'info': return Info
        }
    }

    const getActivityColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'task': return 'bg-blue-100 text-blue-600 border-blue-200'
            case 'training': return 'bg-emerald-100 text-emerald-600 border-emerald-200'
            case 'announcement': return 'bg-amber-100 text-amber-600 border-amber-200'
            case 'approval': return 'bg-purple-100 text-purple-600 border-purple-200'
            case 'message': return 'bg-slate-100 text-slate-600 border-slate-200'
            case 'info': return 'bg-blue-100 text-blue-600 border-blue-200'
        }
    }

    const getScheduleColor = (type: ScheduleItem['type']) => {
        switch (type) {
            case 'meeting': return 'bg-blue-500'
            case 'training': return 'bg-emerald-500'
            case 'deadline': return 'bg-red-500'
            case 'event': return 'bg-purple-500'
        }
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
                {/* Hero Header with Glassmorphism */}
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
                    <div className="px-4 pt-3 pb-4">
                        {/* Top Row */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowProfile(true)}
                                    className="relative"
                                >
                                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                                        <AvatarImage src={profile?.avatar_url} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                                            {profile?.full_name?.[0] || user?.email?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                                </button>
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium">{shortDate}</p>
                                    <h1 className="font-bold text-lg leading-tight">
                                        {greeting}
                                    </h1>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/notifications')}
                                className="relative p-2.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 end-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Welcome Message */}
                        <p className="text-sm text-muted-foreground">
                            Welcome back, <span className="font-semibold text-foreground">{profile?.full_name?.split(' ')[0] || 'Guest'}</span>! 
                            You have <span className="font-semibold text-primary">{stats?.pendingTasks || 0} tasks</span> pending today.
                        </p>
                    </div>
                </header>

                {/* Main Content */}
                <PullToRefresh onRefresh={handleRefresh}>
                    <main className="pb-32">
                        {/* Quick Stats - Horizontal Scroll with Enhanced Cards */}
                        <section className="py-5">
                            <div className="flex items-center justify-between px-4 mb-3">
                                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                    Overview
                                </h2>
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/reports')}>
                                    View All <ChevronRight className="h-3 w-3 ms-1" />
                                </Button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x">
                                {quickStats.map((stat, index) => (
                                    <m.div
                                        key={stat.label}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex-shrink-0 snap-start"
                                    >
                                        <Card 
                                            className="w-32 border-0 shadow-lg overflow-hidden cursor-pointer active:scale-95 transition-all duration-200"
                                            onClick={() => navigate(stat.href)}
                                        >
                                            <div className={cn("h-1.5 bg-gradient-to-r", stat.color)} />
                                            <CardContent className="p-4 pt-3">
                                                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.bgColor)}>
                                                    <stat.icon className={cn("h-4.5 w-4.5", stat.textColor)} />
                                                </div>
                                                <p className="text-2xl font-bold">{stat.value}</p>
                                                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                            </CardContent>
                                        </Card>
                                    </m.div>
                                ))}
                            </div>
                        </section>

                        {/* Today's Timeline */}
                        <section className="px-4 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Today&apos;s Schedule
                                </h2>
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/hr/scheduling')}>
                                    Calendar <ChevronRight className="h-3 w-3 ms-1" />
                                </Button>
                            </div>
                            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/50">
                                <CardContent className="p-0">
                                    {todaySchedule.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">No events today</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/50">
                                            {todaySchedule.slice(0, 2).map((item, idx) => (
                                                <m.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => navigate('/hr/scheduling')}
                                                >
                                                    <div className={cn("w-1 h-full min-h-[40px] rounded-full", getScheduleColor(item.type))} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold text-sm">{item.title}</p>
                                                                {item.location && (
                                                                    <p className="text-xs text-muted-foreground">{item.location}</p>
                                                                )}
                                                            </div>
                                                            <Badge variant="secondary" className="text-xs shrink-0">
                                                                {item.time}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </m.div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* Quick Actions Grid */}
                        <section className="px-4 mb-6">
                            <h2 className="font-semibold mb-3 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { icon: Briefcase, label: 'Tasks', color: 'text-blue-600', bg: 'bg-blue-100', href: '/tasks' },
                                    { icon: Calendar, label: 'Calendar', color: 'text-emerald-600', bg: 'bg-emerald-100', href: '/hr/scheduling' },
                                    { icon: FileText, label: 'Docs', color: 'text-amber-600', bg: 'bg-amber-100', href: '/documents' },
                                    { icon: MoreHorizontal, label: 'More', color: 'text-slate-600', bg: 'bg-slate-100', action: () => setShowQuickActions(true) },
                                ].map((item, idx) => (
                                    <m.button
                                        key={item.label}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => item.href ? navigate(item.href) : item.action?.()}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all active:scale-95"
                                    >
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.bg)}>
                                            <item.icon className={cn("h-5 w-5", item.color)} />
                                        </div>
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </m.button>
                                ))}
                            </div>
                        </section>

                        {/* Recent Activity */}
                        <section className="px-4 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    Recent Activity
                                </h2>
                                {recentActivities.length > 0 && (
                                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/notifications')}>
                                        View All
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {isLoadingNotifications ? (
                                    // Loading skeleton
                                    Array.from({ length: 3 }).map((_, idx) => (
                                        <Card key={idx} className="border-0 shadow-sm">
                                            <CardContent className="p-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0 animate-pulse" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                                                        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : recentActivities.length === 0 ? (
                                    // Empty state
                                    <Card className="border-0 shadow-sm">
                                        <CardContent className="p-6 text-center">
                                            <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">Check back later for updates</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    // Activity list
                                    <AnimatePresence>
                                        {recentActivities.slice(0, 5).map((activity, idx) => (
                                            <m.div
                                                key={activity.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                <Card 
                                                    className={cn(
                                                        'border-0 shadow-sm cursor-pointer active:scale-[0.99] transition-all duration-200',
                                                        !activity.read && 'bg-primary/5'
                                                    )}
                                                    onClick={() => navigate('/notifications')}
                                                >
                                                    <CardContent className="p-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className={cn(
                                                                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                                                                getActivityColor(activity.type)
                                                            )}>
                                                                {(() => {
                                                                    const Icon = getActivityIcon(activity.type)
                                                                    return <Icon className="h-5 w-5" />
                                                                })()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <p className="font-medium text-sm line-clamp-1">
                                                                            {activity.title}
                                                                        </p>
                                                                        {activity.description && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                                                {activity.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {!activity.read && (
                                                                        <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {activity.time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </m.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </section>

                        {/* Social Activity Feed */}
                        <section className="px-4 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-blue-600" />
                                    Activity Feed
                                </h2>
                                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate('/announcements')}>
                                    View All <ChevronRight className="h-3 w-3 ms-1" />
                                </Button>
                            </div>
                            
                            {feedLoading ? (
                                <Card className="border-0 shadow-sm">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                                                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : feedItems.length === 0 ? (
                                <Card className="border-0 shadow-sm">
                                    <CardContent className="p-6 text-center">
                                        <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">Check back later for updates</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {feedItems.slice(0, 3).map((item, idx) => (
                                            <m.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                            >
                                                <Card 
                                                    className="border-0 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                                                    onClick={() => navigate('/announcements')}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <Avatar className="h-10 w-10 shrink-0">
                                                                <AvatarImage src={item.author?.avatar} />
                                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                                                                    {item.author?.name?.[0] || 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="font-semibold text-sm">{item.author?.name || 'User'}</p>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {format(new Date(item.timestamp), 'MMM d')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {item.content}
                                                                </p>
                                                                {item.type === 'announcement' && (
                                                                    <Badge variant="secondary" className="mt-2 text-xs">
                                                                        Announcement
                                                                    </Badge>
                                                                )}
                                                                {item.type === 'achievement' && (
                                                                    <Badge variant="default" className="mt-2 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                        <Sparkles className="h-3 w-3 me-1" />
                                                                        Achievement
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </m.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </section>



                        {/* Training Progress Mini Widget */}
                        <section className="px-4 mb-6">
                            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
                                <CardContent className="p-4 relative">
                                    <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                                    <div className="relative">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="text-indigo-100 text-sm font-medium">Training Progress</p>
                                                <p className="text-2xl font-bold">75%</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                                <GraduationCap className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <Progress value={75} className="h-2 bg-white/20" />
                                        <p className="text-xs text-indigo-100 mt-3">
                                            3 of 4 modules completed. Next: Safety Training
                                        </p>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white border-0"
                                            onClick={() => navigate('/learning/my')}
                                        >
                                            Continue Learning
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </main>
                </PullToRefresh>

                {/* Quick Actions Sheet */}
                <ActionSheet
                    open={showQuickActions}
                    onOpenChange={setShowQuickActions}
                    title={t('quick_actions', 'Quick Actions')}
                    description="Access common tasks instantly"
                >
                    <QuickActionGrid className="py-4">
                        <QuickActionButton
                            icon={<Briefcase className="h-6 w-6" />}
                            label="New Request"
                            description="Leave, expense, etc."
                            color="blue"
                            onClick={() => { setShowQuickActions(false); navigate('/hr/leave') }}
                        />
                        <QuickActionButton
                            icon={<Zap className="h-6 w-6" />}
                            label="Maintenance"
                            description="Report an issue"
                            color="amber"
                            onClick={() => { setShowQuickActions(false); navigate('/maintenance/submit') }}
                        />
                        <QuickActionButton
                            icon={<Calendar className="h-6 w-6" />}
                            label="Attendance"
                            description="Check in/out"
                            color="green"
                            onClick={() => { setShowQuickActions(false); navigate('/hr/attendance') }}
                        />
                        <QuickActionButton
                            icon={<GraduationCap className="h-6 w-6" />}
                            label="Training"
                            description="Start learning"
                            color="purple"
                            onClick={() => { setShowQuickActions(false); navigate('/learning/my') }}
                        />
                        <QuickActionButton
                            icon={<FileText className="h-6 w-6" />}
                            label="Documents"
                            description="Browse files"
                            color="indigo"
                            onClick={() => { setShowQuickActions(false); navigate('/documents') }}
                        />
                        <QuickActionButton
                            icon={<Sparkles className="h-6 w-6" />}
                            label="Awards"
                            description="View achievements"
                            color="pink"
                            onClick={() => { setShowQuickActions(false); navigate('/training/certificates') }}
                        />
                    </QuickActionGrid>
                </ActionSheet>

                {/* Profile Sheet */}
                <ActionSheet
                    open={showProfile}
                    onOpenChange={setShowProfile}
                    title={t('profile', 'My Profile')}
                    showCloseButton={true}
                >
                    <div className="py-4 space-y-4">
                        {/* User Info */}
                        <div className="flex items-center gap-4 pb-4 border-b">
                            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-primary/80">
                                    {profile?.full_name?.[0] || user?.email?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold text-lg">{profile?.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                                <Badge variant="secondary" className="mt-1">
                                    {profile?.job_title || 'Staff Member'}
                                </Badge>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Tasks', value: stats?.pendingTasks || 0 },
                                { label: 'Training', value: `${stats?.inProgressTraining || 0}` },
                                { label: 'Documents', value: stats?.documentsCount || 0 },
                            ].map(stat => (
                                <div key={stat.label} className="text-center p-3 rounded-xl bg-muted">
                                    <p className="text-lg font-bold">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-11"
                                onClick={() => { setShowProfile(false); navigate('/profile') }}
                            >
                                <User className="h-4 w-4 me-3" />
                                View Full Profile
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-11"
                                onClick={() => { setShowProfile(false); navigate('/settings') }}
                            >
                                <Settings className="h-4 w-4 me-3" />
                                Settings
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full justify-start h-11"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4 me-3" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </ActionSheet>
            </div>
        </LazyMotion>
    )
}
