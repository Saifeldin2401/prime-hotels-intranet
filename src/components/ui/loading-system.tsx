import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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

export function LoadingSpinner({
    size = 'md',
    className,
    variant = 'primary'
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-10 w-10',
        xl: 'h-16 w-16'
    }

    const variantClasses = {
        primary: 'text-primary',
        gold: 'text-hotel-gold',
        white: 'text-white',
        muted: 'text-muted-foreground'
    }

    return (
        <Loader2
            className={cn(
                'animate-spin',
                sizeClasses[size],
                variantClasses[variant],
                className
            )}
        />
    )
}

/**
 * ==========================================
 * SEMANTIC SKELETONS
 * ==========================================
 */

export function StatSkeleton({ count = 1, className }: { count?: number, className?: string }) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-5 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-3 w-full opacity-60" />
                </div>
            ))}
        </div>
    )
}

export function CardSkeleton({ count = 1, className }: { count?: number, className?: string }) {
    return (
        <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
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
                                    ci === 0 ? "w-40" : ci === cols - 1 ? "w-16 ml-auto" : "flex-1"
                                )}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ListSkeleton({ items = 3, className }: { items?: number, className?: string }) {
    return (
        <div className={cn("space-y-3", className)}>
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border/50 rounded-lg shadow-sm">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2 opacity-60" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-md" />
                </div>
            ))}
        </div>
    )
}

export function FormSkeleton({ fields = 4, className }: { fields?: number, className?: string }) {
    return (
        <div className={cn("space-y-6", className)}>
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-32" />
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
