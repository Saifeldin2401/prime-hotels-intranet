import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EnhancedCardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'gold' | 'elevated'
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
  onClick
}: EnhancedCardProps) {
  const baseClasses = 'rounded-xl transition-all duration-200'
  
  const variantClasses = {
    default: 'bg-card border border-border shadow-md',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-hotel',
    gold: 'bg-gradient-to-br from-hotel-gold/10 to-hotel-gold/5 border border-hotel-gold/20 shadow-hotel',
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
    >
      {children}
    </div>
  )
}
