import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { Label } from '@/components/ui/label'
import { useFormField } from '@/hooks/useFormField'

// Form context and provider
const FormContext = React.createContext<{
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  setFieldError: (field: string, error: string | undefined) => void
  clearFieldError: (field: string) => void
}>({
  errors: {},
  touched: {},
  isSubmitting: false,
  setFieldError: () => { },
  clearFieldError: () => { }
})

// Form component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
  errors?: Record<string, string>
  touched?: Record<string, boolean>
  isSubmitting?: boolean
  setFieldError?: (field: string, error: string | undefined) => void
  clearFieldError?: (field: string) => void
}

const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, errors = {}, touched = {}, isSubmitting = false, setFieldError, clearFieldError, children, ...props }, ref) => {
    return (
      <FormContext.Provider value={{ errors, touched, isSubmitting, setFieldError: setFieldError || (() => { }), clearFieldError: clearFieldError || (() => { }) }}>
        <form
          ref={ref}
          className={cn('space-y-6', className)}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    )
  }
)
Form.displayName = 'Form'

// Form field component
interface FormFieldContextValue {
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue>({
  name: ''
})

const FormField = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    name: string
  }
>(({ name, className, children, ...props }, ref) => {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </FormFieldContext.Provider>
  )
})
FormField.displayName = 'FormField'

// Form item component
const FormItem = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('space-y-2', className)} {...props} />
  }
)
FormItem.displayName = 'FormItem'

// Form label component
const FormLabel = forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error } = useFormField()
  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      {...props}
    />
  )
})
FormLabel.displayName = 'FormLabel'

// Form control component
const FormControl = forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = 'FormControl'

// Form description component
const FormDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
})
FormDescription.displayName = 'FormDescription'

// Form message component (for errors and success messages)
const FormMessage = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    variant?: 'error' | 'success'
  }
>(({ className, variant = 'error', children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = variant === 'error' ? error : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        'text-sm',
        variant === 'error' ? 'text-destructive' : 'text-green-600',
        className
      )}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

// Form success message component
const FormSuccess = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) {
    return null
  }

  return (
    <p
      ref={ref}
      className={cn('text-sm text-green-600', className)}
      {...props}
    >
      {children}
    </p>
  )
})
FormSuccess.displayName = 'FormSuccess'

// Form error component
const FormError = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) {
    return null
  }

  return (
    <p
      ref={ref}
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {children}
    </p>
  )
})
FormError.displayName = 'FormError'

// Form submit button component
interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean
  submittingText?: string
  children: React.ReactNode
}

const FormSubmitButton = forwardRef<HTMLButtonElement, FormSubmitButtonProps>(
  ({ className, isSubmitting = false, submittingText = 'Submitting...', children, disabled, ...props }, ref) => {
    const { isSubmitting: contextIsSubmitting } = React.useContext(FormContext)
    const currentlySubmitting = isSubmitting || contextIsSubmitting

    return (
      <button
        ref={ref}
        type="submit"
        disabled={disabled || currentlySubmitting}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground bg-primary text-primary-foreground hover:bg-hotel-navy h-10 px-4 py-2',
          className
        )}
        {...props}
      >
        {currentlySubmitting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
            {submittingText}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
FormSubmitButton.displayName = 'FormSubmitButton'

// Form actions component (for buttons at the bottom of forms)
interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'space-between'
}

const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = 'right', children, ...props }, ref) => {
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      'space-between': 'justify-between'
    }

    return (
      <div
        ref={ref}
        className={cn('flex gap-2', alignClasses[align], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormActions.displayName = 'FormActions'

// Form section component (for grouping related fields)
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const FormSection = forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, collapsible = false, defaultCollapsed = false, children, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

    return (
      <div ref={ref} className={cn('space-y-4', className)} {...props}>
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{title}</h3>
                {collapsible && (
                  <button
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                )}
              </div>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {!collapsible || !isCollapsed ? (
          <div className="space-y-4">{children}</div>
        ) : null}
      </div>
    )
  }
)
FormSection.displayName = 'FormSection'

// Form fieldset component
interface FormFieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string
  disabled?: boolean
}

const FormFieldset = forwardRef<HTMLFieldSetElement, FormFieldsetProps>(
  ({ className, legend, disabled = false, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        disabled={disabled}
        className={cn('space-y-4 rounded-lg border p-4', className)}
        {...props}
      >
        {legend && (
          <legend className="text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {legend}
          </legend>
        )}
        {children}
      </fieldset>
    )
  }
)
FormFieldset.displayName = 'FormFieldset'

// Form progress indicator (for multi-step forms)
interface FormProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep: number
  totalSteps: number
  showLabels?: boolean
  stepLabels?: string[]
}

const FormProgress = forwardRef<HTMLDivElement, FormProgressProps>(
  ({ className, currentStep, totalSteps, showLabels = false, stepLabels, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }, (_, index) => (
            <React.Fragment key={index}>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                  index <= currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        {showLabels && stepLabels && (
          <div className="flex justify-between">
            {stepLabels.map((label, index) => (
              <div
                key={index}
                className={cn(
                  'text-xs',
                  index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
FormProgress.displayName = 'FormProgress'

// Form summary component (for displaying form validation summary)
interface FormSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  errors?: Record<string, string>
  showOnlyOnSubmit?: boolean
  isSubmitted?: boolean
}

const FormSummary = forwardRef<HTMLDivElement, FormSummaryProps>(
  ({ className, errors = {}, showOnlyOnSubmit = true, isSubmitted = false, ...props }, ref) => {
    const errorCount = Object.keys(errors).length

    if (errorCount === 0 || (showOnlyOnSubmit && !isSubmitted)) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-md border border-destructive/20 bg-destructive/5 p-3', className)}
        {...props}
      >
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full bg-destructive" />
          <h4 className="text-sm font-medium text-destructive">
            Please correct the following {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </h4>
        </div>
        <ul className="mt-2 text-sm text-destructive list-disc list-inside space-y-1">
          {Object.entries(errors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      </div>
    )
  }
)
FormSummary.displayName = 'FormSummary'

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSuccess,
  FormError,
  FormField,
  FormFieldContext,
  FormContext,
  FormSubmitButton,
  FormActions,
  FormSection,
  FormFieldset,
  FormProgress,
  FormSummary
}
