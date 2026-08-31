import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityBadgeProps {
  priority?: MessagePriority | string
  showIcon?: boolean
  className?: string
}

export function PriorityBadge({ priority = 'medium', showIcon = true, className }: PriorityBadgeProps) {
  const { t } = useTranslation('messages')

  switch (priority) {
    case 'urgent':
      return (
        <Badge
          variant="destructive"
          className={cn(
            'gap-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-sm animate-pulse',
            className
          )}
        >
          {showIcon && <AlertCircle className="w-3 h-3" />}
          {t('priority_urgent', 'Urgent')}
        </Badge>
      )
    case 'high':
      return (
        <Badge
          className={cn(
            'gap-1 bg-amber-500 hover:bg-amber-600 text-white font-medium text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-sm',
            className
          )}
        >
          {showIcon && <AlertTriangle className="w-3 h-3" />}
          {t('priority_high', 'High')}
        </Badge>
      )
    case 'low':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1 text-slate-500 border-slate-300 dark:border-slate-700 text-[10px] px-2 py-0.5',
            className
          )}
        >
          {showIcon && <Clock className="w-3 h-3" />}
          {t('priority_low', 'Low')}
        </Badge>
      )
    case 'medium':
    default:
      return (
        <Badge
          variant="secondary"
          className={cn(
            'gap-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-[10px] px-2 py-0.5',
            className
          )}
        >
          {showIcon && <CheckCircle2 className="w-3 h-3" />}
          {t('priority_medium', 'Normal')}
        </Badge>
      )
  }
}
