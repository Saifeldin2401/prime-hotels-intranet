import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  variant?: 'success' | 'warning' | 'danger' | 'info'
  onDismiss?: (id: string) => void
}

export const Toast: React.FC<ToastMessage> = ({
  id,
  title,
  description,
  variant = 'info',
  onDismiss,
}) => {
  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-ds-success shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-ds-warning shrink-0" />,
    danger: <AlertCircle className="w-4 h-4 text-ds-danger shrink-0" />,
    info: <Info className="w-4 h-4 text-ds-info shrink-0" />,
  }

  const borderMap = {
    success: 'border-s-4 border-s-ds-success',
    warning: 'border-s-4 border-s-ds-warning',
    danger: 'border-s-4 border-s-ds-danger',
    info: 'border-s-4 border-s-ds-info',
  }

  return (
    <div
      role="status"
      className={`flex items-start gap-3 p-4 bg-ds-surface border border-ds-border ${borderMap[variant]} rounded-[8px] shadow-lg shadow-black/10 dark:shadow-black/40 font-sans max-w-sm w-full transition-all duration-150 motion-reduce:transition-none`}
    >
      <div className="pt-0.5">{iconMap[variant]}</div>

      <div className="flex-1 space-y-0.5">
        <h4 className="text-xs font-semibold text-ds-ink">{title}</h4>
        {description && (
          <p className="text-xs text-ds-muted leading-relaxed">{description}</p>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="p-1 rounded text-ds-muted hover:text-ds-ink transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
