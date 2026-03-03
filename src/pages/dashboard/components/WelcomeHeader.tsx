import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
  RefreshCw,
  Building2,
  Briefcase,
  Bell,
  Settings,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Activity,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'
import { useTasks } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useTranslation } from "react-i18next"
import { ar } from 'date-fns/locale'
import { QuickCreateMenu } from '@/components/dashboard/QuickCreateMenu'
import { LiveWeather } from '@/components/dashboard/LiveWeather'
import { useWeather } from '@/hooks/useWeather'
import { WeatherBackground } from '@/components/dashboard/WeatherBackground'

interface WelcomeHeaderProps {
  taskCount?: number
  meetingCount?: number
  completionRate?: number
  config: {
    title: string
    subtitle: string
    theme: string
    accentColor: string
  }
  onRefresh: () => void
  isLoading: boolean
  unreadCount: number
  onToggleNotifications: () => void
}

// Live date/time
function LiveDateTime({ isRTL }: { isRTL: boolean }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 font-semibold text-sm">{format(time, 'EEE, MMM d', { locale: isRTL ? ar : undefined })}</span>
      <span className="w-1 h-1 rounded-full bg-slate-200" />
      <span className="text-slate-400 font-mono text-sm tracking-wide">{format(time, 'HH:mm:ss')}</span>
    </div>
  )
}

// Infinite scrolling ticker
function SystemTicker({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null

  const buildTickerEntries = (baseItems: string[]) => {
    const occurrences = new Map<string, number>()
    const entries: Array<{ id: string; text: string }> = []

    baseItems.forEach((item) => {
      const itemCount = occurrences.get(item) ?? 0
      occurrences.set(item, itemCount + 1)
      entries.push({ id: `item-${itemCount}-${item}`, text: item })

      const separator = '\u2022'
      const separatorCount = occurrences.get(separator) ?? 0
      occurrences.set(separator, separatorCount + 1)
      entries.push({ id: `separator-${separatorCount}`, text: separator })
    })

    return entries
  }

  const displayItems = buildTickerEntries(items)

  return (
    <div className="flex items-center overflow-hidden whitespace-nowrap border-b border-slate-200 bg-slate-100 py-1.5 px-4 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
      <Activity className="w-3 h-3 text-slate-400 mr-3 animate-pulse inline-block flex-shrink-0" />
      <m.div
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, ease: "linear", duration: Math.max(20, items.length * 10) }}
        className="flex gap-4"
      >
        {displayItems.map((entry) => <span key={`a-${entry.id}`}>{entry.text}</span>)}
        {displayItems.map((entry) => <span key={`b-${entry.id}`}>{entry.text}</span>)}
        {displayItems.map((entry) => <span key={`c-${entry.id}`}>{entry.text}</span>)}
      </m.div>
    </div>
  )
}

function StatBentoCard({
  icon: Icon,
  title,
  value,
  subtext,
  trend,
  accentColor,
  delay
}: {
  icon: any;
  title: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  accentColor: string;
  delay: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[14px] bg-[#f8fafc] border border-slate-200 p-4 transition-all hover:bg-white/80 hover:shadow-sm flex-1 cursor-default"
    >
      <div className="relative flex flex-col h-full justify-between gap-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm", accentColor)}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-slate-500 font-bold text-[11px] tracking-wider uppercase">{title}</span>
          </div>
          {trend && (
            <div className={cn(
              "flex items-center justify-center rounded-full p-1 bg-white border border-slate-100 shadow-sm",
              trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : "text-slate-400"
            )}>
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            </div>
          )}
        </div>

        <div>
          <div className="text-2xl font-bold text-slate-700 tracking-tight leading-none">{value}</div>
          {subtext && (
            <div className="mt-2 text-xs text-slate-500 font-medium">
              {subtext}
            </div>
          )}
        </div>
      </div>
    </m.div>
  )
}

export function WelcomeHeader({
  config: _config,
  onRefresh,
  isLoading: isLoadingParent,
  unreadCount,
  onToggleNotifications,
  taskCount: taskCountProp,
  meetingCount: meetingCountProp,
  completionRate: completionRateProp
}: WelcomeHeaderProps) {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const { user, profile } = useAuth()
  const { currentProperty } = useProperty()
  const [focusMode, setFocusMode] = useState(false)

  const { data: tasks, isLoading: isLoadingTasks } = useTasks({
    statuses: ['open', 'todo', 'in_progress', 'pending'],
    assignedTo: user?.id,
    ignorePropertyFilter: true
  })

  const { events: upcomingEvents, isLoading: isLoadingEvents } = useEvents()
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats()
  const { data: announcements } = useAnnouncements({ limit: 3 })

  const realTaskCount = taskCountProp ?? (tasks?.length || 0)
  const highPriorityTaskCount = tasks?.filter(t => t.priority === 'high' || t.priority === 'urgent').length || 0
  const realMeetingCount = meetingCountProp ?? (upcomingEvents?.length || 0)

  const now = new Date()
  const nextMeeting = upcomingEvents
    ?.filter(e => new Date(e.start_date) > now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]

  // Build dynamic ticker items
  const tickerItems: string[] = []

  // Real data injections
  if (highPriorityTaskCount > 0) {
    tickerItems.push(t("welcome_header.ticker.action_required", { count: highPriorityTaskCount }))
  } else {
    tickerItems.push(t("welcome_header.ticker.caught_up"))
  }

  if (nextMeeting) {
    tickerItems.push(t("welcome_header.ticker.next_meeting", { title: nextMeeting.title, time: format(new Date(nextMeeting.start_date), "h:mm a") }))
  }

  if (announcements && announcements.length > 0) {
    announcements.forEach((announcement) => tickerItems.push(t("welcome_header.ticker.announcement", { title: announcement.title })))
  }

  if (realTaskCount > 0 && highPriorityTaskCount === 0) {
    tickerItems.push(t("welcome_header.ticker.active_tasks", { count: realTaskCount }))
  }

  if (dashboardStats?.completedTraining && dashboardStats.completedTraining > 0) {
    tickerItems.push(t("welcome_header.ticker.milestone", { count: dashboardStats.completedTraining }))
  }

  if (currentProperty?.name) {
    tickerItems.push(t("welcome_header.ticker.operational_focus", { name: currentProperty.name }))
  }

  // Base system status
  tickerItems.push(t("welcome_header.ticker.system_operational"))

  const totalTraining = (dashboardStats?.completedTraining || 0) + (dashboardStats?.inProgressTraining || 0)
  const realCompletionRate = completionRateProp ?? (totalTraining > 0
    ? Math.round((dashboardStats!.completedTraining / totalTraining) * 100)
    : 0)

  const isLoading = isLoadingParent || isLoadingTasks || isLoadingEvents || isLoadingStats

  const rawFirstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Team'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()

  const { data: weatherData } = useWeather()

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: -20, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[20px] mx-4 my-4 bg-slate-100 border border-slate-200"
      >
        {weatherData && <WeatherBackground code={weatherData.conditionCode} isDay={weatherData.isDay} />}
        {/* Ticker Tape Top Bar */}
        <SystemTicker items={tickerItems} />

        <div className="relative z-10 p-5 lg:p-7 flex flex-col gap-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/50">
            <div className="flex flex-wrap items-center gap-3">
              <LiveDateTime isRTL={isRTL} />
              <LiveWeather />
            </div>

            <div className="flex items-center gap-3">
              <QuickCreateMenu variant="outline" size="sm" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "rounded-full h-8 text-xs font-bold border transition-colors shadow-sm",
                  focusMode ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                <Zap className={cn("w-3.5 h-3.5 mr-1.5", focusMode && "fill-amber-500 text-amber-500 animate-pulse")} />
                {focusMode ? t("welcome_header.focus_mode_on", "Focus Mode On") : t("welcome_header.focus_mode", "Focus Mode")}
              </Button>

              <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <Button variant="ghost" size="icon" onClick={onToggleNotifications} className="relative h-7 w-7 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800">
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading} className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && 'animate-spin')} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Core Content Area */}
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center justify-between">
            {/* Greeting */}
            <m.div className="space-y-1 relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] tracking-widest uppercase mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {t("welcome_header.dashboard_overview", "DASHBOARD OVERVIEW")}
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-700 leading-tight">
                {t("welcome_header.good_to_see_you", "Good to see you,")} <br className="hidden md:block" />
                <span className="font-bold text-slate-800">
                  {firstName}
                </span>
              </h1>

              <div className="flex items-center gap-3 pt-4">
                {currentProperty?.name && (
                  <Badge className="bg-slate-200/50 text-slate-600 border border-slate-200 px-3 py-1.5 font-semibold rounded-lg text-xs">
                    <Building2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    {currentProperty.name}
                  </Badge>
                )}
                {profile?.job_title && (
                  <Badge className="bg-slate-200/50 text-slate-600 border border-slate-200 px-3 py-1.5 font-semibold rounded-lg text-xs">
                    <Briefcase className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    {profile.job_title}
                  </Badge>
                )}
              </div>
            </m.div>

            {/* Interactive Bento Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-3/5">
              <StatBentoCard
                icon={CheckCircle2}
                title={t("welcome_header.stats.tasks", "Tasks")}
                value={realTaskCount}
                trend={realTaskCount > 5 ? 'down' : 'up'}
                accentColor="text-blue-600"
                delay={0.2}
                subtext={
                  highPriorityTaskCount > 0 ? (
                    <span className="flex items-center gap-1 text-rose-600 font-semibold"><AlertCircle className="w-3 h-3" /> {highPriorityTaskCount} urgent</span>
                  ) : (
                    <span className="text-slate-400 font-medium">{t("welcome_header.stats.all_caught_up", "All caught up")}</span>
                  )
                }
              />
              <StatBentoCard
                icon={Calendar}
                title={t("welcome_header.stats.agenda", "Agenda")}
                value={realMeetingCount}
                accentColor="text-indigo-600"
                delay={0.3}
                subtext={
                  nextMeeting ? (
                    <span className="flex items-center gap-1 text-indigo-600 font-semibold"><CalendarClock className="w-3 h-3" /> {format(new Date(nextMeeting.start_date), 'h:mm a')}</span>
                  ) : (
                    <span className="text-slate-400 font-medium">{t("welcome_header.stats.schedule_clear", "Schedule clear")}</span>
                  )
                }
              />
              <StatBentoCard
                icon={TrendingUp}
                title={t("welcome_header.stats.training", "Training")}
                value={`${realCompletionRate}%`}
                trend={realCompletionRate > 50 ? 'up' : 'neutral'}
                accentColor="text-emerald-600"
                delay={0.4}
                subtext={
                  <div className="flex flex-col gap-1.5 w-full">
                    <Progress value={realCompletionRate} className="h-1.5 bg-slate-200" />
                    <span className="text-slate-400 text-[10px] font-semibold">{dashboardStats?.completedTraining || 0} / {totalTraining} {t("welcome_header.stats.done", "done")}</span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </m.div>
    </LazyMotion>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("inline-flex items-center text-xs transition-colors focus:outline-none", className)}>
      {children}
    </div>
  )
}


