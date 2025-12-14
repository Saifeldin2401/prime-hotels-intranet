import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    FileText,
    Inbox,
    Search,
    AlertCircle,
    Plus,
    RefreshCw,
    type LucideIcon,
} from 'lucide-react'

export type EmptyStateVariant = 'no-data' | 'no-results' | 'error' | 'custom'

interface EmptyStateProps {
    /** The variant determines the default icon and messaging */
    variant?: EmptyStateVariant
    /** Custom icon to display */
    icon?: LucideIcon
    /** Custom icon element (takes precedence over icon prop) */
    iconElement?: React.ReactNode
    /** Main title text */
    title?: string
    /** Descriptive message text */
    description?: string
    /** Primary action button */
    action?: {
        label: string
        onClick: () => void
        icon?: LucideIcon
    }
    /** Secondary action button */
    secondaryAction?: {
        label: string
        onClick: () => void
    }
    /** Additional className for container */
    className?: string
    /** Compact mode for inline usage */
    compact?: boolean
}

const defaultProps: Record<EmptyStateVariant, {
    icon: LucideIcon
    title: string
    description: string
}> = {
    'no-data': {
        icon: Inbox,
        title: 'No data yet',
        description: 'Get started by creating your first item.',
    },
    'no-results': {
        icon: Search,
        title: 'No results found',
        description: 'Try adjusting your search or filter criteria.',
    },
    error: {
        icon: AlertCircle,
        title: 'Something went wrong',
        description: 'We encountered an error loading this content.',
    },
    custom: {
        icon: FileText,
        title: '',
        description: '',
    },
}

export function EmptyState({
    variant = 'no-data',
    icon,
    iconElement,
    title,
    description,
    action,
    secondaryAction,
    className,
    compact = false,
}: EmptyStateProps) {
    const defaults = defaultProps[variant]
    const IconComponent = icon || defaults.icon
    const displayTitle = title || defaults.title
    const displayDescription = description || defaults.description

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'py-8 px-4' : 'py-16 px-6',
                className
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    'flex items-center justify-center rounded-full bg-muted/50 mb-4',
                    compact ? 'w-12 h-12' : 'w-16 h-16'
                )}
            >
                {iconElement || (
                    <IconComponent
                        className={cn(
                            'text-muted-foreground',
                            compact ? 'w-6 h-6' : 'w-8 h-8'
                        )}
                    />
                )}
            </div>

            {/* Title */}
            {displayTitle && (
                <h3
                    className={cn(
                        'font-semibold text-foreground mb-1',
                        compact ? 'text-base' : 'text-lg'
                    )}
                >
                    {displayTitle}
                </h3>
            )}

            {/* Description */}
            {displayDescription && (
                <p
                    className={cn(
                        'text-muted-foreground max-w-sm',
                        compact ? 'text-sm' : 'text-sm'
                    )}
                >
                    {displayDescription}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-6')}>
                    {action && (
                        <Button onClick={action.onClick} size={compact ? 'sm' : 'default'}>
                            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant="outline"
                            onClick={secondaryAction.onClick}
                            size={compact ? 'sm' : 'default'}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

// Pre-configured empty states for common use cases
export function NoDataEmptyState({
    entityName = 'items',
    onCreateNew,
    ...props
}: Omit<EmptyStateProps, 'variant'> & {
    entityName?: string
    onCreateNew?: () => void
}) {
    return (
        <EmptyState
            variant="no-data"
            title={`No ${entityName} yet`}
            description={`Get started by creating your first ${entityName.toLowerCase().replace(/s$/, '')}.`}
            action={
                onCreateNew
                    ? {
                        label: `Create ${entityName.replace(/s$/, '')}`,
                        onClick: onCreateNew,
                        icon: Plus,
                    }
                    : undefined
            }
            {...props}
        />
    )
}

export function NoResultsEmptyState({
    onClearFilters,
    ...props
}: Omit<EmptyStateProps, 'variant'> & {
    onClearFilters?: () => void
}) {
    return (
        <EmptyState
            variant="no-results"
            action={
                onClearFilters
                    ? {
                        label: 'Clear filters',
                        onClick: onClearFilters,
                    }
                    : undefined
            }
            {...props}
        />
    )
}

export function ErrorEmptyState({
    onRetry,
    ...props
}: Omit<EmptyStateProps, 'variant'> & {
    onRetry?: () => void
}) {
    return (
        <EmptyState
            variant="error"
            action={
                onRetry
                    ? {
                        label: 'Try again',
                        onClick: onRetry,
                        icon: RefreshCw,
                    }
                    : undefined
            }
            {...props}
        />
    )
}
