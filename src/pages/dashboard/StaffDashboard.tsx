import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
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
import { StatSkeleton, ListSkeleton, CardSkeleton, LoadingTransition } from '@/components/ui/loading-system'
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
      <div className="space-y-8 max-w-[1600px] mx-auto p-4 md:p-8">
        <div className="space-y-4 mb-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96 opacity-60" />
        </div>
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <CardSkeleton count={1} />
            <ListSkeleton items={5} />
          </div>
          <div className="space-y-8">
            <CardSkeleton count={2} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="space-y-4 md:space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={item}>
        <EnhancedCard variant="navy" padding="none">
          <div className="px-4 py-3 sm:py-4 border-b border-white/10">
            <h1 className="text-lg sm:text-xl font-bold text-white">{t('staff.welcome_back', { name: profile?.full_name || user?.email })}</h1>
          </div>
          <div className="p-4 sm:p-6 bg-white dark:bg-hotel-navy-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium">{t('staff.subtitle')}</p>
                {profile?.job_title && (
                  <p className="text-sm text-muted-foreground/80 mt-1">
                    {profile.job_title}
                  </p>
                )}
                {currentProperty && (
                  <EnhancedBadge variant="gold" size="sm" className="mt-3">
                    {currentProperty.name}
                  </EnhancedBadge>
                )}
              </div>
            </div>
          </div>
        </EnhancedCard>
      </motion.div>

      {/* Stats Cards */}
      <LoadingTransition
        isLoading={statsLoading}
        skeleton={<StatSkeleton count={4} />}
      >
        <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <EnhancedCard variant="default" padding="none">
            <div className="p-3 xs:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] xs:text-xs md:text-sm font-medium text-muted-foreground truncate">{t('staff.stats.todays_tasks')}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stats?.todaysTasks || 0}</p>
                  <p className={cn(
                    "text-[10px] mt-0.5 font-medium flex items-center gap-1",
                    (stats?.tasksChange || 0) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {(stats?.tasksChange || 0) >= 0 ? '+' : ''}{stats?.tasksChange || 0} <span className="hidden xs:inline">{t('staff.stats.from_yesterday')}</span>
                  </p>
                </div>
                <div className="h-9 w-9 xs:h-12 xs:w-12 shrink-0 rounded-lg bg-info/10 flex items-center justify-center">
                  <Target className="h-5 w-5 xs:h-6 xs:w-6 text-info" />
                </div>
              </div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="default" padding="none">
            <div className="p-3 xs:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] xs:text-xs md:text-sm font-medium text-muted-foreground truncate">{t('staff.stats.training_progress')}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stats?.trainingProgress || 0}%</p>
                  <Progress value={stats?.trainingProgress || 0} className="mt-1.5 h-1" />
                </div>
                <div className="h-9 w-9 xs:h-12 xs:w-12 shrink-0 rounded-lg bg-success/10 flex items-center justify-center">
                  <Award className="h-5 w-5 xs:h-6 xs:w-6 text-success" />
                </div>
              </div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="default" padding="none">
            <div className="p-3 xs:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] xs:text-xs md:text-sm font-medium text-muted-foreground truncate">{t('staff.stats.upcoming_events')}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stats?.upcomingEvents || 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[120px]">
                    {stats?.nextEvent ? t('staff.stats.next_event', { event: stats.nextEvent }) : t('staff.stats.no_upcoming_events')}
                  </p>
                </div>
                <div className="h-9 w-9 xs:h-12 xs:w-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 xs:h-6 xs:w-6 text-primary" />
                </div>
              </div>
            </div>
          </EnhancedCard>

          <EnhancedCard variant="default" padding="none">
            <div className="p-3 xs:p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] xs:text-xs md:text-sm font-medium text-muted-foreground truncate">{t('staff.stats.performance_score')}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stats?.performanceScore || 0}%</p>
                  <p className="text-[10px] text-warning mt-0.5 truncate">
                    {(stats?.performanceScore || 0) >= 80 ? t('staff.stats.above_average') : (stats?.performanceScore || 0) >= 60 ? t('staff.stats.average') : t('staff.stats.below_average')}
                  </p>
                </div>
                <div className="h-9 w-9 xs:h-12 xs:w-12 shrink-0 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 xs:h-6 xs:w-6 text-warning" />
                </div>
              </div>
            </div>
          </EnhancedCard>
        </motion.div>
      </LoadingTransition>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="w-full"
          onClick={handleClockToggle}
        >
          <EnhancedCard
            variant={todayAttendance?.check_in && !todayAttendance?.check_out ? "premium" : "default"}
            padding="md"
            className={cn(
              "group cursor-pointer h-full",
              todayAttendance?.check_in && !todayAttendance?.check_out && "border-success/30"
            )}
          >
            <div className="text-center">
              <div className={cn(
                "h-10 w-10 xs:h-14 xs:w-14 rounded-full flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-all duration-300 shadow-md",
                todayAttendance?.check_in && !todayAttendance?.check_out
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-hotel-gold text-white"
              )}>
                {todayAttendance?.check_in && !todayAttendance?.check_out ? (
                  <LogOut className="h-5 w-5 xs:h-7 xs:w-7" />
                ) : (
                  <LogIn className="h-5 w-5 xs:h-7 xs:w-7" />
                )}
              </div>
              <p className={cn(
                "text-sm xs:text-base font-bold mb-0.5 leading-tight",
                todayAttendance?.check_in && !todayAttendance?.check_out
                  ? "text-destructive"
                  : "text-foreground"
              )}>
                {todayAttendance?.check_in && !todayAttendance?.check_out
                  ? t('staff.quick_actions.clock_out', 'Clock Out')
                  : t('staff.quick_actions.clock_in', 'Clock In')}
              </p>
              <p className="text-[9px] xs:text-[10px] font-medium text-muted-foreground">
                {todayAttendance?.check_in && !todayAttendance?.check_out
                  ? `${t('staff.quick_actions.on_duty_since', 'On duty')} ${format(new Date(todayAttendance.check_in), 'p')}`
                  : t('staff.quick_actions.start_shift', 'Start shift')}
              </p>
            </div>
          </EnhancedCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="w-full"
          onClick={() => window.location.href = '/knowledge'}
        >
          <EnhancedCard variant="default" padding="md" className="group cursor-pointer h-full">
            <div className="text-center relative">
              {stats?.requiredReading > 0 && (
                <EnhancedBadge variant="destructive" size="sm" className="absolute -top-2 -right-2">
                  {stats.requiredReading}
                </EnhancedBadge>
              )}
              <div className="h-10 w-10 xs:h-14 xs:w-14 rounded-full bg-info/10 group-hover:bg-info/20 flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-colors">
                <BookOpen className="h-5 w-5 xs:h-7 xs:w-7 text-info" />
              </div>
              <h3 className="text-xs xs:text-base font-semibold text-foreground mb-0.5 xs:mb-1">{t('staff.quick_actions.required_reading', 'Required Reading')}</h3>
              <p className="text-[10px] xs:text-xs text-muted-foreground">{t('staff.quick_actions.pending_sops', 'Policy reviews')}</p>
            </div>
          </EnhancedCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="w-full"
          onClick={() => window.location.href = '/hr/leave'}
        >
          <EnhancedCard variant="default" padding="md" className="group cursor-pointer h-full">
            <div className="text-center">
              <div className="h-10 w-10 xs:h-14 xs:w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-colors">
                <Calendar className="h-5 w-5 xs:h-7 xs:w-7 text-primary" />
              </div>
              <h3 className="text-xs xs:text-base font-semibold text-foreground mb-0.5 xs:mb-1">{t('staff.quick_actions.my_requests')}</h3>
              <p className="text-[10px] xs:text-xs text-muted-foreground">{t('staff.quick_actions.submit_requests')}</p>
            </div>
          </EnhancedCard>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="w-full"
          onClick={() => window.location.href = '/learning/my'}
        >
          <EnhancedCard variant="default" padding="md" className="group cursor-pointer h-full">
            <div className="text-center">
              <div className="h-10 w-10 xs:h-14 xs:w-14 rounded-full bg-success/10 group-hover:bg-success/20 flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-colors">
                <Award className="h-5 w-5 xs:h-7 xs:w-7 text-success" />
              </div>
              <h3 className="text-xs xs:text-base font-semibold text-foreground mb-0.5 xs:mb-1">{t('staff.quick_actions.my_training')}</h3>
              <p className="text-[10px] xs:text-xs text-muted-foreground">{t('staff.quick_actions.complete_training')}</p>
            </div>
          </EnhancedCard>
        </motion.div>

        {/* Promotion Action - Only for HR/Managers */}
        {['regional_admin', 'property_manager', 'property_hr', 'regional_hr'].includes(currentUser?.role || '') && (
          <PromoteEmployeeDialog onSuccess={() => {
            window.location.reload();
          }}>
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className="w-full">
              <EnhancedCard variant="default" padding="md" className="group cursor-pointer h-full">
                <div className="text-center">
                  <div className="h-10 w-10 xs:h-14 xs:w-14 rounded-full bg-info/10 group-hover:bg-info/20 flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-colors">
                    <Activity className="h-5 w-5 xs:h-7 xs:w-7 text-info" />
                  </div>
                  <h3 className="text-xs xs:text-base font-semibold text-foreground mb-0.5 xs:mb-1">{t('staff.quick_actions.promote_employee')}</h3>
                  <p className="text-[10px] xs:text-xs text-muted-foreground">{t('staff.quick_actions.manage_promotions')}</p>
                </div>
              </EnhancedCard>
            </motion.div>
          </PromoteEmployeeDialog>
        )}

        {/* Transfer Action - Only for HR/Managers */}
        {['regional_admin', 'property_manager', 'property_hr', 'regional_hr'].includes(currentUser?.role || '') && (
          <TransferEmployeeDialog onSuccess={() => {
            window.location.reload();
          }}>
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className="w-full">
              <EnhancedCard variant="default" padding="md" className="group cursor-pointer h-full">
                <div className="text-center">
                  <div className="h-10 w-10 xs:h-14 xs:w-14 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-2 xs:mb-3 transition-colors">
                    <Target className="h-5 w-5 xs:h-7 xs:w-7 text-primary" />
                  </div>
                  <h3 className="text-xs xs:text-base font-semibold text-foreground mb-0.5 xs:mb-1">{t('staff.quick_actions.transfer_employee')}</h3>
                  <p className="text-[10px] xs:text-xs text-muted-foreground">{t('staff.quick_actions.cross_property_moves')}</p>
                </div>
              </EnhancedCard>
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
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-hotel-navy/5">
            <TabsTrigger value="feed" className="text-[10px] xs:text-xs sm:text-sm py-2 xs:py-2.5">{t('staff.tabs.activity_feed')}</TabsTrigger>
            <TabsTrigger value="tasks" className="text-[10px] xs:text-xs sm:text-sm py-2 xs:py-2.5">{t('staff.tabs.my_tasks')}</TabsTrigger>
            <TabsTrigger value="schedule" className="text-[10px] xs:text-xs sm:text-sm py-2 xs:py-2.5">{t('staff.tabs.schedule')}</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <LoadingTransition
              isLoading={feedLoading}
              skeleton={<CardSkeleton count={1} />}
            >
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
            </LoadingTransition>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <LoadingTransition
              isLoading={tasksLoading}
              skeleton={<ListSkeleton items={5} />}
            >
              <EnhancedCard variant="default" padding="lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t('staff.your_tasks')}</h3>
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
                        <div key={task.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm", task.priority === 'critical' ? 'bg-destructive' : colors.dot)}></div>
                            <div>
                              <p className="font-semibold text-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
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
                  <p className="text-muted-foreground text-center py-8">{t('staff.no_tasks')}</p>
                )}
              </EnhancedCard>
            </LoadingTransition>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <LoadingTransition
              isLoading={scheduleLoading}
              skeleton={<ListSkeleton items={5} />}
            >
              <EnhancedCard variant="default" padding="lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">{t('staff.weeks_schedule')}</h3>
                {schedule && schedule.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.map(item => {
                      const typeColors = {
                        shift: { badge: 'default' as const },
                        meeting: { badge: 'secondary' as const },
                        training: { badge: 'success' as const }
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
                          "flex items-center justify-between p-3 bg-muted/30 rounded-lg",
                          isRTL ? "border-r-4 rounded-r-none border-r-primary" : "border-l-4 rounded-l-none border-l-primary",
                          item.type === 'training' && (isRTL ? 'border-r-success' : 'border-l-success'),
                          item.type === 'meeting' && (isRTL ? 'border-r-info' : 'border-l-info')
                        )}
                        >
                          <div>
                            <p className="font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{dateString}, {timeString}</p>
                          </div>
                          <EnhancedBadge variant={colors.badge} size="sm">
                            {t(`common:schedule_types.${item.type}`, item.type)}
                          </EnhancedBadge>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">{t('staff.no_schedule')}</p>
                )}
              </EnhancedCard>
            </LoadingTransition>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
