import { LazyMotion, domAnimation, m } from 'framer-motion'
import { Users, CheckCircle, GraduationCap, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useTranslation } from 'react-i18next'

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
      color: 'emerald'
    },
    {
      label: t('insights.task_completion', 'Task Completion'),
      value: `${taskCompletion.value}%`,
      change: taskCompletion.change,
      showTrend: taskCompletion.change !== null,
      positive: taskCompletion.positive,
      direction: taskCompletion.direction,
      icon: CheckCircle,
      color: 'blue'
    },
    {
      label: t('insights.training_progress', 'Training Progress'),
      value: `${trainingProgress.value}%`,
      change: trainingProgress.change,
      showTrend: trainingProgress.change !== null,
      positive: trainingProgress.positive,
      direction: trainingProgress.direction,
      icon: GraduationCap,
      color: 'amber'
    },
    {
      label: t('insights.response_time', 'Response Time'),
      value: `${responseTime.value}h`,
      change: responseTime.change,
      showTrend: responseTime.change !== null,
      positive: responseTime.positive,
      direction: responseTime.direction,
      icon: Clock,
      color: 'purple'
    }
  ]

  if (isLoading) {
    const skeletonCards = ['s1', 's2', 's3', 's4']

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {skeletonCards.map((id) => (
          <Card key={id} className="border-0 shadow-md">
            <CardContent className="p-4">
              <Skeleton className="h-12 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, index) => {
        const Icon = insight.icon
        const TrendIcon = insight.direction === 'flat' ? Minus : insight.positive ? TrendingUp : TrendingDown

        return (
          <m.div
            key={insight.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-white/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {insight.label}
                  </span>
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    `bg-${insight.color}-100 text-${insight.color}-600`
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{insight.value}</span>
                  {insight.showTrend && insight.change !== null && insight.change >= 1 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium mb-1",
                      insight.positive ? "text-emerald-600" : "text-red-600"
                    )}>
                      <TrendIcon className="w-3 h-3" />
                      {insight.change}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </m.div>
        )
      })}
    </div>
    </LazyMotion>
  )
}
