import React, { forwardRef, useId } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  errorMessage?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      id,
      disabled,
      required,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const isError = Boolean(errorMessage)

    return (
      <div className="w-full space-y-1.5 text-start font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-ds-ink tracking-wide"
          >
            {label}
            {required && <span className="ms-1 text-ds-danger">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 pointer-events-none text-ds-muted flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={
              isError ? errorId : helperText ? helperId : undefined
            }
            className={`w-full min-h-[44px] px-3.5 text-sm text-ds-ink bg-ds-surface border rounded-[6px] transition-colors duration-150 motion-reduce:transition-none placeholder:text-ds-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:bg-ds-surface-subtle disabled:cursor-not-allowed ${
              leftIcon ? 'ps-10' : ''
            } ${rightIcon ? 'pe-10' : ''} ${
              isError
                ? 'border-ds-danger'
                : 'border-ds-border hover:border-ds-border-strong'
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute end-3 text-ds-muted flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {errorMessage ? (
          <p id={errorId} role="alert" className="text-xs text-ds-danger">
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-ds-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
