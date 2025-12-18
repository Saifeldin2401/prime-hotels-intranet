import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface EnhancedButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gold' | 'navy'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

import { motion } from 'framer-motion'
import { microInteractionVariants } from '@/lib/motion'

export function EnhancedButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button'
}: EnhancedButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-muted disabled:text-muted-foreground disabled:pointer-events-none'

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-hotel-navy hover:shadow-md focus:ring-primary',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary hover:shadow-sm focus:ring-secondary',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-sm focus:ring-accent',
    ghost: 'bg-muted text-secondary-foreground hover:bg-muted hover:text-accent-foreground hover:shadow-sm focus:ring-accent',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-red-700 hover:shadow-md focus:ring-destructive',
    gold: 'bg-gradient-to-r from-hotel-gold to-hotel-gold-dark text-white hover:from-hotel-gold-light hover:to-hotel-gold hover:shadow-md focus:ring-hotel-gold',
    navy: 'bg-gradient-to-r from-hotel-navy to-hotel-navy-dark text-white hover:from-hotel-navy-light hover:to-hotel-navy hover:shadow-md focus:ring-hotel-navy'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const widthClasses = fullWidth ? 'w-full' : ''

  const renderIcon = () => {
    if (loading) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    return icon
  }

  const renderContent = () => {
    if (!icon) return children

    const iconElement = renderIcon()

    if (iconPosition === 'left') {
      return (
        <>
          {iconElement}
          <span className="ml-2">{children}</span>
        </>
      )
    } else {
      return (
        <>
          <span className="mr-2">{children}</span>
          {iconElement}
        </>
      )
    }
  }

  return (
    <motion.button
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        widthClasses,
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
      variants={disabled || loading ? undefined : microInteractionVariants}
      initial="idle"
      whileHover="hover"
      whileTap="tap"
    >
      {renderContent()}
    </motion.button>
  )
}
