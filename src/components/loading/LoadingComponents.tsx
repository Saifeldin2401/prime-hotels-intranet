import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PageLoaderProps {
    message?: string
    className?: string
}

/**
 * Full-page centered loading spinner with optional message
 */
export function PageLoader({ message = 'Loading...', className }: PageLoaderProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center min-h-[400px] py-16",
            className
        )}>
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    )
}

interface InlineLoaderProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

/**
 * Small inline loading spinner for buttons, cells, etc
 */
export function InlineLoader({ size = 'md', className }: InlineLoaderProps) {
    const sizeClasses = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-6 w-6'
    }

    return (
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)} />
    )
}

interface ContentLoaderProps {
    isLoading: boolean
    children: React.ReactNode
    skeleton?: React.ReactNode
    className?: string
}

/**
 * Wrapper component that shows skeleton while loading, then content
 */
export function ContentLoader({ isLoading, children, skeleton, className }: ContentLoaderProps) {
    if (isLoading) {
        return <div className={className}>{skeleton || <PageLoader />}</div>
    }
    return <>{children}</>
}

interface StatsCardSkeletonProps {
    count?: number
    className?: string
}

/**
 * Skeleton for stat/metric cards
 */
export function StatsCardSkeleton({ count = 4, className }: StatsCardSkeletonProps) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                </div>
            ))}
        </div>
    )
}

interface FormSkeletonProps {
    fields?: number
    className?: string
}

/**
 * Skeleton for form layouts
 */
export function FormSkeleton({ fields = 4, className }: FormSkeletonProps) {
    return (
        <div className={cn("space-y-6", className)}>
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32" />
        </div>
    )
}

interface DetailSkeletonProps {
    className?: string
}

/**
 * Skeleton for detail/profile pages
 */
export function DetailSkeleton({ className }: DetailSkeletonProps) {
    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            {/* Content sections */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * Skeleton for page headers
 */
export function PageHeaderSkeleton() {
    return (
        <div className="space-y-2 mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
        </div>
    )
}
