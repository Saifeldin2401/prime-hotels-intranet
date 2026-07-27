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
import { Calendar, CheckCircle2, TrendingUp, AlertCircle, CalendarClock, TrendingDown, Sparkles } from 'lucide-react'

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
  const isUp = trend === 'up'
  const isDown = trend === 'down'

  // Get color values for sparklines based on color text
  const sparklineColor = accentColor.includes('amber') || accentColor.includes('emerald')
    ? '#10b981' // emerald/green
    : accentColor.includes('blue')
      ? '#3b82f6' // blue
      : '#6366f1' // indigo

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-[20px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-6 transition-all duration-300 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 flex-1 cursor-default"
    >
      {/* Background neon glow on card hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-500/5 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Sparkline background graphic */}
      <div className="absolute bottom-0 end-0 p-2 opacity-25 group-hover:opacity-40 transition-opacity duration-300 z-0 scale-110 pointer-events-none">
        <Sparkline
          data={[25, 40, 30, 55, 38, 62, 45, 70]}
          color={sparklineColor}
          width={100}
          height={38}
        />
      </div>

      <div className="relative flex flex-col h-full justify-between gap-4 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className={cn(
                "p-2 rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-105",
                accentColor.includes('blue') 
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40" 
                  : accentColor.includes('emerald')
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40"
                    : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              {showPulse && (
                <span className="absolute -top-1 -end-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white dark:border-slate-900"></span>
                </span>
              )}
            </div>
            <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] tracking-wider uppercase">{title}</span>
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all",
              isUp 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40" 
                : isDown 
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700"
            )}>
              <span className="me-1">{isUp ? '+' : isDown ? '-' : ''}</span>
              {isUp ? <TrendingUp className="w-3 h-3 me-0.5" /> : isDown ? <TrendingDown className="w-3 h-3 me-0.5" /> : null}
              {isUp ? 'Active' : isDown ? 'Attention' : 'Normal'}
            </div>
          )}
        </div>

        <div>
          <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
            {value}
          </div>
          {subtext && (
            <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
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
          delay={0.1}
          showPulse={highPriorityTaskCount > 0}
          subtext={
            highPriorityTaskCount > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full w-fit border border-rose-100 dark:border-rose-900/40">
                <AlertCircle className="w-3.5 h-3.5 animate-pulse text-rose-500" /> 
                {highPriorityTaskCount} {t("welcome_header.action_center.urgent", "urgent")}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                {t("welcome_header.stats.all_caught_up", "All caught up")}
              </span>
            )
          }
        />
        
        <StatBentoCard
          icon={Calendar}
          title={t("welcome_header.stats.agenda", "Agenda")}
          value={realMeetingCount}
          accentColor="text-indigo-600"
          delay={0.2}
          subtext={
            nextMeeting ? (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full w-fit border border-indigo-100 dark:border-indigo-900/40">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-500" /> 
                {format(new Date(nextMeeting.start_date), 'h:mm a')}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                {t("welcome_header.stats.schedule_clear", "Schedule clear")}
              </span>
            )
          }
        />

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="group relative overflow-hidden rounded-[20px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-6 transition-all duration-300 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 flex-1 cursor-default"
        >
          {/* Sparkline background graphic */}
          <div className="absolute bottom-0 end-0 p-2 opacity-25 group-hover:opacity-40 transition-opacity duration-300 z-0 scale-110 pointer-events-none">
            <Sparkline
              data={[10, 20, 15, 35, 45, 60, 75, 90]}
              color="#10b981"
              width={100}
              height={38}
            />
          </div>

          <div className="relative flex flex-col h-full justify-between gap-4 z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                  {t("welcome_header.stats.training", "Training")}
                </span>
              </div>
              <div className="flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40">
                {realCompletionRate}%
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                {realCompletionRate}%
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <Progress value={realCompletionRate} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
                  {dashboardStats?.completedTraining || 0} / {totalTraining} {t("welcome_header.stats.done", "done")}
                </span>
              </div>
            </div>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  )
}
export default BentoStatsRow
