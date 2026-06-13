import { Progress } from '@/components/ui/progress'
import { Sparkline } from '@/components/ui/Sparkline'
import { useTranslation } from "react-i18next"
import { useTasks } from '@/hooks/useTasks'
import { useEvents } from '@/hooks/useEvents'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { m, LazyMotion, domAnimation } from 'framer-motion'
import { Calendar, CheckCircle2, TrendingUp, AlertCircle, CalendarClock, TrendingDown } from 'lucide-react'

interface StatBentoCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: React.ReactNode
  subtext?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  accentColor: string
  delay: number
  showPulse?: boolean
}

function StatBentoCard({
  icon: Icon,
  title,
  value,
  subtext,
  trend,
  accentColor,
  delay,
  showPulse
}: StatBentoCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[14px] bg-white border border-slate-200 p-5 transition-all hover:bg-slate-50 hover:shadow-sm flex-1 cursor-default"
    >
      <div className="absolute bottom-0 right-0 p-1 opacity-20 transition-opacity group-hover:opacity-40 z-0">
        <Sparkline
          data={[30, 45, 32, 50, 40, 60, 40]}
          color={accentColor.includes('amber') ? '#d97706' : accentColor.includes('emerald') ? '#059669' : accentColor.includes('blue') ? '#2563eb' : '#4f46e5'}
          width={80}
          height={30}
        />
      </div>

      <div className="relative flex flex-col h-full justify-between gap-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={cn("p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm", accentColor)}>
                <Icon className="w-4 h-4" />
              </div>
              {showPulse && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                </span>
              )}
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
    </m.div >
  )
}

export function BentoStatsRow() {
  const { t } = useTranslation('dashboard')
  const { user } = useAuth()

  const { data: tasks } = useTasks({
    statuses: ['open', 'todo', 'in_progress', 'pending'],
    assignedTo: user?.id,
    ignorePropertyFilter: true
  })

  const { events: upcomingEvents } = useEvents()
  const { data: dashboardStats } = useDashboardStats()

  const realTaskCount = tasks?.length || 0
  const highPriorityTaskCount = tasks?.filter(t => t.priority === 'high' || t.priority === 'urgent').length || 0
  const realMeetingCount = upcomingEvents?.length || 0

  const now = new Date()
  const nextMeeting = upcomingEvents
    ?.filter(e => new Date(e.start_date) > now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0]

  const totalTraining = (dashboardStats?.completedTraining || 0) + (dashboardStats?.inProgressTraining || 0)
  const realCompletionRate = totalTraining > 0
    ? Math.round((dashboardStats!.completedTraining / totalTraining) * 100)
    : 0

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <StatBentoCard
          icon={CheckCircle2}
          title={t("welcome_header.stats.tasks", "Tasks")}
          value={realTaskCount}
          trend={realTaskCount > 5 ? 'down' : 'up'}
          accentColor="text-blue-600"
          delay={0.2}
          showPulse={highPriorityTaskCount > 0}
          subtext={
            highPriorityTaskCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <AlertCircle className="w-3 h-3 animate-pulse" /> {highPriorityTaskCount} urgent
              </span>
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
              <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                <CalendarClock className="w-3 h-3" /> {format(new Date(nextMeeting.start_date), 'h:mm a')}
              </span>
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
              <span className="text-slate-400 text-[10px] font-semibold">
                {dashboardStats?.completedTraining || 0} / {totalTraining} {t("welcome_header.stats.done", "done")}
              </span>
            </div>
          }
        />
      </div>
    </LazyMotion>
  )
}
