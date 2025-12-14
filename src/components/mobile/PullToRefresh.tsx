/**
 * PullToRefresh Component
 * 
 * Visual indicator for pull-to-refresh gesture.
 * Shows spinner and progress indicator during pull.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RefreshCw, ArrowDown } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

interface PullToRefreshProps {
    children: ReactNode
    onRefresh: () => Promise<void>
    enabled?: boolean
    className?: string
}

export function PullToRefresh({
    children,
    onRefresh,
    enabled = true,
    className
}: PullToRefreshProps) {
    const { isPulling, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
        onRefresh,
        enabled,
        threshold: 80
    })

    const showIndicator = isPulling || isRefreshing

    return (
        <div className={cn("relative", className)}>
            {/* Pull indicator */}
            <div
                className={cn(
                    "absolute left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none",
                    showIndicator ? "opacity-100" : "opacity-0"
                )}
                style={{
                    top: Math.max(pullDistance - 50, 0),
                    transform: `translateX(-50%) rotate(${pullProgress * 360}deg)`
                }}
            >
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full bg-hotel-navy shadow-lg border-2",
                    isRefreshing ? "border-hotel-gold" : "border-white/30"
                )}>
                    {isRefreshing ? (
                        <RefreshCw className="w-5 h-5 text-hotel-gold animate-spin" />
                    ) : (
                        <ArrowDown
                            className={cn(
                                "w-5 h-5 text-white transition-transform duration-200",
                                pullProgress >= 1 && "rotate-180"
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Pull progress bar */}
            {isPulling && !isRefreshing && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-hotel-navy/10 z-40">
                    <div
                        className="h-full bg-hotel-gold transition-all duration-100"
                        style={{ width: `${pullProgress * 100}%` }}
                    />
                </div>
            )}

            {/* Content */}
            <div
                style={{
                    transform: showIndicator ? `translateY(${pullDistance}px)` : 'none',
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    )
}
