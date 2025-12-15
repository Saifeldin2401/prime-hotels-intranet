import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock } from 'lucide-react'
import { useOverdueItemsCount } from '@/hooks/useEscalation'
import { cn } from '@/lib/utils'

interface OverdueBadgeProps {
    type?: 'tasks' | 'maintenance' | 'leave' | 'total'
    showIcon?: boolean
    className?: string
}

export function OverdueBadge({ type = 'total', showIcon = true, className }: OverdueBadgeProps) {
    const { data: counts, isLoading } = useOverdueItemsCount()

    if (isLoading || !counts) return null

    const count = type === 'total' ? counts.total : counts[type]

    if (count === 0) return null

    const urgency = count >= 5 ? 'critical' : count >= 3 ? 'high' : 'medium'

    return (
        <Badge
            className={cn(
                'ml-2 px-2 py-0.5 text-xs font-medium',
                urgency === 'critical' && 'bg-red-600 text-white animate-pulse',
                urgency === 'high' && 'bg-orange-500 text-white',
                urgency === 'medium' && 'bg-yellow-500 text-white',
                className
            )}
        >
            {showIcon && (
                <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {count} overdue
        </Badge>
    )
}

interface OverdueIndicatorProps {
    createdAt: string
    thresholdHours?: number
    className?: string
}

export function OverdueIndicator({ createdAt, thresholdHours = 48, className }: OverdueIndicatorProps) {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursPending = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))

    if (hoursPending < thresholdHours) return null

    const severity = hoursPending >= thresholdHours * 2 ? 'critical' : 'warning'

    return (
        <div
            className={cn(
                'flex items-center gap-1 text-xs font-medium',
                severity === 'critical' ? 'text-red-600' : 'text-orange-500',
                className
            )}
        >
            <Clock className="h-3 w-3" />
            <span>
                {hoursPending}h overdue
            </span>
        </div>
    )
}

interface EscalationAlertProps {
    entityType: string
    hoursPending: number
    className?: string
}

export function EscalationAlert({ entityType, hoursPending, className }: EscalationAlertProps) {
    const thresholds: Record<string, number> = {
        task: 24,
        maintenance_ticket: 48,
        leave_request: 48,
        document: 72
    }

    const threshold = thresholds[entityType] || 48
    const percentOverdue = hoursPending / threshold * 100

    if (percentOverdue < 75) return null

    const status = percentOverdue >= 100 ? 'escalated' : 'warning'

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                status === 'escalated'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800',
                className
            )}
        >
            <AlertTriangle className={cn(
                'h-4 w-4',
                status === 'escalated' ? 'text-red-600' : 'text-yellow-600'
            )} />
            <span>
                {status === 'escalated'
                    ? `This ${entityType.replace('_', ' ')} has been escalated after ${threshold}h`
                    : `Will escalate in ${Math.round(threshold - hoursPending)}h if not addressed`
                }
            </span>
        </div>
    )
}
