import { forwardRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

interface EnhancedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'outlined'
  size?: 'sm' | 'md' | 'lg'
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    type = 'text', 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon,
    variant = 'default',
    size = 'md',
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type
    
    const baseClasses = 'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50'
    
    const variantClasses = {
      default: 'border-input bg-background',
      filled: 'border-transparent bg-muted focus:bg-background',
      outlined: 'border-2 border-input bg-background'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base'
    }
    
    const hasError = !!error
    const errorClasses = hasError ? 'border-destructive focus:ring-destructive' : ''
    
    const renderRightIcon = () => {
      if (isPassword) {
        return (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )
      }
      return rightIcon
    }
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            type={inputType}
            className={cn(
              baseClasses,
              variantClasses[variant],
              sizeClasses[size],
              errorClasses,
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          
          {(rightIcon || isPassword) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {renderRightIcon()}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <div className="mt-1.5 flex items-start gap-1">
            {error && <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />}
            <p className={cn(
              'text-xs',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    )
  }
)

EnhancedInput.displayName = 'EnhancedInput'
