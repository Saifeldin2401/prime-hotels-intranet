import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EnhancedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'gold' | 'navy' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  clickable?: boolean
  onClick?: () => void
}

export function EnhancedCard({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = true,
  clickable = false,
  onClick,
  ...props
}: EnhancedCardProps) {
  const baseClasses = 'rounded-xl transition-all duration-200'

  const variantClasses = {
    default: 'bg-card border border-border shadow-md',
    glass: 'bg-card border border-border shadow-md', // Deprecated glass look, mapped to default
    gold: 'bg-[#FDF8F0] border border-[#E5D5BC] shadow-sm', // Solid Cream
    navy: 'bg-hotel-navy text-white border border-hotel-navy-light shadow-lg',
    elevated: 'bg-card border border-border shadow-lg'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const hoverClasses = hover ? 'hover:shadow-lg hover:-translate-y-1' : ''
  const clickableClasses = clickable ? 'cursor-pointer active:scale-95' : ''

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        hoverClasses,
        clickableClasses,
        className
      )}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  )
}
