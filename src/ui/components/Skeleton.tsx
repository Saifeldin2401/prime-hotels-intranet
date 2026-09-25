import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'control' | 'card' | 'circle'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  className = '',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-[4px]',
    control: 'h-11 w-full rounded-[6px]',
    card: 'h-24 w-full rounded-[8px]',
    circle: 'h-10 w-10 rounded-full',
  }

  return (
    <div
      aria-hidden="true"
      className={`bg-ds-surface-subtle animate-pulse border border-ds-border/40 ${variantStyles[variant]} ${className}`}
      {...props}
    />
  )
}
