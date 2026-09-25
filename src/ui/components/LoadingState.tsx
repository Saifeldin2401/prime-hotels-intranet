import React from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  message?: string
  compact?: boolean
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-ds-muted font-sans py-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-ds-brass shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[8px] bg-ds-surface border border-ds-border space-y-3 font-sans ${className}`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-[6px] bg-ds-surface-subtle text-ds-brass">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
      <p className="text-xs font-medium text-ds-muted">{message}</p>
    </div>
  )
}
