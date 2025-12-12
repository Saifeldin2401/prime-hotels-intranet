import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialFeed, type FeedItem } from '@/components/social/SocialFeed'
import { useAuth } from '@/hooks/useAuth'
import { EnhancedCard } from '@/components/ui/enhanced-card'
import { EnhancedBadge } from '@/components/ui/enhanced-badge'
import {
  Calendar,
  Clock,
  FileText,
  Award,
  Bell,
  Target,
  Activity
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

import { useStaffFeed } from '@/hooks/useStaffFeed'
import { ListSkeleton } from '@/components/loading/ListSkeleton'
import { CardSkeleton } from '@/components/loading/CardSkeleton'
import { useStaffDashboardStats } from '@/hooks/useStaffDashboardStats'
import { useUserTasks, useUserSchedule } from '@/hooks/useUserData'
import { useProperty } from '@/contexts/PropertyContext'

export function StaffDashboard() {
  const { user, profile, primaryRole } = useAuth()
  const { currentProperty } = useProperty()
  const { data: realFeedItems, isLoading: feedLoading } = useStaffFeed()
  const { data: stats, isLoading: statsLoading } = useStaffDashboardStats()
  const { data: tasks, isLoading: tasksLoading } = useUserTasks()
  const { data: schedule, isLoading: scheduleLoading } = useUserSchedule()
  const { t, i18n } = useTranslation(['dashboard', 'common'])
  const isRTL = i18n.dir() === 'rtl'

  // Create a compatible user object for SocialFeed
  const currentUser = user ? {
    id: user.id,
    name: profile?.full_name || user.email || 'Unknown',
    email: user.email || '',
    role: (primaryRole as any) || 'staff',
    department: 'Staff', // Default or fetch from context
    property: currentProperty?.name || 'Prime Hotels',
    permissions: []
  } : null

  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const loading = feedLoading || statsLoading || tasksLoading || scheduleLoading

  useEffect(() => {
    if (realFeedItems) {
      setFeedItems(realFeedItems)
    }
  }, [realFeedItems])

  const handleReact = (itemId: string, reaction: string) => {
    setFeedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const currentReactions = item.reactions[reaction] || 0
        return {
          ...item,
          reactions: {
            ...item.reactions,
            [reaction]: currentReactions + 1
          }
        }
      }
      return item
    }))
  }

  const handleComment = (itemId: string, content: string) => {
    if (!currentUser) return

    const newComment = {
      id: Date.now().toString(),
      author: currentUser,
      content,
      timestamp: new Date(),
      reactions: {}
    }

    setFeedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          comments: [...item.comments, newComment]
        }
      }
      return item
    }))
  }

  const handleShare = (itemId: string) => {
    console.log('Share item:', itemId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="prime-card p-6">
              <div className="h-12 w-12 rounded-lg bg-gray-200 animate-pulse mb-4"></div>
              <div className="h-4 w-24 bg-gray-200 animate-pulse mb-2"></div>
              <div className="h-8 w-16 bg-gray-200 animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <CardSkeleton />
          <ListSkeleton items={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="prime-card">
        <div className="prime-card-header">
          <h1 className="text-xl font-semibold">{t('staff.welcome_back', { name: profile?.full_name || user?.email })}</h1>
        </div>
        <div className="prime-card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">{t('staff.subtitle')}</p>
              {profile?.job_title && (
                <p className="text-sm text-gray-500 mt-1">
                  {profile.job_title}
                </p>
              )}
              {currentProperty && (
                <EnhancedBadge variant="secondary" size="sm" className="mt-2">
                  {currentProperty.name}
                </EnhancedBadge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('staff.notifications')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="prime-card">
          <div className="prime-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('staff.stats.todays_tasks')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.todaysTasks || 0}</p>
                <p className={`text-xs mt-1 ${(stats?.tasksChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(stats?.tasksChange || 0) >= 0 ? '+' : ''}{stats?.tasksChange || 0} {t('staff.stats.from_yesterday')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('staff.stats.training_progress')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.trainingProgress || 0}%</p>
                <Progress value={stats?.trainingProgress || 0} className="mt-2" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('staff.stats.upcoming_events')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.upcomingEvents || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.nextEvent ? t('staff.stats.next_event', { event: stats.nextEvent }) : t('staff.stats.no_upcoming_events')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('staff.stats.performance_score')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.performanceScore || 0}%</p>
                <p className="text-xs text-orange-600 mt-1">
                  {(stats?.performanceScore || 0) >= 80 ? t('staff.stats.above_average') : (stats?.performanceScore || 0) >= 60 ? t('staff.stats.average') : t('staff.stats.below_average')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="prime-card">
          <div className="prime-card-body">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-hotel-gold/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-hotel-gold" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('staff.quick_actions.clock_in_out')}</h3>
              <p className="text-sm text-gray-600 mb-4">{t('staff.quick_actions.track_work_hours')}</p>
              <Link
                to="/tasks"
                className="block bg-hotel-navy text-white px-4 py-2 rounded-md text-sm hover:bg-hotel-navy-light transition-colors w-full"
              >
                {t('staff.quick_actions.time_tracking_btn')}
              </Link>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('staff.quick_actions.documents')}</h3>
              <p className="text-sm text-gray-600 mb-4">{t('staff.quick_actions.access_documents')}</p>
              <Link
                to="/documents"
                className="block bg-hotel-gold text-white px-4 py-2 rounded-md text-sm hover:bg-hotel-gold-dark transition-colors w-full"
              >
                {t('staff.quick_actions.view_documents_btn')}
              </Link>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('staff.quick_actions.training')}</h3>
              <p className="text-sm text-gray-600 mb-4">{t('staff.quick_actions.complete_training')}</p>
              <Link
                to="/training/my"
                className="block bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors w-full text-center"
              >
                {t('staff.quick_actions.continue_learning_btn')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">{t('staff.tabs.activity_feed')}</TabsTrigger>
          <TabsTrigger value="tasks">{t('staff.tabs.my_tasks')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('staff.tabs.schedule')}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <div className="prime-card">
            <div className="prime-card-header">
              <h3 className="text-lg font-semibold">{t('staff.recent_activity')}</h3>
            </div>
            <div className="prime-card-body">
              {currentUser && (
                <SocialFeed
                  user={currentUser}
                  feedItems={feedItems}
                  onReact={handleReact}
                  onComment={handleComment}
                  onShare={handleShare}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <EnhancedCard variant="default" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('staff.your_tasks')}</h3>
            {tasks && tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map(task => {
                  const priorityColors = {
                    critical: { dot: 'bg-red-600', badge: 'destructive' as const },
                    urgent: { dot: 'bg-red-500', badge: 'destructive' as const },
                    high: { dot: 'bg-yellow-500', badge: 'warning' as const },
                    medium: { dot: 'bg-blue-500', badge: 'default' as const },
                    low: { dot: 'bg-green-500', badge: 'success' as const }
                  }
                  const colors = priorityColors[task.priority] || priorityColors.medium
                  const dueDate = new Date(task.due_date)
                  const isToday = dueDate.toDateString() === new Date().toDateString()
                  const isTomorrow = dueDate.toDateString() === new Date(Date.now() + 86400000).toDateString()

                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${colors.dot}`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <p className="text-sm text-gray-500">
                            {isToday ? t('staff.due_today') : isTomorrow ? t('staff.due_tomorrow') : t('staff.due_date', { date: dueDate.toLocaleDateString() })}
                          </p>
                        </div>
                      </div>
                      <EnhancedBadge variant={colors.badge} size="sm">
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </EnhancedBadge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('staff.no_tasks')}</p>
            )}
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <EnhancedCard variant="default" padding="lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('staff.weeks_schedule')}</h3>
            {schedule && schedule.length > 0 ? (
              <div className="space-y-3">
                {schedule.map(item => {
                  const typeColors = {
                    shift: { border: 'border-blue-500', bg: 'bg-blue-50', badge: 'default' as const },
                    meeting: { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'secondary' as const },
                    training: { border: 'border-green-500', bg: 'bg-green-50', badge: 'success' as const }
                  }
                  const colors = typeColors[item.type] || typeColors.shift
                  const startDate = new Date(item.start_time)
                  const endDate = new Date(item.end_time)
                  const isToday = startDate.toDateString() === new Date().toDateString()
                  const isTomorrow = startDate.toDateString() === new Date(Date.now() + 86400000).toDateString()

                  const timeString = `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                  const dateString = isToday ? t('staff.today') : isTomorrow ? t('staff.tomorrow') : startDate.toLocaleDateString('en-US', { weekday: 'long' })

                  return (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between p-3 rounded-r-lg",
                      colors.bg,
                      isRTL ? "border-r-4 rounded-r-none rounded-l-lg" : "border-l-4 rounded-l-none rounded-r-lg",
                      isRTL ? `border-r-${colors.border.split('-')[1]}-500` : colors.border // Adjusting border logic is tricky with full class strings, simpler to just rely on border-s/e logic if possible or conditional classes
                    )}
                      style={{
                        borderLeftWidth: isRTL ? '0' : '4px',
                        borderRightWidth: isRTL ? '4px' : '0',
                        borderColor: colors.border === 'border-blue-500' ? '#3b82f6' : colors.border === 'border-green-500' ? '#22c55e' : '#d1d5db'
                      }}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500">{dateString}, {timeString}</p>
                      </div>
                      <EnhancedBadge variant={colors.badge} size="sm">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </EnhancedBadge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{t('staff.no_schedule')}</p>
            )}
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
