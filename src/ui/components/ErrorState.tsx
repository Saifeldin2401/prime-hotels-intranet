import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/ui/primitives/Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to complete request',
  message = 'Please check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[8px] bg-ds-danger-soft/30 border border-ds-danger/30 space-y-3 font-sans max-w-lg mx-auto ${className}`}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-[6px] bg-ds-danger/10 text-ds-danger">
        <AlertCircle className="w-5 h-5" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-ds-ink">{title}</h3>
        <p className="text-xs text-ds-muted leading-relaxed max-w-sm">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
