import React from 'react'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  /** id for the heading, so a surrounding <section aria-labelledby> can name itself */
  headingId?: string
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  headingId,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 ${className}`}>
      <div className="space-y-0.5">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-ds-ink">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-ds-muted">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
