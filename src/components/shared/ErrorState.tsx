import { AlertCircle, RefreshCw, ArrowLeft, Home, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ErrorVariant = 'default' | 'network' | 'notFound' | 'forbidden' | 'serverError'

interface ErrorStateProps {
    title?: string
    description?: string
    variant?: ErrorVariant
    onRetry?: () => void
    onGoBack?: () => void
    onGoHome?: () => void
    className?: string
    showCard?: boolean
}

const errorConfig: Record<ErrorVariant, { icon: typeof AlertCircle; title: string; description: string; color: string }> = {
    default: {
        icon: AlertCircle,
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        color: 'text-red-500'
    },
    network: {
        icon: WifiOff,
        title: 'Connection lost',
        description: 'Please check your internet connection and try again.',
        color: 'text-orange-500'
    },
    notFound: {
        icon: AlertCircle,
        title: 'Not found',
        description: 'The resource you\'re looking for doesn\'t exist or has been moved.',
        color: 'text-gray-500'
    },
    forbidden: {
        icon: AlertCircle,
        title: 'Access denied',
        description: 'You don\'t have permission to access this resource.',
        color: 'text-yellow-600'
    },
    serverError: {
        icon: AlertCircle,
        title: 'Server error',
        description: 'Our servers are having trouble. Please try again later.',
        color: 'text-red-600'
    }
}

export function ErrorState({
    title,
    description,
    variant = 'default',
    onRetry,
    onGoBack,
    onGoHome,
    className,
    showCard = true
}: ErrorStateProps) {
    const config = errorConfig[variant]
    const Icon = config.icon

    const content = (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            <div className={cn('mb-4 rounded-full bg-muted p-6', config.color.replace('text-', 'bg-').replace('500', '50').replace('600', '50'))}>
                <Icon className={cn('h-12 w-12', config.color)} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title || config.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {description || config.description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                {onRetry && (
                    <Button onClick={onRetry} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                )}
                {onGoBack && (
                    <Button variant="outline" onClick={onGoBack} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                )}
                {onGoHome && (
                    <Button variant="outline" onClick={onGoHome} className="gap-2">
                        <Home className="h-4 w-4" />
                        Go Home
                    </Button>
                )}
            </div>
        </div>
    )

    if (showCard) {
        return (
            <Card className={cn('border-dashed', className)}>
                <CardContent className="p-0">
                    {content}
                </CardContent>
            </Card>
        )
    }

    return content
}

// Inline error for forms and small sections
interface InlineErrorProps {
    message: string
    className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
    return (
        <div className={cn('flex items-center gap-2 text-sm text-destructive mt-1', className)}>
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{message}</span>
        </div>
    )
}

// Field error for form inputs
interface FieldErrorProps {
    error?: string
    className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
    if (!error) return null

    return (
        <p className={cn('text-sm text-destructive mt-1.5', className)}>
            {error}
        </p>
    )
}
