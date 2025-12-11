import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { useAnimationPreferences } from '@/hooks/useAnimations'

// Interactive Button with ripple effect
interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  ripple?: boolean
  magnetic?: boolean
}

export const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, variant = 'default', size = 'default', ripple = true, magnetic = false, children, ...props }, ref) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
    const buttonRef = useRef<HTMLButtonElement>(null)
    const preferences = useAnimationPreferences()

    // Apply magnetic effect if enabled
    useEffect(() => {
      if (!magnetic || !buttonRef.current || preferences.shouldUseReducedMotion) return

      const element = buttonRef.current
      const handleMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        const deltaX = (e.clientX - centerX) * 0.3
        const deltaY = (e.clientY - centerY) * 0.3
        
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      }

      const handleMouseLeave = () => {
        element.style.transform = 'translate(0, 0)'
      }

      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseleave', handleMouseLeave)

      return () => {
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, [magnetic, preferences.shouldUseReducedMotion])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || preferences.shouldUseReducedMotion) {
        props.onClick?.(e)
        return
      }

      const button = buttonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const newRipple = { id: Date.now(), x, y }
      setRipples(prev => [...prev, newRipple])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)

      props.onClick?.(e)
    }

    const baseClasses = cn(
      'relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none overflow-hidden',
      {
        'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
        'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
        'border border-input hover:bg-accent hover:text-accent-foreground': variant === 'outline',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
        'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
        'text-primary underline-offset-4 hover:underline': variant === 'link',
      },
      {
        'h-10 py-2 px-4': size === 'default',
        'h-9 px-3 rounded-md': size === 'sm',
        'h-11 px-8 rounded-md': size === 'lg',
        'h-10 w-10': size === 'icon',
      },
      'hover-lift',
      className
    )

    return (
      <button
        ref={buttonRef}
        className={baseClasses}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        <style jsx>{`
          @keyframes ripple {
            from {
              width: 0;
              height: 0;
              opacity: 1;
            }
            to {
              width: 300px;
              height: 300px;
              opacity: 0;
            }
          }
          .animate-ripple {
            animation: ripple 0.6s ease-out;
          }
        `}</style>
      </button>
    )
  }
)

InteractiveButton.displayName = 'InteractiveButton'

// Floating Action Button
interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  distance?: number
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ className, position = 'bottom-right', distance = 24, children, ...props }, ref) => {
    const preferences = useAnimationPreferences()

    const positionClasses = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    }

    const baseClasses = cn(
      'fixed w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50',
      positionClasses[position],
      !preferences.shouldUseReducedMotion && 'hover-scale animate-bounce-subtle',
      className
    )

    return (
      <button
        ref={ref}
        className={baseClasses}
        style={{ [position.split('-')[0]]: distance }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

FloatingActionButton.displayName = 'FloatingActionButton'

// Interactive Card with hover effects
interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  tilt?: boolean
  glow?: boolean
}

export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, hover = true, tilt = false, glow = false, children, ...props }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)
    const { shouldUseReducedMotion } = useAnimationPreferences()

    // Apply tilt effect on hover
    useEffect(() => {
      if (!tilt || shouldUseReducedMotion) return

      const card = cardRef.current
      if (!card) return

      const handleMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        const angleX = (e.clientY - centerY) * 0.01
        const angleY = (centerX - e.clientX) * 0.01
        
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(1.02)`
      }

      const handleMouseLeave = () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
      }

      if (isHovered) {
        card.addEventListener('mousemove', handleMouseMove)
        card.addEventListener('mouseleave', handleMouseLeave)
      }

      return () => {
        card.removeEventListener('mousemove', handleMouseMove)
        card.removeEventListener('mouseleave', handleMouseLeave)
      }
    }, [tilt, isHovered, shouldUseReducedMotion])

    const baseClasses = cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300',
      hover && 'card-hover cursor-pointer',
      glow && 'hover-glow',
      tilt && 'preserve-3d',
      className
    )

    return (
      <div
        ref={cardRef}
        className={baseClasses}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

InteractiveCard.displayName = 'InteractiveCard'

// Progress Bar with animation
interface AnimatedProgressProps {
  value: number
  max?: number
  className?: string
  animated?: boolean
  showLabel?: boolean
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  max = 100,
  className,
  animated = true,
  showLabel = false,
  color = 'primary'
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const { shouldUseReducedMotion } = useAnimationPreferences()

  useEffect(() => {
    if (shouldUseReducedMotion) {
      setDisplayValue(value)
      return
    }

    const duration = 1000
    const startTime = Date.now()
    const startValue = displayValue

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const newValue = startValue + (value - startValue) * easeOutQuart
      
      setDisplayValue(newValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, shouldUseReducedMotion])

  const percentage = Math.min((displayValue / max) * 100, 100)
  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            colorClasses[color],
            animated && !shouldUseReducedMotion && 'progress-bar-animated'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Tooltip with animation
interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId)
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-current',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-current',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-current',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-current'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap animate-fade-in',
            positionClasses[position]
          )}
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  )
}

// Skeleton Loader with animation
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const { shouldUseReducedMotion } = useAnimationPreferences()

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  const baseClasses = cn(
    'bg-muted',
    variantClasses[variant],
    !shouldUseReducedMotion && 'loading-skeleton',
    className
  )

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'text' ? '1rem' : '40px')
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{
              ...style,
              width: i === lines - 1 ? '70%' : '100%'
            }}
          />
        ))}
      </div>
    )
  }

  return <div className={baseClasses} style={style} />
}

// Loading Spinner with animation
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className
}) => {
  const { shouldUseReducedMotion } = useAnimationPreferences()

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div
      className={cn(
        'border-2 border-primary border-t-transparent rounded-full',
        sizeClasses[size],
        !shouldUseReducedMotion && 'animate-spin',
        className
      )}
    />
  )
}

// Pulse Animation Component
interface PulseProps {
  children: React.ReactNode
  className?: string
  intensity?: 'subtle' | 'medium' | 'strong'
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  className,
  intensity = 'subtle'
}) => {
  const { shouldUseReducedMotion } = useAnimationPreferences()

  const intensityClasses = {
    subtle: 'animate-pulse-subtle',
    medium: 'animate-pulse',
    strong: 'animate-pulse'
  }

  return (
    <div className={cn(!shouldUseReducedMotion && intensityClasses[intensity], className)}>
      {children}
    </div>
  )
}

// Shake Animation Component
interface ShakeProps {
  children: React.ReactNode
  trigger?: boolean
  className?: string
}

export const Shake: React.FC<ShakeProps> = ({
  children,
  trigger = false,
  className
}) => {
  const [isShaking, setIsShaking] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsShaking(true)
      const timer = setTimeout(() => setIsShaking(false), 500)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <div className={cn(isShaking && 'animate-shake', className)}>
      {children}
    </div>
  )
}

// Floating Label Input
interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  className,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = value && value.toString().length > 0

  const labelClasses = cn(
    'absolute left-3 transition-all duration-200 pointer-events-none',
    isFocused || hasValue
      ? 'text-xs -top-2 left-2 bg-background px-1 text-primary'
      : 'text-sm top-1/2 transform -translate-y-1/2 text-muted-foreground'
  )

  return (
    <div className="relative">
      <input
        className={cn(
          'w-full px-3 py-2 border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          className
        )}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        value={value}
        {...props}
      />
      <label className={labelClasses}>
        {label}
      </label>
    </div>
  )
}
