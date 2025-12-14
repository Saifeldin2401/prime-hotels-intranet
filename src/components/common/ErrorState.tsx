import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw, WifiOff, ShieldX, FileX2, Server } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
    error: Error | string | null
    title?: string
    message?: string
    onRetry?: () => void
    className?: string
    compact?: boolean // For use in smaller spaces
}

// Determine error type and return appropriate icon/message
function getErrorDetails(error: Error | string | null) {
    const errorMessage = typeof error === 'string' ? error : error?.message || ''
    const errorName = typeof error === 'string' ? 'Error' : error?.name || 'Error'

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        return {
            icon: WifiOff,
            type: 'network',
            defaultTitle: 'Connection Error',
            defaultMessage: 'Unable to connect to the server. Please check your internet connection and try again.'
        }
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('403') || errorMessage.includes('401')) {
        return {
            icon: ShieldX,
            type: 'permission',
            defaultTitle: 'Access Denied',
            defaultMessage: 'You don\'t have permission to access this resource. Please contact your administrator.'
        }
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404') || errorMessage.includes('PGRST116')) {
        return {
            icon: FileX2,
            type: 'not_found',
            defaultTitle: 'Not Found',
            defaultMessage: 'The requested resource was not found. It may have been moved or deleted.'
        }
    }

    // Server errors
    if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('PGRST')) {
        return {
            icon: Server,
            type: 'server',
            defaultTitle: 'Server Error',
            defaultMessage: 'Something went wrong on our end. Please try again in a few moments.'
        }
    }

    // Generic errors
    return {
        icon: AlertCircle,
        type: 'generic',
        defaultTitle: 'Something Went Wrong',
        defaultMessage: 'An unexpected error occurred. Please try again.'
    }
}

export function ErrorState({
    error,
    title,
    message,
    onRetry,
    className,
    compact = false
}: ErrorStateProps) {
    const { t } = useTranslation('common')
    const details = getErrorDetails(error)
    const Icon = details.icon

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700",
                className
            )}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{title || details.defaultTitle}</p>
                    <p className="text-xs text-red-600 truncate">{message || details.defaultMessage}</p>
                </div>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} className="flex-shrink-0">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className={cn("w-full max-w-md mx-auto", className)}>
            <Card className="border-red-100">
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                    <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                        <Icon className="h-7 w-7 text-red-600" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                            {title || details.defaultTitle}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {message || details.defaultMessage}
                        </p>
                    </div>

                    {import.meta.env.DEV && error && (
                        <details className="text-left text-xs bg-gray-50 p-3 rounded-lg">
                            <summary className="cursor-pointer font-medium text-gray-700">
                                Technical Details
                            </summary>
                            <pre className="mt-2 text-gray-600 overflow-auto">
                                {typeof error === 'string' ? error : error.message}
                            </pre>
                        </details>
                    )}

                    {onRetry && (
                        <Button onClick={onRetry} className="mt-2">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('action.try_again', { defaultValue: 'Try Again' })}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// Export a quick inline error component
export function InlineError({
    message,
    onRetry
}: {
    message: string
    onRetry?: () => void
}) {
    return (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <button onClick={onRetry} className="hover:text-red-900">
                    <RefreshCw className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
