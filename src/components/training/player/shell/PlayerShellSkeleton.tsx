import { Skeleton } from '@/components/ui/skeleton'

/**
 * Shell-shaped skeleton shown while the module loads. The frame (top bar / rail /
 * action bar) matches the real shell so there is no full-screen flash when data
 * arrives — only the content area swaps.
 */
export function PlayerShellSkeleton() {
    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 sm:h-16">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-2.5 w-28" />
                </div>
                <Skeleton className="h-9 w-16 rounded-md" />
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="hidden w-[320px] shrink-0 flex-col gap-2 border-e border-border/60 bg-hotel-navy-dark/5 p-4 lg:flex">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden p-6 lg:p-10">
                    <div className="mx-auto max-w-3xl space-y-5">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-56 w-full rounded-2xl" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>
                </div>
            </div>
            <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-t border-border/60 px-4 sm:px-6">
                <Skeleton className="h-11 w-28 rounded-xl" />
                <Skeleton className="h-11 w-40 rounded-xl" />
            </div>
        </div>
    )
}
