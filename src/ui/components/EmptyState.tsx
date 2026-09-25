import React from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-ds-surface border border-ds-border rounded-[8px] space-y-4 max-w-lg mx-auto ${className}`}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-[6px] bg-ds-surface-subtle text-ds-brass">
        {icon || <Inbox className="w-6 h-6" />}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-ds-ink">
          {title}
        </h3>
        <p className="text-xs text-ds-muted leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
