import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { DURATION, EASING } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface EnhancedCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'gold' | 'navy' | 'elevated' | 'premium'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  clickable?: boolean
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
  const baseClasses = 'rounded-xl transition-colors duration-200'

  const variantClasses = {
    default: 'bg-card border border-border shadow-md',
    glass: 'glass-card', // Use the utility class from index.css
    gold: 'card-gold',   // Use the utility class from index.css
    navy: 'bg-hotel-navy text-white border border-hotel-navy-light shadow-lg',
    elevated: 'bg-card border border-border shadow-xl ring-1 ring-black/5',
    premium: 'bg-hotel-cream border border-hotel-gold/30 shadow-2xl relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-br after:from-hotel-gold/5 after:to-transparent after:pointer-events-none'
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
