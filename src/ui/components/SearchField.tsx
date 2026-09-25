import React, { forwardRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  showShortcut?: boolean
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = 'Search SOPs, policies, guides or topics...',
      showShortcut = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const [internalVal, setInternalVal] = useState('')
    const isControlled = value !== undefined
    const currentVal = isControlled ? String(value) : internalVal

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalVal(e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      if (!isControlled) setInternalVal('')
      onClear?.()
    }

    return (
      <div className={`relative flex items-center w-full font-sans ${className}`}>
        <div className="absolute start-3.5 pointer-events-none text-ds-muted">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={ref}
          type="search"
          value={currentVal}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full min-h-[44px] ps-10 pe-14 text-sm text-ds-ink bg-ds-surface border border-ds-border hover:border-ds-border-strong rounded-[6px] transition-colors duration-150 motion-reduce:transition-none placeholder:text-ds-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2"
          {...props}
        />

        <div className="absolute end-3 flex items-center gap-1.5">
          {currentVal ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="p-1 rounded text-ds-muted hover:text-ds-ink transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : showShortcut ? (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-medium text-ds-muted bg-ds-surface-subtle border border-ds-border rounded-[4px]">
              /
            </kbd>
          ) : null}
        </div>
      </div>
    )
  }
)

SearchField.displayName = 'SearchField'
