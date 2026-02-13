import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
