import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Award, BarChart3, BookOpen, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Analytics {
  total: number
  published: number
  draft: number
  completed: number
  inProgress: number
  avgScore: number
}

interface ModuleAnalyticsCardProps {
  analytics: Analytics
}

export function ModuleAnalyticsCard({ analytics }: ModuleAnalyticsCardProps) {
  const { t, i18n } = useTranslation('training')
  const isRTL = i18n.dir() === 'rtl'

  const stats = [
    {
      label: t('hub.analytics.totalModules'),
      value: analytics.total,
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: t('hub.analytics.published'),
      value: analytics.published,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: t('hub.analytics.draft'),
      value: analytics.draft,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      label: t('hub.analytics.completed'),
      value: analytics.completed,
      icon: Award,
      color: 'text-purple-600 bg-purple-50'
    },
    {
      label: t('hub.analytics.inProgress'),
      value: analytics.inProgress,
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      label: t('hub.analytics.avgScore'),
      value: `${analytics.avgScore}%`,
      icon: BarChart3,
      color: 'text-indigo-600 bg-indigo-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <CardHeader className={cn("pb-3", isRTL ? "text-right" : "text-left")}>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                <div className={cn("p-3 rounded-lg", stat.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-hotel-navy">{stat.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

