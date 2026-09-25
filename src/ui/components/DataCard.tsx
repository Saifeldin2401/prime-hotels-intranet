import React from 'react'

export interface DataCardProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  noPadding?: boolean
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  footer,
  className = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-ds-surface border border-ds-border rounded-[8px] shadow-none overflow-hidden transition-colors duration-150 ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between gap-4 p-5 pb-3 border-b border-ds-border/60">
          <div className="space-y-0.5 min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-ds-ink truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-ds-muted">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-5'}>{children}</div>

      {footer && (
        <div className="px-5 py-3 bg-ds-background/50 border-t border-ds-border/60 text-xs text-ds-muted">
          {footer}
        </div>
      )}
    </div>
  )
}
