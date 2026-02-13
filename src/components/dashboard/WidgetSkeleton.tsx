import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface WidgetSkeletonProps {
    className?: string
    title?: boolean
    rows?: number
}

export function WidgetSkeleton({ className, title = true, rows = 3 }: WidgetSkeletonProps) {
    return (
        <Card className={cn("h-full", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                {title && <Skeleton className="h-4 w-[120px]" />}
                <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-[60px]" />
                            <Skeleton className="h-3 w-[60px]" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
