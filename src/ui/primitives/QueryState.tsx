import React from 'react'
import { AlertCircle, Inbox, Lock, RotateCcw, WifiOff, Loader2 } from 'lucide-react'

export interface QueryStateProps {
  /** If the query is currently fetching data */
  isLoading?: boolean
  /** If an error occurred */
  error?: Error | string | null
  /** If access is forbidden (403 or RLS policy denial) */
  isForbidden?: boolean
  /** If the browser/device is currently offline */
  isOffline?: boolean
  /** If data is considered empty (e.g. array length 0 or null) */
  isEmpty?: boolean
  /** Custom empty state title */
  emptyTitle?: string
  /** Custom empty state description */
  emptyDescription?: string
  /** Optional action button to render on empty state (e.g. "Create Course") */
  emptyAction?: React.ReactNode
  /** Callback to retry the query on error or offline */
  onRetry?: () => void
  /** Skeleton or custom component to render while loading */
  loadingFallback?: React.ReactNode
  /** Number of skeleton rows to render if no custom fallback is provided */
  skeletonRows?: number
  /** Content to render on successful data state */
  children: React.ReactNode
  className?: string
}

export const QueryState: React.FC<QueryStateProps> = ({
  isLoading,
  error,
  isForbidden,
  isOffline,
  isEmpty,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display at this time.',
  emptyAction,
  onRetry,
  loadingFallback,
  skeletonRows = 3,
  children,
  className = '',
}) => {
  // 1. Loading State
  if (isLoading) {
    if (loadingFallback) {
      return <div className={`w-full ${className}`}>{loadingFallback}</div>
    }

    return (
      <div
        role="status"
        aria-label="Loading content"
        className={`w-full space-y-3 p-6 ${className}`}
      >
        <div className="flex items-center gap-3 text-muted-foreground mb-4">
          <Loader2 className="w-5 h-5 animate-spin text-ds-accent dark:text-ds-brass" />
          <span className="text-sm font-medium">Loading content...</span>
        </div>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-14 w-full bg-ds-background dark:bg-ds-surface border border-ds-border dark:border-ds-border rounded-[6px] animate-pulse"
          />
        ))}
      </div>
    )
  }

  // 2. Offline State
  if (isOffline || (!navigator.onLine && Boolean(error))) {
    return (
      <div
        role="alert"
        className={`w-full p-8 text-center bg-ds-background dark:bg-ds-surface border border-ds-border dark:border-ds-border rounded-[8px] my-4 ${className}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-ds-border/40 dark:bg-ds-border/40 text-ds-muted dark:text-ds-muted">
          <WifiOff className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-ds-ink dark:text-ds-ink">
          You are currently offline
        </h3>
        <p className="text-sm text-ds-muted dark:text-ds-muted max-w-md mx-auto mt-1 mb-4">
          Check your network connection to reload the latest information.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-[6px] text-sm font-medium bg-ds-ink text-white dark:bg-ds-ink dark:text-ds-on-ink hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Connection
          </button>
        )}
      </div>
    )
  }

  // 3. Forbidden / Unauthorized State (403)
  if (isForbidden) {
    return (
      <div
        role="alert"
        className={`w-full p-8 text-center bg-ds-background dark:bg-ds-surface border border-ds-warning/30 dark:border-ds-warning/30 rounded-[8px] my-4 ${className}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-ds-warning/10 dark:bg-ds-warning/20 text-ds-warning dark:text-ds-warning">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-ds-ink dark:text-ds-ink">
          Access Restricted
        </h3>
        <p className="text-sm text-ds-muted dark:text-ds-muted max-w-md mx-auto mt-1">
          Your account does not have the required permissions to view this resource. Contact your property or organization administrator if you need access.
        </p>
      </div>
    )
  }

  // 4. Error State
  if (error) {
    const message = typeof error === 'string' ? error : error.message || 'An unexpected error occurred.'
    return (
      <div
        role="alert"
        className={`w-full p-6 bg-ds-surface dark:bg-ds-surface border border-ds-danger/40 dark:border-ds-danger/40 rounded-[8px] my-4 ${className}`}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-ds-danger/10 text-ds-danger dark:text-ds-danger shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-ds-danger dark:text-ds-danger">
              Unable to load content
            </h3>
            <p className="text-sm text-ds-ink-secondary dark:text-ds-ink-secondary mt-1 break-words">
              {message}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-[6px] text-xs font-semibold uppercase tracking-wider text-ds-danger dark:text-ds-danger border border-ds-danger/30 hover:bg-ds-danger/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 5. Empty State
  if (isEmpty) {
    return (
      <div
        role="region"
        aria-label="Empty records"
        className={`w-full p-8 text-center bg-ds-surface dark:bg-ds-surface border border-ds-border dark:border-ds-border rounded-[8px] my-4 ${className}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-ds-background dark:bg-ds-background text-ds-muted dark:text-ds-muted">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-ds-ink dark:text-ds-ink">
          {emptyTitle}
        </h3>
        <p className="text-sm text-ds-muted dark:text-ds-muted max-w-md mx-auto mt-1 mb-4">
          {emptyDescription}
        </p>
        {emptyAction && <div className="flex justify-center">{emptyAction}</div>}
      </div>
    )
  }

  // 6. Success / Loaded State
  return <>{children}</>
}
