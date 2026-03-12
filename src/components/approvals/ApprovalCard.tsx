import { format, isValid } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Calendar,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    Wrench,
    Eye,
    Inbox,
    Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export type ApprovalType = 'document' | 'leave' | 'maintenance' | 'request' | 'expense'

export interface ApprovalCardProps {
    id: string
    type: ApprovalType
    title: string
    description?: string
    requester?: string
    requesterAvatar?: string // Added
    createdAt: string
    status: string
    entityMatches?: {
        property?: string
        department?: string
        room?: string
    }
    priority?: 'low' | 'medium' | 'high' | 'critical' | 'urgent'
    onApprove?: () => void
    onReject?: () => void
    onView?: () => void
    isActionPending?: boolean
}

export function ApprovalCard({
    type,
    title,
    description,
    requester,
    requesterAvatar,
    createdAt,
    entityMatches,
    priority,
    onApprove,
    onReject,
    onView,
    isActionPending
}: ApprovalCardProps) {
    const { t } = useTranslation('approvals')

    const getTypeConfig = (type: ApprovalType) => {
        switch (type) {
            case 'leave':
                return { icon: <Calendar className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200', label: t('leaves_tab') }
            case 'maintenance':
                return { icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-orange-50 text-orange-700 border-orange-200', label: t('maintenance_tab') }
            case 'document':
                return { icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: t('documents_tab') }
            case 'request':
                return { icon: <Inbox className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: t('unified_tab', 'Request') }
            case 'expense':
                return { icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200', label: t('expenses_tab', 'Expenses') }
            default:
                return { icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-800 border-gray-200', label: t('request') }
        }
    }

    const typeConfig = getTypeConfig(type)
    const createdDate = createdAt ? new Date(createdAt) : null
    const createdLabel = createdDate && isValid(createdDate)
        ? format(createdDate, 'MMM d, h:mm a')
        : t('unknown_date', 'Unknown date')

    return (
        <Card className="group hover:shadow-lg transition-all duration-300 border-muted/60 overflow-hidden flex flex-col h-full">
            <CardHeader className="p-4 pb-3 space-y-3">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className={cn("gap-1.5 py-1 px-2.5 font-medium rounded-full", typeConfig.color)}>
                        {typeConfig.icon}
                        <span className="text-[11px] uppercase tracking-wide">{typeConfig.label}</span>
                    </Badge>

                    {priority && (
                        <Badge variant="outline" className={cn(
                            "uppercase text-[10px] tracking-wider font-bold border-0",
                            priority === 'critical' || priority === 'urgent' ? 'text-red-600 bg-red-50' :
                                priority === 'high' ? 'text-orange-600 bg-orange-50' :
                                    'text-gray-500 bg-gray-50'
                        )}>
                            {priority}
                        </Badge>
                    )}
                </div>

                <div className="space-y-1">
                    <CardTitle className="text-base font-bold leading-tight line-clamp-2 min-h-[1.5rem] group-hover:text-primary transition-colors">
                        {title}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {createdLabel}
                        </span>
                        {entityMatches?.property && (
                            <>
                                <span className="text-gray-300">•</span>
                                <span className="truncate max-w-[120px]" title={entityMatches.property}>
                                    {entityMatches.property}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 flex-grow">
                {description && (
                    <div className="text-sm text-gray-600 bg-muted/30 p-3 rounded-md mb-4 border border-border/50">
                        <p className="line-clamp-2 md:line-clamp-3 min-h-[2.5rem] text-[13px] leading-relaxed">
                            {description}
                        </p>
                    </div>
                )}

                {requester && (
                    <div className="flex items-center gap-3 mt-auto">
                        <Avatar className="w-8 h-8 border">
                            <AvatarImage src={requesterAvatar} />
                            <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                                {requester.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-900">{requester}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                                {entityMatches?.department || 'Requester'}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-3 bg-gray-50/50 border-t flex justify-end gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onView}
                    className="h-8 text-xs font-medium hover:bg-white hover:shadow-sm"
                >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    {t('view_details', 'Details')}
                </Button>

                {(onApprove || onReject) && (
                    <div className="flex items-center ml-auto gap-2">
                        {onReject && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReject}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-full"
                                disabled={isActionPending}
                                title={t('reject')}
                                aria-busy={isActionPending}
                            >
                                {isActionPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                        {onApprove && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onApprove}
                                className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm rounded-full"
                                disabled={isActionPending}
                                aria-busy={isActionPending}
                            >
                                {isActionPending ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                {t('approve')}
                            </Button>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}
