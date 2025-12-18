import { formatDistanceToNow } from 'date-fns'
import { Clock, ArrowRight, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useStatusHistory, type StatusHistoryEntry } from '@/hooks/useStatusHistory'
import { cn } from '@/lib/utils'

interface StatusHistoryTimelineProps {
    entityType: string
    entityId: string
    className?: string
}

const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    pending: 'bg-orange-100 text-orange-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    draft: 'bg-slate-100 text-slate-800',
    closed: 'bg-purple-100 text-purple-800',
    on_hold: 'bg-amber-100 text-amber-800',
    filled: 'bg-teal-100 text-teal-800',
}

function getStatusColor(status: string | null): string {
    if (!status) return 'bg-gray-100 text-gray-800'
    return statusColors[status] || 'bg-gray-100 text-gray-800'
}

function formatStatus(status: string | null): string {
    if (!status) return 'None'
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function StatusHistoryTimeline({ entityType, entityId, className }: StatusHistoryTimelineProps) {
    const { data: history, isLoading, error } = useStatusHistory(entityType, entityId)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-4 text-sm text-red-500">
                Failed to load status history
            </div>
        )
    }

    if (!history || history.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No status changes recorded yet</p>
            </div>
        )
    }

    return (
        <div className={cn('space-y-4', className)}>
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Status History
            </h4>
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline entries */}
                <div className="space-y-4">
                    {history.map((entry, index) => (
                        <StatusHistoryItem
                            key={entry.id}
                            entry={entry}
                            isFirst={index === 0}
                            isLast={index === history.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

interface StatusHistoryItemProps {
    entry: StatusHistoryEntry
    isFirst: boolean
    isLast: boolean
}

function StatusHistoryItem({ entry, isFirst }: StatusHistoryItemProps) {
    const profile = entry.changed_by_profile

    return (
        <div className="relative pl-10">
            {/* Timeline dot */}
            <div className={cn(
                'absolute left-2.5 w-3 h-3 rounded-full border-2 border-background',
                isFirst ? 'bg-primary' : 'bg-muted'
            )} />

            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                {/* Status change */}
                <div className="flex items-center gap-2 flex-wrap">
                    {entry.old_status && (
                        <>
                            <Badge variant="outline" className={getStatusColor(entry.old_status)}>
                                {formatStatus(entry.old_status)}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </>
                    )}
                    <Badge variant="outline" className={getStatusColor(entry.new_status)}>
                        {formatStatus(entry.new_status)}
                    </Badge>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {profile ? (
                        <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                    {profile.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span>{profile.full_name || 'Unknown'}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>System</span>
                        </div>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}</span>
                </div>

                {/* Reason if provided */}
                {entry.reason && (
                    <p className="text-xs text-muted-foreground italic">
                        "{entry.reason}"
                    </p>
                )}
            </div>
        </div>
    )
}

export default StatusHistoryTimeline
