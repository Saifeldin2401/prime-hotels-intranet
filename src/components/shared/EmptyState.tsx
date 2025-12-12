import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick: () => void
        icon?: LucideIcon
    }
    className?: string
    iconClassName?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    iconClassName,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            {Icon && (
                <div className={cn(
                    'mb-4 rounded-full bg-muted p-6',
                    iconClassName
                )}>
                    <Icon className="h-12 w-12 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {action && (
                <Button onClick={action.onClick} className="gap-2">
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                </Button>
            )}
        </div>
    )
}
