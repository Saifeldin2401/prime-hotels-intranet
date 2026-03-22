import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ChartViewportProps {
    children: ReactNode
    className?: string
    minHeight?: number
}

export function ChartViewport({ children, className, minHeight = 240 }: ChartViewportProps) {
    return (
        <div
            className={cn('w-full min-w-0', className)}
            style={{ minHeight }}
        >
            {children}
        </div>
    )
}
