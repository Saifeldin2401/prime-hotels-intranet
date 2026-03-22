import { RejectionDialog } from '@/components/approvals/RejectionDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useApprovalStats, usePendingApprovals } from '@/hooks/useApprovalStats'
import { useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveRequests'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from "react-i18next"
import { Link } from 'react-router-dom'

interface PendingApprovalsWidgetProps {
    className?: string
    maxItems?: number
}

const leaveTypeLabels: Record<string, string> = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
    unpaid: 'Unpaid Leave',
    emergency: 'Emergency Leave',
    bereavement: 'Bereavement Leave'
}

export function PendingApprovalsWidget({ className, maxItems = 3 }: PendingApprovalsWidgetProps) {
    const { t } = useTranslation('approvals')
    const { data: stats } = useApprovalStats()
    const { data: pendingItems, isLoading } = usePendingApprovals()
    const approveMutation = useApproveLeaveRequest()
    const rejectMutation = useRejectLeaveRequest()
    const [rejectionId, setRejectionId] = useState<string | null>(null)

    const displayItems = pendingItems?.slice(0, maxItems) || []
    const hasMore = (pendingItems?.length || 0) > maxItems

    if (isLoading) {
        return (
            <Card className={cn('', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Pending Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!displayItems.length) {
        return (
            <Card className={cn('', className)}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Pending Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                        <p className="text-sm">All caught up!</p>
                        <p className="text-xs">No pending approvals</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <TooltipProvider>
        <Card className={cn('', className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Pending Approvals
                        {stats?.total_pending && stats.total_pending > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {stats.total_pending}
                            </Badge>
                        )}
                    </CardTitle>
                    {stats?.oldest_pending_days && stats.oldest_pending_days > 2 && (
                        <Badge variant="destructive" className="text-xs">
                            {stats.oldest_pending_days}d oldest
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {displayItems.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={item.requester?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                                {item.requester?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                    {item.requester?.full_name || 'Unknown'}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                    {leaveTypeLabels[item.type] || item.type}
                                </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => approveMutation.mutate({ requestId: item.id })}
                                        disabled={approveMutation.isPending}
                                        aria-label={t('approve')}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {t('approve')}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setRejectionId(item.id)}
                                        disabled={rejectMutation.isPending}
                                        aria-label={t('reject')}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {t('reject')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <Link to="/approvals">
                        <Button variant="ghost" className="w-full gap-2">
                            View All Approvals
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                )}
            </CardContent>

            <RejectionDialog
                open={!!rejectionId}
                onOpenChange={(open) => !open && setRejectionId(null)}
                onConfirm={(reason) => {
                    if (rejectionId) {
                        rejectMutation.mutate({ requestId: rejectionId, reason }, {
                            onSuccess: () => setRejectionId(null)
                        })
                    }
                }}
                isPending={rejectMutation.isPending}
                title={t('reject_dialog_title_leave', 'Reject Leave Request')}
                description={t('reject_dialog_desc_leave', 'Please provide a reason for rejecting this request.')}
            />
        </Card>
        </TooltipProvider>
    )
}

export default PendingApprovalsWidget
