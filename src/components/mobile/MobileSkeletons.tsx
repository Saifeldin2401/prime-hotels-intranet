import { Skeleton } from "@/components/ui/skeleton"

export function QuickActionSkeleton() {
    return (
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm flex flex-col gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    )
}

export function FeedItemSkeleton() {
    return (
        <div className="bg-white p-4 rounded-xl border border-border/50 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-12" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </div>
        </div>
    )
}

export function MobileHomeSkeleton() {
    return (
        <div className="space-y-6 pb-20">
            {/* Hero Skeleton */}
            <div className="flex items-center justify-between py-2">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
            </div>

            {/* Status Card Skeleton */}
            <Skeleton className="h-32 w-full rounded-xl" />

            {/* Quick Actions Skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-2 gap-3">
                    <QuickActionSkeleton />
                    <QuickActionSkeleton />
                    <QuickActionSkeleton />
                    <QuickActionSkeleton />
                </div>
            </div>

            {/* Up Next Skeleton */}
            <div className="space-y-3">
                <div className="flex justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-12" />
                </div>
                <FeedItemSkeleton />
                <FeedItemSkeleton />
            </div>
        </div>
    )
}
