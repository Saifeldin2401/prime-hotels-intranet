import { isRecoverableModuleLoadError, recoverFromStaleModuleLoad } from '@/main'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a recoverable module/chunk load error
    if (isRecoverableModuleLoadError(error)) {
      // Trigger recovery flow - this will clear SW cache and reload
      void recoverFromStaleModuleLoad(error)
      return
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: unknown }).Sentry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Sentry = (window as unknown as { Sentry: any }).Sentry
      Sentry.captureException(error, { extra: { errorInfo } })
    }
    
    // Show visible error banner for debugging
    const debugDiv = document.createElement('div')
    debugDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:white;padding:12px;font-family:monospace;font-size:12px;white-space:pre-wrap;max-height:200px;overflow:auto;'
    debugDiv.textContent = `ERROR: ${error.message}\nStack: ${error.stack?.slice(0, 500) || 'N/A'}...`
    document.body.appendChild(debugDiv)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}



