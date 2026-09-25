import React from 'react'

export interface MetricCardProps {
  label: string
  value: number | string
  secondaryText?: string
  trend?: {
    value: string
    isPositive?: boolean
  }
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  secondaryText,
  trend,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-5 bg-ds-surface border border-ds-border rounded-[8px] space-y-3 shadow-none transition-colors duration-150 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ds-muted">
          {label}
        </span>
        {icon && (
          <div className="text-ds-brass">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-bold font-mono text-ds-ink tracking-tight">
          {value}
        </span>

        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.isPositive
                ? 'text-ds-success'
                : 'text-ds-danger'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {(secondaryText || action) && (
        <div className="flex items-center justify-between pt-1 border-t border-ds-border/40 text-xs">
          {secondaryText && (
            <span className="text-ds-muted truncate">
              {secondaryText}
            </span>
          )}
          {action && <div className="shrink-0 ms-2">{action}</div>}
        </div>
      )}
    </div>
  )
}
