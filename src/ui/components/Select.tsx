import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  helperText?: string
  errorMessage?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
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
    const selectId = id || generatedId
    const errorId = `${selectId}-error`
    const helperId = `${selectId}-helper`

    const isError = Boolean(errorMessage)

    return (
      <div className="w-full space-y-1.5 text-start font-sans">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-ds-ink tracking-wide"
          >
            {label}
            {required && <span className="ms-1 text-ds-danger">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={
              isError ? errorId : helperText ? helperId : undefined
            }
            className={`w-full min-h-[44px] px-3.5 pe-10 text-sm text-ds-ink bg-ds-surface border rounded-[6px] appearance-none transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:bg-ds-surface-subtle disabled:cursor-not-allowed ${
              isError
                ? 'border-ds-danger'
                : 'border-ds-border hover:border-ds-border-strong'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="absolute end-3 pointer-events-none text-ds-muted">
            <ChevronDown className="w-4 h-4" />
          </div>
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

Select.displayName = 'Select'
