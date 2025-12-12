import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EnhancedBadgeProps {
  children: ReactNode
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'gold' | 'navy' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  dot?: boolean
  count?: number
  maxCount?: number
}

export function EnhancedBadge({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
  count,
  maxCount = 99
}: EnhancedBadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    success: 'bg-success text-success-foreground hover:bg-success/80',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    gold: 'bg-hotel-gold text-white hover:bg-hotel-gold-dark',
    navy: 'bg-hotel-navy text-white hover:bg-hotel-navy-dark',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  }

  const dotSizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  }

  if (dot) {
    return (
      <span className={cn(
        'rounded-full',
        variantClasses[variant],
        dotSizeClasses[size],
        className
      )} />
    )
  }

  const displayCount = count && count > maxCount ? `${maxCount}+` : count

  return (
    <span className={cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {displayCount !== undefined ? displayCount : children}
    </span>
  )
}
