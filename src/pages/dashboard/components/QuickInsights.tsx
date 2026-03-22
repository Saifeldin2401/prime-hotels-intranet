import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { cn } from '@/lib/utils'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle, Clock, GraduationCap, Minus, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const colorMap = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'text-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: 'text-blue-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'text-amber-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: 'text-purple-500' },
}

export function QuickInsights() {
  const { t } = useTranslation('dashboard')
  const {
    taskCompletion,
    trainingProgress,
    responseTime,
    attendanceRate,
    isLoading
  } = useDashboardMetrics()

  const insights = [
    {
      label: t('insights.attendance_rate', 'Attendance Rate'),
      value: `${attendanceRate.value}%`,
      change: attendanceRate.change,
      showTrend: attendanceRate.change !== null,
      positive: attendanceRate.positive,
      direction: attendanceRate.direction,
      icon: Users,
      theme: 'emerald' as const
    },
    {
      label: t('insights.task_completion', 'Task Completion'),
      value: `${taskCompletion.value}%`,
      change: taskCompletion.change,
      showTrend: taskCompletion.change !== null,
      positive: taskCompletion.positive,
      direction: taskCompletion.direction,
      icon: CheckCircle,
      theme: 'blue' as const
    },
    {
      label: t('insights.training_progress', 'Training Progress'),
      value: `${trainingProgress.value}%`,
      change: trainingProgress.change,
      showTrend: trainingProgress.change !== null,
      positive: trainingProgress.positive,
      direction: trainingProgress.direction,
      icon: GraduationCap,
      theme: 'amber' as const
    },
    {
      label: t('insights.response_time', 'Response Time'),
      value: `${responseTime.value}h`,
      change: responseTime.change,
      showTrend: responseTime.change !== null,
      positive: responseTime.positive,
      direction: responseTime.direction,
      icon: Clock,
      theme: 'purple' as const
    }
  ]

  if (isLoading) {
    const skeletonCards = ['s1', 's2', 's3', 's4']

    return (
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {skeletonCards.map((id) => (
          <Card key={id} className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5">
              <Skeleton className="h-10 w-24 mb-3" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          const TrendIcon = insight.direction === 'flat' ? Minus : insight.positive ? TrendingUp : TrendingDown
          const theme = colorMap[insight.theme]

          return (
            <m.div
              key={insight.label}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1, ease: 'easeOut', duration: 0.4 }}
            >
              <Card className="group relative overflow-hidden border border-slate-200 bg-white rounded-2xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-5 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {insight.label}
                    </span>
                    <div className={cn(
                      "p-2 rounded-xl transition-colors duration-300",
                      theme.bg, theme.text,
                      "group-hover:scale-110"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    <span className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-800 tracking-tight">{insight.value}</span>
                    {insight.showTrend && insight.change !== null && insight.change >= 1 && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full mb-1 border",
                        insight.positive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        <TrendIcon className="w-3 h-3" />
                        {insight.change}%
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Subtle gradient hover effect on light background */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            </m.div>
          )
        })}
      </div>
    </LazyMotion>
  )
}
