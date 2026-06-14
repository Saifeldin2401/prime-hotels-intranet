/**
 * MobileForm Component
 * 
 * Mobile-optimized form layout with:
 * - Single column layout
 * - Sticky action buttons
 * - Section grouping
 * - Improved input spacing
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'

// Context for form state
interface MobileFormContextType {
  isSubmitting: boolean
  errors: Record<string, string>
}

const MobileFormContext = createContext<MobileFormContextType>({
  isSubmitting: false,
  errors: {},
})

export const useMobileForm = () => useContext(MobileFormContext)

interface MobileFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  isSubmitting?: boolean
  errors?: Record<string, string>
  className?: string
}

/**
 * MobileForm - Mobile-optimized form container
 * 
 * Usage:
 * ```tsx
 * <MobileForm onSubmit={handleSubmit} isSubmitting={isSubmitting}>
 *   <MobileFormSection title="Personal Info">
 *     <MobileFormField label="Name" error={errors.name}>
 *       <Input {...} />
 *     </MobileFormField>
 *   </MobileFormSection>
 *   <MobileFormActions>
 *     <Button type="submit">Save</Button>
 *   </MobileFormActions>
 * </MobileForm>
 * ```
 */
export function MobileForm({
  children,
  onSubmit,
  isSubmitting = false,
  errors = {},
  className,
  ...props
}: MobileFormProps) {
  return (
    <MobileFormContext.Provider value={{ isSubmitting, errors }}>
      <form
        onSubmit={onSubmit}
        className={cn('space-y-6 pb-32', className)}
        {...props}
      >
        {children}
      </form>
    </MobileFormContext.Provider>
  )
}

interface MobileFormSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  className?: string
}

/**
 * MobileFormSection - Group form fields into collapsible sections
 */
export function MobileFormSection({
  children,
  title,
  description,
  collapsible = false,
  defaultExpanded = true,
  className,
}: MobileFormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={cn('bg-card rounded-lg border', className)}>
      {(title || description) && (
        <div
          className={cn(
            'px-4 py-3 border-b',
            collapsible && 'cursor-pointer active:bg-muted/50',
            !isExpanded && 'border-b-0'
          )}
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center justify-between">
            {title && <h3 className="font-semibold text-base">{title}</h3>}
            {collapsible && (
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      
      {(!collapsible || isExpanded) && (
        <div className="p-4 space-y-4">{children}</div>
      )}
    </div>
  )
}

interface MobileFormFieldProps {
  children: React.ReactNode
  label?: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
}

/**
 * MobileFormField - Individual form field with label and error handling
 */
export function MobileFormField({
  children,
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
}: MobileFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {children}
      </div>
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

interface MobileFormActionsProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
}

// iOS Keyboard Detection Hook
function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Only run on iOS devices or where visualViewport is supported
    if (typeof window === 'undefined' || !('visualViewport' in window)) {
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    let initialHeight = visualViewport.height;

    const handleResize = () => {
      const currentHeight = visualViewport.height;
      const windowHeight = window.innerHeight;
      
      // If viewport height is significantly less than window height, keyboard is likely visible
      if (currentHeight < windowHeight * 0.75) {
        setIsKeyboardVisible(true);
        setKeyboardHeight(windowHeight - currentHeight);
      } else {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        initialHeight = currentHeight;
      }
    };

    // Handle scroll events (iOS sometimes triggers scroll instead of resize)
    const handleScroll = () => {
      // Give time for the viewport to settle
      setTimeout(handleResize, 100);
    };

    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleScroll);

    // Initial check
    handleResize();

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}

/**
 * MobileFormActions - Sticky action buttons for forms
 * 
 * Features:
 * - Uses position: sticky instead of fixed for better iOS keyboard handling
 * - Detects virtual keyboard visibility and adjusts accordingly
 * - Falls back to fixed positioning on non-supporting browsers
 */
export function MobileFormActions({
  children,
  className,
  sticky = true,
}: MobileFormActionsProps) {
  const { keyboardHeight, isKeyboardVisible } = useVirtualKeyboard();
  
  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4',
        sticky && [
          // Use sticky positioning instead of fixed for better iOS keyboard handling
          'sticky bottom-0 start-0 end-0 z-40',
          'bg-background/95 backdrop-blur-sm',
          'border-t px-4 py-4',
          'safe-area-bottom',
          // Add transition for smooth height adjustments
          'transition-all duration-200 ease-out',
        ],
        className
      )}
      style={{
        // When keyboard is visible, add bottom margin to avoid being covered
        marginBottom: isKeyboardVisible ? `${keyboardHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  )
}

interface MobileFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

/**
 * MobileFormInput - Pre-styled input for mobile forms
 */
export function MobileFormInput({
  label,
  error,
  hint,
  className,
  required,
  id,
  ...props
}: MobileFormInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <MobileFormField
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
    >
      <input
        id={inputId}
        className={cn(
          'flex w-full rounded-md border border-input bg-background',
          'px-4 py-3 text-base', /* 16px to prevent iOS zoom */
          'ring-offset-background file:border-0 file:bg-transparent',
          'file:text-sm file:font-medium placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    </MobileFormField>
  )
}

interface MobileFormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
}

/**
 * MobileFormSelect - Pre-styled select for mobile forms
 */
export function MobileFormSelect({
  label,
  error,
  hint,
  options,
  className,
  required,
  id,
  ...props
}: MobileFormSelectProps) {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <MobileFormField
      label={label}
      htmlFor={selectId}
      error={error}
      hint={hint}
      required={required}
    >
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'flex w-full rounded-md border border-input bg-background',
            'px-4 py-3 pe-10 text-base appearance-none',
            'ring-offset-background focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      </div>
    </MobileFormField>
  )
}

interface MobileFormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  rows?: number
}

/**
 * MobileFormTextarea - Pre-styled textarea for mobile forms
 */
export function MobileFormTextarea({
  label,
  error,
  hint,
  rows = 4,
  className,
  required,
  id,
  ...props
}: MobileFormTextareaProps) {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <MobileFormField
      label={label}
      htmlFor={textareaId}
      error={error}
      hint={hint}
      required={required}
    >
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          'flex w-full rounded-md border border-input bg-background',
          'px-4 py-3 text-base resize-none',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    </MobileFormField>
  )
}
