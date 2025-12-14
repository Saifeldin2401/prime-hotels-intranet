import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ResponsiveTableProps {
    children: React.ReactNode
    className?: string
}

/**
 * Responsive table wrapper with horizontal scroll on mobile
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
    return (
        <div className={cn(
            "w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
            className
        )}>
            <div className="min-w-[600px] sm:min-w-0">
                {children}
            </div>
        </div>
    )
}

/**
 * Card-based data display for mobile (alternative to tables)
 */
interface DataCardProps {
    title: string
    subtitle?: string
    status?: React.ReactNode
    children: React.ReactNode
    actions?: React.ReactNode
    className?: string
    onClick?: () => void
    expandable?: boolean
}

export function DataCard({
    title,
    subtitle,
    status,
    children,
    actions,
    className,
    onClick,
    expandable = false
}: DataCardProps) {
    const [expanded, setExpanded] = React.useState(false)

    const handleClick = () => {
        if (expandable) {
            setExpanded(!expanded)
        }
        onClick?.()
    }

    return (
        <div
            className={cn(
                "bg-white border rounded-lg p-4 space-y-3",
                (onClick || expandable) && "cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors",
                className
            )}
            onClick={handleClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {status}
                    {expandable && (
                        expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Content - hidden on collapse if expandable */}
            {(!expandable || expanded) && (
                <>
                    <div className="text-sm">
                        {children}
                    </div>

                    {/* Actions */}
                    {actions && (
                        <div className="flex items-center gap-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
                            {actions}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/**
 * Data field row for DataCard
 */
interface DataFieldProps {
    label: string
    value: React.ReactNode
    className?: string
}

export function DataField({ label, value, className }: DataFieldProps) {
    return (
        <div className={cn("flex justify-between items-center py-1", className)}>
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium text-right">{value}</span>
        </div>
    )
}

/**
 * Stack layout that switches from horizontal to vertical on mobile
 */
interface ResponsiveStackProps {
    children: React.ReactNode
    breakpoint?: 'sm' | 'md' | 'lg'
    gap?: number
    className?: string
}

export function ResponsiveStack({
    children,
    breakpoint = 'sm',
    gap = 4,
    className
}: ResponsiveStackProps) {
    const breakpoints = {
        sm: 'sm:flex-row',
        md: 'md:flex-row',
        lg: 'lg:flex-row'
    }

    return (
        <div className={cn(
            "flex flex-col",
            breakpoints[breakpoint],
            `gap-${gap}`,
            className
        )}>
            {children}
        </div>
    )
}

/**
 * Hidden on mobile utility
 */
export function HideOnMobile({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("hidden sm:block", className)}>{children}</div>
}

/**
 * Show only on mobile utility
 */
export function ShowOnMobile({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("sm:hidden", className)}>{children}</div>
}

/**
 * Touch-friendly button sizing utility
 */
export function TouchTarget({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("min-h-[44px] min-w-[44px] flex items-center justify-center", className)}>
            {children}
        </div>
    )
}
