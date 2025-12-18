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

import { motion } from 'framer-motion'
import { DURATION, EASING } from '@/lib/motion'

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
  const baseClasses = 'rounded-xl transition-colors duration-200'

  const variantClasses = {
    default: 'bg-card border border-border shadow-md',
    glass: 'bg-card border border-border shadow-md',
    gold: 'bg-[#FDF8F0] border border-[#E5D5BC] shadow-sm',
    navy: 'bg-hotel-navy text-white border border-hotel-navy-light shadow-lg',
    elevated: 'bg-card border border-border shadow-lg'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  // Motion variants for interactions
  const cardVariants = {
    idle: { y: 0, scale: 1, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
    hover: {
      y: -4,
      scale: 1, // We don't scale cards, just lift
      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
      transition: { duration: DURATION.MEDIUM, ease: EASING.DEFAULT }
    },
    tap: {
      scale: 0.98,
      transition: { duration: DURATION.FAST, ease: EASING.DEFAULT }
    }
  }

  // Only apply hover variants if hover interaction is enabled
  const finalVariants = hover || clickable ? cardVariants : undefined

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        clickable ? 'cursor-pointer' : '', // Remove CSS hover/active classes
        className
      )}
      onClick={clickable ? onClick : undefined}
      variants={finalVariants}
      initial="idle"
      whileHover={hover || clickable ? "hover" : undefined}
      whileTap={clickable ? "tap" : undefined}
      {...props}
    >
      {children}
    </motion.div>
  )
}
