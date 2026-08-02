import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

export function PriorityTimelineWidget() {
  const { t, i18n } = useTranslation('dashboard')
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  
  const { notifications, isLoading } = useNotifications()

  // Process notifications into timeline events (taking up to 5)
  const events = useMemo(() => {
    return notifications.slice(0, 5).map(n => {
      // Determine color based on notification type
      let colorClass = 'bg-blue-500'
      if (n.type === 'escalation_alert' || n.type === 'request_rejected') {
        colorClass = 'bg-rose-500'
      } else if (n.type === 'task_assigned' || n.type === 'maintenance_assigned' || n.type === 'approval_required') {
        colorClass = 'bg-amber-500'
      } else if (n.type === 'request_approved' || n.type === 'maintenance_resolved' || n.type === 'training_assigned') {
        colorClass = 'bg-emerald-500'
      }

      return {
        id: n.id,
        title: n.title,
        desc: n.message,
        time: formatDistanceToNow(new Date(n.created_at), {
          addSuffix: true,
          locale: isRTL ? ar : undefined
        }),
        color: colorClass
      }
    })
  }, [notifications, isRTL])

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-md rounded-[24px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 px-6 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase flex items-center gap-2 font-sans">
          <Activity className="w-4 h-4 text-blue-500" />
          {t('widgets.priority_timeline', 'Priority Timeline')}
        </CardTitle>
        <button
          onClick={() => navigate('/notifications')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <span>{t('actions.view_all', 'View All')}</span>
          <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
        </button>
      </CardHeader>

      <CardContent className="p-6 flex-1 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : events.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-500">
             <Activity className="w-8 h-8 text-slate-300 mb-2" />
             <p className="text-sm">{t('timeline.no_recent_events', 'No recent events')}</p>
           </div>
        ) : (
          <div className="relative ps-6 space-y-6 before:absolute before:start-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {events.map((evt) => (
              <div key={evt.id} className="relative flex items-start justify-between gap-4 group">
                {/* Colored Dot */}
                <div className={`absolute -start-6 top-1 w-3 h-3 rounded-full ${evt.color} ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition-transform`} />

                <div className="space-y-0.5 text-start">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                    {evt.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {evt.desc}
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                  {evt.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default PriorityTimelineWidget
