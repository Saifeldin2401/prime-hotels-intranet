import React from 'react'

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface StatusPillProps {
  variant?: StatusVariant
  label: string
  icon?: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  label,
  icon,
  size = 'md',
  className = '',
}) => {
  const variantStyles: Record<StatusVariant, string> = {
    success:
      'bg-ds-success/10 text-ds-success border-ds-success/30 dark:bg-ds-success/15 dark:text-ds-success dark:border-ds-success/40',
    warning:
      'bg-ds-warning/10 text-ds-warning border-ds-warning/30 dark:bg-ds-warning/15 dark:text-ds-warning dark:border-ds-warning/40',
    danger:
      'bg-ds-danger/10 text-ds-danger border-ds-danger/30 dark:bg-ds-danger/15 dark:text-ds-danger dark:border-ds-danger/40',
    info:
      'bg-ds-info/10 text-ds-info border-ds-info/30 dark:bg-ds-info/15 dark:text-ds-info dark:border-ds-info/40',
    neutral:
      'bg-ds-border/40 text-ds-ink-secondary border-ds-border dark:bg-ds-border/40 dark:text-ds-ink-secondary dark:border-ds-border',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] leading-[14px]',
    md: 'px-2.5 py-1 text-[12px] leading-[16px]',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  )
}
