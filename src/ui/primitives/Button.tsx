import React, { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium min-h-[44px] rounded-[6px] select-none transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent dark:focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-ds-ink text-white hover:bg-ds-ink/90 dark:bg-ds-ink dark:text-ds-on-ink dark:hover:bg-ds-ink/90 shadow-none border border-transparent',
      secondary:
        'bg-ds-surface text-ds-ink border border-ds-border hover:bg-ds-background dark:bg-ds-surface dark:text-ds-ink dark:border-ds-border dark:hover:bg-ds-background',
      ghost:
        'bg-transparent text-ds-ink hover:bg-ds-border/30 dark:text-ds-ink dark:hover:bg-ds-border/40 border border-transparent',
      destructive:
        'bg-ds-danger text-white hover:bg-ds-danger/90 dark:bg-ds-danger dark:text-white dark:hover:bg-ds-danger/90 border border-transparent',
    }

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs min-w-[44px]',
      md: 'px-4 py-2 text-sm min-w-[44px]',
      lg: 'px-6 py-2.5 text-base min-w-[44px]',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 me-2 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="me-2 shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="ms-2 shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
