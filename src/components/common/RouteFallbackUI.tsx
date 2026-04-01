import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react'
import type { ErrorInfo } from 'react'
import { useNavigate } from 'react-router-dom'

interface RouteFallbackUIProps {
    error?: Error
    errorInfo?: ErrorInfo
    onRetry: () => void
    section?: string
}

export function RouteFallbackUI({
    error,
    errorInfo,
    onRetry,
    section
}: RouteFallbackUIProps) {
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
                        <div className="bg-gray-50 p-4 rounded-lg text-left">
                            <p className="font-mono text-sm text-red-600 mb-2">{error.toString()}</p>
                            {errorInfo && (
                                <pre className="font-mono text-xs text-gray-600 overflow-auto max-h-40">
                                    {errorInfo.componentStack}
                                </pre>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Home
                        </Button>
                        <Button onClick={onRetry} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
