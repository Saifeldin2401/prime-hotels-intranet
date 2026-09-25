import React, { useState, useRef, useEffect, useId } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  helperText?: string
  errorMessage?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  label,
  helperText,
  errorMessage,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const isError = Boolean(errorMessage)

  return (
    <div ref={containerRef} className={`relative w-full space-y-1.5 text-start font-sans ${className}`}>
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-xs font-semibold text-ds-ink tracking-wide"
        >
          {label}
          {required && <span className="ms-1 text-ds-danger">*</span>}
        </label>
      )}

      <button
        id={generatedId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3.5 pe-10 text-sm text-start bg-ds-surface border rounded-[6px] transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass disabled:bg-ds-surface-subtle disabled:cursor-not-allowed flex items-center justify-between ${
          isError ? 'border-ds-danger' : 'border-ds-border hover:border-ds-border-strong'
        }`}
      >
        <span className={selectedOption ? 'text-ds-ink font-medium' : 'text-ds-muted'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-ds-muted shrink-0 ms-2" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-ds-surface border border-ds-border rounded-[8px] shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden"
        >
          <div className="p-2 border-b border-ds-border/60 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-ds-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs bg-transparent border-0 text-ds-ink placeholder:text-ds-muted focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-center text-ds-muted">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[4px] text-start transition-colors duration-150 min-h-[36px] ${
                      isSelected
                        ? 'bg-ds-accent-soft text-ds-brass font-semibold'
                        : 'text-ds-ink hover:bg-ds-surface-subtle'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-[11px] text-ds-muted truncate mt-0.5">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-ds-brass shrink-0 ms-2" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {errorMessage ? (
        <p role="alert" className="text-xs text-ds-danger">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p className="text-xs text-ds-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
