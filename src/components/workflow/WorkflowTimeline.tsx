import * as React from 'react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    User,
    ArrowRight,
    Calendar,
    type LucideIcon
} from 'lucide-react'

interface TimelineEvent {
    id: string
    type: 'created' | 'updated' | 'approved' | 'rejected' | 'pending' | 'completed' | 'cancelled' | 'comment' | 'custom'
    title: string
    description?: string
    user?: {
        name: string
        avatar?: string
    }
    timestamp: Date | string
    metadata?: Record<string, any>
    icon?: LucideIcon
}

interface WorkflowTimelineProps {
    events: TimelineEvent[]
    className?: string
    showRelativeTime?: boolean
    compact?: boolean
}

const eventConfig: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
    created: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    updated: { icon: ArrowRight, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    approved: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    rejected: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
    pending: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    completed: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    cancelled: { icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    comment: { icon: User, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    custom: { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' }
}

export function WorkflowTimeline({
    events,
    className,
    showRelativeTime = true,
    compact = false
}: WorkflowTimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
            </div>
        )
    }

    return (
        <div className={cn("relative", className)}>
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />

            <ul className="space-y-4">
                {events.map((event, index) => {
                    const config = eventConfig[event.type] || eventConfig.custom
                    const Icon = event.icon || config.icon
                    const timestamp = typeof event.timestamp === 'string'
                        ? new Date(event.timestamp)
                        : event.timestamp

                    return (
                        <li key={event.id} className="relative flex gap-4">
                            {/* Icon */}
                            <div className={cn(
                                "relative z-10 flex items-center justify-center rounded-full",
                                compact ? "w-6 h-6" : "w-8 h-8",
                                config.bgColor
                            )}>
                                <Icon className={cn(
                                    config.color,
                                    compact ? "h-3 w-3" : "h-4 w-4"
                                )} />
                            </div>

                            {/* Content */}
                            <div className={cn(
                                "flex-1 min-w-0",
                                compact ? "pb-2" : "pb-4"
                            )}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className={cn(
                                            "font-medium text-gray-900",
                                            compact ? "text-sm" : "text-base"
                                        )}>
                                            {event.title}
                                        </p>
                                        {event.description && (
                                            <p className={cn(
                                                "text-gray-600 mt-0.5",
                                                compact ? "text-xs" : "text-sm"
                                            )}>
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                    <time
                                        className={cn(
                                            "text-gray-500 flex-shrink-0",
                                            compact ? "text-xs" : "text-sm"
                                        )}
                                        dateTime={timestamp.toISOString()}
                                        title={format(timestamp, 'PPpp')}
                                    >
                                        {showRelativeTime
                                            ? formatDistanceToNow(timestamp, { addSuffix: true })
                                            : format(timestamp, 'MMM d, yyyy h:mm a')
                                        }
                                    </time>
                                </div>

                                {/* User info */}
                                {event.user && (
                                    <div className="flex items-center gap-2 mt-2">
                                        {event.user.avatar ? (
                                            <img
                                                src={event.user.avatar}
                                                alt=""
                                                className="w-5 h-5 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="w-3 h-3 text-gray-500" />
                                            </div>
                                        )}
                                        <span className="text-xs text-gray-500">
                                            {event.user.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

// Simple status badge for current workflow state
interface WorkflowStatusBadgeProps {
    status: 'pending' | 'approved' | 'rejected' | 'in_review' | 'completed' | 'cancelled'
    className?: string
}

const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    in_review: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
}

export function WorkflowStatusBadge({ status, className }: WorkflowStatusBadgeProps) {
    const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            statusStyles[status] || statusStyles.pending,
            className
        )}>
            {displayStatus}
        </span>
    )
}

// Card wrapper for workflow history section
interface WorkflowHistoryCardProps {
    title?: string
    events: TimelineEvent[]
    currentStatus?: WorkflowStatusBadgeProps['status']
    className?: string
}

export function WorkflowHistoryCard({
    title = 'Activity History',
    events,
    currentStatus,
    className
}: WorkflowHistoryCardProps) {
    return (
        <div className={cn("bg-white rounded-lg border p-4", className)}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {currentStatus && <WorkflowStatusBadge status={currentStatus} />}
            </div>
            <WorkflowTimeline events={events} compact />
        </div>
    )
}
