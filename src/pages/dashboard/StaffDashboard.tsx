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
import { motion } from 'framer-motion'

import { useStaffFeed } from '@/hooks/useStaffFeed'
import { ListSkeleton } from '@/components/loading/ListSkeleton'
import { CardSkeleton } from '@/components/loading/CardSkeleton'
import { useStaffDashboardStats } from '@/hooks/useStaffDashboardStats'
import { useUserTasks, useUserSchedule } from '@/hooks/useUserData'
import { useProperty } from '@/contexts/PropertyContext'
import { KnowledgeWidget } from '@/components/dashboard/KnowledgeWidget'
import { DailyQuizWidget } from '@/components/questions'
import { PromoteEmployeeDialog } from '@/components/hr/PromoteEmployeeDialog'
import { TransferEmployeeDialog } from '@/components/hr/TransferEmployeeDialog'
import { useAttendance, useCheckIn, useCheckOut } from '@/hooks/useAttendance'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { LogIn, LogOut, BookOpen } from 'lucide-react'

export function StaffDashboard() {
  const { user, profile, primaryRole } = useAuth()
  const { currentProperty } = useProperty()
  const { data: realFeedItems, isLoading: feedLoading } = useStaffFeed()
  const { data: stats, isLoading: statsLoading } = useStaffDashboardStats()
  const { data: tasks, isLoading: tasksLoading } = useUserTasks()
  const { data: schedule, isLoading: scheduleLoading } = useUserSchedule()
  const { t, i18n } = useTranslation(['dashboard', 'common'])

  // Attendance Logic
  const { data: attendance } = useAttendance()
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()
  const todayAttendance = attendance?.find(
    (a) => a.date === new Date().toISOString().split('T')[0]
  )

  const handleClockToggle = async () => {
    try {
      if (todayAttendance?.check_in && !todayAttendance.check_out) {
        await checkOutMutation.mutateAsync({ id: todayAttendance.id })
        toast.success(t('common:messages.success_clock_out', 'Successfully clocked out'))
      } else {
        await checkInMutation.mutateAsync({})
        toast.success(t('common:messages.success_clock_in', 'Successfully clocked in'))
      }
    } catch (error) {
      toast.error(t('common:messages.error_action_failed', 'Action failed'))
    }
  }
  const isRTL = i18n.dir() === 'rtl'

  // Animation variants
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  }

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
  // Show loading skeleton only for initial auth loading, not data loading
  const isInitialLoading = !user

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

  const handleShare = (_itemId: string) => {
    // Share functionality placeholder - to be implemented
  }

  if (isInitialLoading) {
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
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={item} className="prime-card">
        <div className="prime-card-header">
          <h1 className="text-xl font-semibold">{t('staff.welcome_back', { name: profile?.full_name || user?.email })}</h1>
        </div>
        <div className="prime-card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400">{t('staff.subtitle')}</p>
              {profile?.job_title && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {profile.job_title}
                </p>
              )}
              {currentProperty && (
                <EnhancedBadge variant="secondary" size="sm" className="mt-2">
                  {currentProperty.name}
                </EnhancedBadge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="prime-card">
          <div className="prime-card-body p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('staff.stats.todays_tasks')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.todaysTasks || 0}</p>
                <p className={cn(
                  "text-xs mt-1 font-medium",
                  (stats?.tasksChange || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {(stats?.tasksChange || 0) >= 0 ? '+' : ''}{stats?.tasksChange || 0} {t('staff.stats.from_yesterday')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('staff.stats.training_progress')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.trainingProgress || 0}%</p>
                <Progress value={stats?.trainingProgress || 0} className="mt-2 h-1.5" />
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('staff.stats.upcoming_events')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.upcomingEvents || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats?.nextEvent ? t('staff.stats.next_event', { event: stats.nextEvent }) : t('staff.stats.no_upcoming_events')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="prime-card">
          <div className="prime-card-body p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('staff.stats.performance_score')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.performanceScore || 0}%</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {(stats?.performanceScore || 0) >= 80 ? t('staff.stats.above_average') : (stats?.performanceScore || 0) >= 60 ? t('staff.stats.average') : t('staff.stats.below_average')}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={cn(
            "prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden",
            todayAttendance?.check_in && !todayAttendance?.check_out
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : ""
          )}
          onClick={handleClockToggle}
        >
          <div className="prime-card-body p-6">
            <div className="text-center">
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 shadow-md",
                todayAttendance?.check_in && !todayAttendance?.check_out
                  ? "bg-red-600 text-white"
                  : "bg-hotel-gold text-white"
              )}>
                {todayAttendance?.check_in && !todayAttendance?.check_out ? (
                  <LogOut className="h-7 w-7" />
                ) : (
                  <LogIn className="h-7 w-7" />
                )}
              </div>
              <p className={cn(
                "text-base font-bold mb-0.5 leading-tight",
                todayAttendance?.check_in && !todayAttendance?.check_out
                  ? "text-red-700 dark:text-red-400"
                  : "text-gray-900 dark:text-white"
              )}>
                {todayAttendance?.check_in && !todayAttendance?.check_out
                  ? t('staff.quick_actions.clock_out', 'Clock Out')
                  : t('staff.quick_actions.clock_in', 'Clock In')}
              </p>
              <p className={cn(
                "text-[10px] font-medium leading-none",
                todayAttendance?.check_in && !todayAttendance?.check_out
                  ? "text-red-600/80 dark:text-red-400/80"
                  : "text-gray-500 dark:text-gray-400"
              )}>
                {todayAttendance?.check_in && !todayAttendance?.check_out
                  ? `${t('staff.quick_actions.on_duty_since', 'On duty since')} ${format(new Date(todayAttendance.check_in), 'p')}`
                  : t('staff.quick_actions.start_shift', 'Start your shift')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => window.location.href = '/knowledge'}
        >
          <div className="prime-card-body p-6">
            <div className="text-center relative">
              {stats?.requiredReading > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white border-0 px-2 min-w-[20px] justify-center">
                  {stats.requiredReading}
                </Badge>
              )}
              <div className="h-14 w-14 rounded-full bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center mx-auto mb-3 transition-colors">
                <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('staff.quick_actions.required_reading', 'Required Reading')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('staff.quick_actions.pending_sops', 'Pending policy reviews')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => window.location.href = '/hr/leave'}
        >
          <div className="prime-card-body p-6">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-purple-50 dark:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Calendar className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{t('staff.quick_actions.my_requests')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('staff.quick_actions.submit_requests')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer"
          onClick={() => window.location.href = '/learning/my'}
        >
          <div className="prime-card-body p-6">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Award className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{t('staff.quick_actions.my_training')}</h3>
              <p className="text-xs text-gray-500">{t('staff.quick_actions.complete_training')}</p>
            </div>
          </div>
        </motion.div>

        {/* Promotion Action - Only for HR/Managers */}
        {['regional_admin', 'property_manager', 'property_hr', 'regional_hr'].includes(currentUser?.role || '') && (
          <PromoteEmployeeDialog onSuccess={() => {
            // Ideally refresh data here
            window.location.reload();
          }}>
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className="prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer w-full">
              <div className="prime-card-body p-6">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-full bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Activity className="h-7 w-7 text-purple-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{t('staff.quick_actions.promote_employee')}</h3>
                  <p className="text-xs text-gray-500">{t('staff.quick_actions.manage_promotions')}</p>
                </div>
              </div>
            </motion.div>
          </PromoteEmployeeDialog>
        )}

        {/* Transfer Action - Only for HR/Managers */}
        {['regional_admin', 'property_manager', 'property_hr', 'regional_hr'].includes(currentUser?.role || '') && (
          <TransferEmployeeDialog onSuccess={() => {
            window.location.reload();
          }}>
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className="prime-card group hover:shadow-lg transition-all duration-200 cursor-pointer w-full">
              <div className="prime-card-body p-6">
                <div className="text-center">
                  <div className="h-14 w-14 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Target className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{t('staff.quick_actions.transfer_employee')}</h3>
                  <p className="text-xs text-gray-500">{t('staff.quick_actions.cross_property_moves')}</p>
                </div>
              </div>
            </motion.div>
          </TransferEmployeeDialog>
        )}
      </motion.div>
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KnowledgeWidget />
        <DailyQuizWidget />
      </motion.div>
      <motion.div variants={item}>
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="feed" className="text-xs sm:text-sm py-2.5">{t('staff.tabs.activity_feed')}</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm py-2.5">{t('staff.tabs.my_tasks')}</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-sm py-2.5">{t('staff.tabs.schedule')}</TabsTrigger>
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
                          {t(`common:priority.${task.priority}`, task.priority)}
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
                        isRTL ? `border-r-${colors.border.split('-')[1]}-500` : colors.border
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
                          {t(`common:schedule_types.${item.type}`, item.type)}
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
      </motion.div>
    </motion.div>
  )
}
