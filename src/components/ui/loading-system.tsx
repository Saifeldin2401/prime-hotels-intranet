import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'

/**
 * ==========================================
 * BASE SPINNERS
 * ==========================================
 */

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    variant?: 'primary' | 'gold' | 'white' | 'muted'
}

export function TableSkeleton({ rows = 5, cols = 4, className }: { rows?: number, cols?: number, className?: string }) {
    return (
        <div className={cn("w-full border border-border/50 rounded-xl overflow-hidden bg-card", className)}>
            <div className="bg-muted/30 p-4 border-b border-border/50 flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className={cn("h-4", i === 0 ? "w-32" : "flex-1")} />
                ))}
            </div>
            <div className="divide-y divide-border/30">
                {Array.from({ length: rows }).map((_, ri) => (
                    <div key={ri} className="p-4 flex gap-4 items-center">
                        {Array.from({ length: cols }).map((_, ci) => (
                            <Skeleton
                                key={ci}
                                className={cn(
                                    "h-4",
                                    ci === 0 ? "w-40" : ci === cols - 1 ? "w-16 ms-auto" : "flex-1"
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

/**
 * ==========================================
 * TRANSITION WRAPPERS
 * ==========================================
 */

interface LoadingTransitionProps {
    isLoading: boolean
    children: React.ReactNode
    skeleton: React.ReactNode
    className?: string
}

export function LoadingTransition({
    isLoading,
    children,
    skeleton,
    className
}: LoadingTransitionProps) {
    return (
        <div className={cn("relative", className)}>
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        {skeleton}
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
