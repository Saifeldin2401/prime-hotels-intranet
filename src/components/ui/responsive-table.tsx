import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

/**
 * ResponsiveTable wrapper component for mobile-friendly tables.
 * Enables horizontal scrolling on small screens while maintaining usability.
 */
export function ResponsiveTable({ className, children, ...props }: ResponsiveTableProps) {
    return (
        <div
            className={cn(
                "w-full overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0",
                "scrollbar-hide",
                className
            )}
            {...props}
        >
            <div className="min-w-[640px] sm:min-w-0">
                {children}
            </div>
        </div>
    )
}

interface ResponsiveTableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    minWidth?: string
}

/**
 * ResponsiveTableContainer for tables that need a specific minimum width.
 * Useful for data tables with many columns.
 */
export function ResponsiveTableContainer({
    className,
    children,
    minWidth = "800px",
    ...props
}: ResponsiveTableContainerProps) {
    return (
        <div
            className={cn(
                "w-full overflow-x-auto rounded-lg border",
                "-webkit-overflow-scrolling-touch",
                className
            )}
            {...props}
        >
            <div style={{ minWidth }}>
                {children}
            </div>
        </div>
    )
}
