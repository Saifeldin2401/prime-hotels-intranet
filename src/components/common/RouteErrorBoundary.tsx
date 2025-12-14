import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    section?: string // Name of the route section for better error messages
}

interface State {
    hasError: boolean
    error?: Error
    errorInfo?: ErrorInfo
}

// Wrapper to provide navigation in class component
function RouteFallbackUI({
    error,
    errorInfo,
    onRetry,
    section
}: {
    error?: Error
    errorInfo?: ErrorInfo
    onRetry: () => void
    section?: string
}) {
    const navigate = useNavigate()

    return (
        <div className="flex items-center justify-center p-4 py-16">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-red-600">
                        {section ? `Error in ${section}` : 'Something went wrong'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-gray-600">
                        An error occurred while loading this section. This has been logged and our team will investigate.
                    </p>

                    {import.meta.env.DEV && error && (
                        <details className="bg-gray-50 p-4 rounded-lg text-sm border">
                            <summary className="cursor-pointer font-medium text-gray-700 flex items-center gap-2">
                                <span>🐛</span> Developer Info
                            </summary>
                            <div className="mt-3 space-y-2">
                                <div className="font-mono text-xs">
                                    <span className="text-red-600 font-semibold">{error.name}:</span>{' '}
                                    {error.message}
                                </div>
                                {errorInfo?.componentStack && (
                                    <pre className="text-xs overflow-auto bg-white p-2 rounded border max-h-48">
                                        {errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        </details>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={onRetry} className="flex-1">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="flex-1"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                            className="flex-1"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export class RouteErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Route Error in ${this.props.section || 'unknown section'}:`, error, errorInfo)

        this.setState({
            error,
            errorInfo
        })

        // Log to error tracking service
        this.logError(error, errorInfo)
    }

    private logError = (error: Error, errorInfo: ErrorInfo) => {
        // In production, send to error tracking service like Sentry
        const errorData = {
            section: this.props.section,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            url: window.location.href
        }

        console.group('🚨 Route Error Logged')
        console.error(errorData)
        console.groupEnd()

        // TODO: Send to Sentry/LogRocket/etc
        // Sentry.captureException(error, { extra: errorData })
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <RouteFallbackUI
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onRetry={this.handleRetry}
                    section={this.props.section}
                />
            )
        }

        return this.props.children
    }
}
