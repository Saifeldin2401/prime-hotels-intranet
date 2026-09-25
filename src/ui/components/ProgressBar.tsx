import React from 'react'

export interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  variant?: 'accent' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'accent',
  size = 'md',
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  const variantStyles = {
    accent: 'bg-ds-brass',
    success: 'bg-ds-success',
    warning: 'bg-ds-warning',
    danger: 'bg-ds-danger',
  }

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2',
  }

  return (
    <div className={`w-full font-sans ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          {label && <span className="text-ds-ink-secondary">{label}</span>}
          {showPercentage && (
            <span className="font-mono text-ds-muted">
              {percentage}%
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
        className={`w-full ${heightStyles[size]} bg-ds-surface-subtle rounded-full overflow-hidden`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${variantStyles[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
