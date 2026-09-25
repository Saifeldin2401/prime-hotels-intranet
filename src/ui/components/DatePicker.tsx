import React, { forwardRef, useId } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  errorMessage?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      helperText,
      errorMessage,
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
      <div className={`w-full space-y-1.5 text-start font-sans ${className}`}>
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
          <div className="absolute start-3 pointer-events-none text-ds-muted flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>

          <input
            ref={ref}
            type="date"
            id={inputId}
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={
              isError ? errorId : helperText ? helperId : undefined
            }
            className={`w-full min-h-[44px] ps-10 pe-3.5 text-sm text-ds-ink bg-ds-surface border rounded-[6px] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:bg-ds-surface-subtle disabled:cursor-not-allowed ${
              isError
                ? 'border-ds-danger'
                : 'border-ds-border hover:border-ds-border-strong'
            }`}
            {...props}
          />
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

DatePicker.displayName = 'DatePicker'
