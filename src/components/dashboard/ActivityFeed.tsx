/**
 * ActivityFeed Component
 * 
 * Unified activity feed that aggregates events from multiple sources:
 * - Announcements
 * - Knowledge Base updates
 * - Training assignments/completions
 * - Achievements (certifications)
 * - Team updates (birthdays, anniversaries, new joiners)
 * - Recognition
 * 
 * Updated to use 'documents' table for KB updates.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
    Megaphone,
    BookOpen,
    GraduationCap,
    Trophy,
    Cake,
    PartyPopper,
    UserPlus,
    Calendar,
    Star,
    ThumbsUp,
    MessageCircle,
    Clock,
    ChevronRight,
    Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

type FeedItemType =
    | 'announcement'
    | 'kb_update'
    | 'training'
    | 'achievement'
    | 'birthday'
    | 'anniversary'
    | 'new_joiner'
    | 'event'
    | 'recognition'

interface FeedItem {
    id: string
    type: FeedItemType
    title: string
    content?: string
    author?: { id: string; name: string; avatar?: string }
    target?: { id: string; name: string; type: string }
    link?: string
    timestamp: Date
    reactions?: Record<string, number>
    metadata?: Record<string, any>
}

const FEED_TYPE_CONFIG: Record<FeedItemType, { icon: any; color: string; labelKey: string }> = {
    announcement: { icon: Megaphone, color: 'text-blue-600 bg-blue-100', labelKey: 'feed_types.announcement' },
    kb_update: { icon: BookOpen, color: 'text-green-600 bg-green-100', labelKey: 'feed_types.kb_update' },
    training: { icon: GraduationCap, color: 'text-purple-600 bg-purple-100', labelKey: 'feed_types.training' },
    achievement: { icon: Trophy, color: 'text-yellow-600 bg-yellow-100', labelKey: 'feed_types.achievement' },
    birthday: { icon: Cake, color: 'text-pink-600 bg-pink-100', labelKey: 'feed_types.birthday' },
    anniversary: { icon: PartyPopper, color: 'text-orange-600 bg-orange-100', labelKey: 'feed_types.anniversary' },
    new_joiner: { icon: UserPlus, color: 'text-teal-600 bg-teal-100', labelKey: 'feed_types.new_joiner' },
    event: { icon: Calendar, color: 'text-indigo-600 bg-indigo-100', labelKey: 'feed_types.event' },
    recognition: { icon: Star, color: 'text-amber-600 bg-amber-100', labelKey: 'feed_types.recognition' },
}

interface FetchFeedContext {
    user: any
    roles: any[]
    departments: any[]
    properties: any[]
    t: any
}

async function fetchFeedItems({ user, roles, departments, properties, t }: FetchFeedContext): Promise<FeedItem[]> {
    const items: FeedItem[] = []
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    try {
        // Fetch announcements
        const { data: announcements, error } = await supabase
            .from('announcements')
            .select('id, title, content, created_at, created_by, target_audience, author:created_by(id, full_name, avatar_url)')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(20)

        if (announcements) {
            const filteredAnnouncements = announcements.filter((announcement: any) => {
                if (announcement.created_by === user?.id) return true
                const audience = announcement.target_audience
                if (!audience || audience.type === 'all') return true
                const values = audience.values || []
                switch (audience.type) {
                    case 'role': return roles.some(userRole => values.includes(userRole.role))
                    case 'department': return departments.some(dept => values.includes(dept.id))
                    case 'property': return properties.some(prop => values.includes(prop.id))
                    case 'individual': return values.includes(user?.id || '')
                    default: return true
                }
            })

            items.push(...filteredAnnouncements.slice(0, 10).map((a: any) => ({
                id: `announcement-${a.id}`,
                type: 'announcement' as FeedItemType,
                title: a.title,
                content: a.content?.substring(0, 150),
                author: a.author ? { id: a.author.id, name: a.author.full_name, avatar: a.author.avatar_url } : undefined,
                link: `/announcements/${a.id}`,
                timestamp: new Date(a.created_at)
            })))
        }

        // Fetch recent KB updates - MIGRATED to 'documents'
        const { data: kbUpdates } = await supabase
            .from('documents') // Updated table
            .select('id, title, updated_at, status, created_by:profiles!created_by(id, full_name, avatar_url)') // Using standard profiles relationship
            .gte('updated_at', thirtyDaysAgo.toISOString())
            .eq('status', 'PUBLISHED') // Only show published
            .order('updated_at', { ascending: false })
            .limit(10)

        if (kbUpdates) {
            items.push(...kbUpdates.map((k: any) => ({
                id: `kb-${k.id}`,
                type: 'kb_update' as FeedItemType,
                title: t('feed_content.article_updated', { title: k.title }),
                author: k.created_by ? { id: k.created_by.id, name: k.created_by.full_name, avatar: k.created_by.avatar_url } : undefined,
                link: `/knowledge/${k.id}`,
                timestamp: new Date(k.updated_at),
                metadata: { content_type: 'document' }
            })))
        }

        // Fetch training completions (achievements)
        const buildAchievementsQuery = () => supabase
            .from('training_progress')
            .select(`
        id,
        completed_at,
        user:profiles!training_progress_user_id_fkey(id, full_name, avatar_url),
        training:training_modules!training_progress_training_id_fkey(id, title)
      `)
            .eq('status', 'completed')
            .gte('completed_at', thirtyDaysAgo.toISOString())
            .limit(10)

        let { data: achievements, error: achievementsError } = await buildAchievementsQuery()
            .order('completed_at', { ascending: false })

        if (achievementsError) {
            const fallback = await buildAchievementsQuery().order('updated_at', { ascending: false })
            if (!fallback.error) {
                achievements = fallback.data
            }
        }

        if (achievements) {
            items.push(...achievements.map((a: any) => ({
                id: `achievement-${a.id}`,
                type: 'achievement' as FeedItemType,
                title: t('feed_content.training_completed', {
                    name: a.user?.full_name || 'Someone',
                    title: a.training?.title || 'training'
                }),
                author: a.user ? { id: a.user.id, name: a.user.full_name, avatar: a.user.avatar_url } : undefined,
                link: `/training/certificates`,
                timestamp: new Date(a.completed_at)
            })))
        }

        // Fetch birthdays
        const today = new Date()
        const { data: birthdays } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, date_of_birth')
            .not('date_of_birth', 'is', null)

        if (birthdays) {
            birthdays.forEach(p => {
                if (p.date_of_birth) {
                    const bday = new Date(p.date_of_birth)
                    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
                    const daysUntil = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                    if (daysUntil >= 0 && daysUntil <= 7) {
                        items.push({
                            id: `birthday-${p.id}`,
                            type: 'birthday',
                            title: daysUntil === 0
                                ? t('feed_content.happy_birthday', { name: p.full_name })
                                : t('feed_content.birthday_in', { name: p.full_name, days: daysUntil }),
                            author: { id: p.id, name: p.full_name, avatar: p.avatar_url },
                            timestamp: thisYearBday
                        })
                    }
                }
            })
        }

        // Fetch new joiners
        const { data: newJoiners } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, hire_date, job_title, departments:user_departments(department:departments(name))')
            .gte('hire_date', thirtyDaysAgo.toISOString())
            .order('hire_date', { ascending: false })
            .limit(5)

        if (newJoiners) {
            items.push(...newJoiners.map((j: any) => ({
                id: `newjoiner-${j.id}`,
                type: 'new_joiner' as FeedItemType,
                title: t('feed_content.welcome_team', { name: j.full_name }),
                content: t('feed_content.joined_as', { role: j.job_title || 'Team Member' }),
                author: { id: j.id, name: j.full_name, avatar: j.avatar_url },
                timestamp: new Date(j.hire_date!)
            })))
        }

    } catch (error) {
        console.error('Failed to fetch feed items:', error)
    }

    // Sort all items by timestamp
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return items
}

interface ActivityFeedProps {
    compact?: boolean
    maxItems?: number
    filterTypes?: FeedItemType[]
}

export default function ActivityFeed({ compact = false, maxItems = 10, filterTypes }: ActivityFeedProps) {
    const { t, i18n } = useTranslation('dashboard')
    const { user, roles, departments, properties } = useAuth()
    const [enabledTypes, setEnabledTypes] = useState<FeedItemType[]>(
        filterTypes || ['announcement', 'kb_update', 'training', 'achievement', 'birthday', 'new_joiner']
    )

    const { data: allItems, isLoading } = useQuery({
        queryKey: ['activity-feed', user?.id, roles.length, departments.length, properties.length, i18n.language],
        queryFn: () => fetchFeedItems({ user, roles, departments, properties, t }),
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const items = useMemo(() => {
        if (!allItems) return []
        return allItems.filter(item => enabledTypes.includes(item.type)).slice(0, maxItems)
    }, [allItems, enabledTypes, maxItems])

    const toggleType = (type: FeedItemType) => {
        setEnabledTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader className={compact ? 'py-3' : ''}>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-5 w-24" />
                    </CardTitle>
                </CardHeader>
                <CardContent className={compact ? 'py-2' : ''}>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className={cn("flex flex-row items-center justify-between", compact && 'py-3')}>
                <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-hotel-gold" />
                    {t('widgets.activity_feed', 'Activity Feed')}
                </CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                            <Filter className="h-4 w-4" />
                            {t('feed_types.filter', 'Filter')}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {Object.entries(FEED_TYPE_CONFIG).map(([type, config]) => (
                            <DropdownMenuCheckboxItem
                                key={type}
                                checked={enabledTypes.includes(type as FeedItemType)}
                                onCheckedChange={() => toggleType(type as FeedItemType)}
                            >
                                <config.icon className="h-4 w-4 mr-2" />
                                {t(config.labelKey)}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className={compact ? 'py-2' : ''}>
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>{t('widget_common.no_recent_activity', 'No recent activity')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map(item => {
                            const config = FEED_TYPE_CONFIG[item.type]
                            const Icon = config.icon

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors",
                                        item.link && "cursor-pointer"
                                    )}
                                    onClick={() => item.link && window.location.assign(item.link)}
                                >
                                    {/* Avatar or Icon */}
                                    {item.author?.avatar ? (
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={item.author.avatar} />
                                            <AvatarFallback>{item.author.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", config.color)}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-medium text-gray-900 text-sm line-clamp-2">
                                                {item.title}
                                            </p>
                                            <Badge variant="outline" className={cn("text-xs shrink-0", config.color.replace('bg-', 'border-'))}>
                                                {t(config.labelKey)}
                                            </Badge>
                                        </div>

                                        {item.content && !compact && (
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                {item.content}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            {item.author && (
                                                <span>{item.author.name}</span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: i18n.language === 'ar' ? ar : enUS })}
                                            </span>
                                        </div>
                                    </div>

                                    {item.link && (
                                        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
