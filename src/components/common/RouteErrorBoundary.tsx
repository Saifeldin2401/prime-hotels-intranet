import { securityUtils } from '@/lib/security-config'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RouteFallbackUI } from './RouteFallbackUI'

interface Props {
    children?: ReactNode
    fallback?: ReactNode
    section?: string // Name of the route section for better error messages
}

interface State {
    hasError: boolean
    error?: Error
    errorInfo?: ErrorInfo
}

export class RouteErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        })

        // Log to error tracking service via centralized utility
        securityUtils.logException(error, {
            section: this.props.section,
            componentStack: errorInfo.componentStack,
            url: window.location.href
        })
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
