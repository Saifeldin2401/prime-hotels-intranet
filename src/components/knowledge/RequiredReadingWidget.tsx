/**
 * RequiredReadingWidget
 * 
 * Dashboard widget showing pending required reading for the current user.
 * Displays count, due dates, and quick links to articles.
 */

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    BookOpen,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowRight,
    FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRequiredReading } from '@/hooks/useKnowledge'
import type { RequiredReading } from '@/types/knowledge'

interface RequiredReadingWidgetProps {
    /** Maximum items to show */
    limit?: number
    /** Show compact version */
    compact?: boolean
    /** Custom class name */
    className?: string
}

export function RequiredReadingWidget({
    limit = 5,
    compact = false,
    className
}: RequiredReadingWidgetProps) {
    const { data: requiredReading, isLoading } = useRequiredReading()

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardContent>
            </Card>
        )
    }

    if (!requiredReading || requiredReading.length === 0) {
        return (
            <Card className={cn("bg-green-50 border-green-200", className)}>
                <CardContent className="py-6 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    <p className="text-sm font-medium text-green-800">All caught up!</p>
                    <p className="text-xs text-green-600">No pending required reading.</p>
                </CardContent>
            </Card>
        )
    }

    const pending = requiredReading.filter(r => !r.is_acknowledged)
    const completed = requiredReading.filter(r => r.is_acknowledged)
    const overdueCount = pending.filter(r =>
        r.due_date && new Date(r.due_date) < new Date()
    ).length
    const completionRate = (completed.length / requiredReading.length) * 100

    // Compact version for sidebar or small spaces
    if (compact) {
        return (
            <Link to="/knowledge/required" className={cn("block", className)}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-orange-700" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-orange-900">Required Reading</p>
                            <p className="text-xs text-orange-700">{pending.length} pending</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-orange-500" />
                </div>
            </Link>
        )
    }

    return (
        <Card className={cn(pending.length > 0 && "border-orange-200", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-hotel-gold" />
                        Required Reading
                    </CardTitle>
                    {overdueCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {overdueCount} overdue
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Completion</span>
                        <span className="font-medium">{completed.length}/{requiredReading.length}</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                </div>

                {/* Pending Items */}
                {pending.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
                        {pending.slice(0, limit).map(item => (
                            <ReadingItem key={item.document_id} item={item} />
                        ))}
                    </div>
                )}

                {/* View All Link */}
                {requiredReading.length > limit && (
                    <Link
                        to="/knowledge/required"
                        className="text-sm text-hotel-gold hover:underline flex items-center gap-1"
                    >
                        View all {requiredReading.length} items
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                )}
            </CardContent>
        </Card>
    )
}

function ReadingItem({ item }: { item: RequiredReading }) {
    const isOverdue = item.due_date && new Date(item.due_date) < new Date()
    const isDueSoon = item.due_date &&
        new Date(item.due_date) > new Date() &&
        new Date(item.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    return (
        <Link
            to={`/knowledge/${item.document_id}`}
            className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                isOverdue ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
            )}
        >
            <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                isOverdue ? "bg-red-200" : "bg-gray-100"
            )}>
                <FileText className={cn(
                    "h-4 w-4",
                    isOverdue ? "text-red-700" : "text-gray-600"
                )} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium truncate",
                    isOverdue ? "text-red-900" : "text-gray-900"
                )}>
                    {item.title}
                </p>
                {item.due_date && (
                    <p className={cn(
                        "text-xs flex items-center gap-1",
                        isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-gray-500"
                    )}>
                        {isOverdue ? (
                            <AlertCircle className="h-3 w-3" />
                        ) : (
                            <Clock className="h-3 w-3" />
                        )}
                        {isOverdue ? 'Overdue' : `Due ${new Date(item.due_date).toLocaleDateString()}`}
                    </p>
                )}
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </Link>
    )
}

export default RequiredReadingWidget
