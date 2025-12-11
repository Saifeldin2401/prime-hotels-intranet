import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EnhancedInput } from './enhanced-input'
import { EnhancedButton } from './enhanced-button'
import { EnhancedBadge } from './enhanced-badge'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  helperText?: string
  children: ReactNode
}

export function FormField({ label, required, error, helperText, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

interface FormProgressProps {
  steps: Array<{
    id: string
    title: string
    status: 'completed' | 'current' | 'pending'
  }>
  currentStep: number
}

export function FormProgress({ steps, currentStep }: FormProgressProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step.status === 'completed' && 'bg-green-500 text-white',
                step.status === 'current' && 'bg-primary text-primary-foreground',
                step.status === 'pending' && 'bg-gray-200 text-gray-500'
              )}
            >
              {step.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                'ml-2 text-sm font-medium',
                step.status === 'completed' && 'text-green-600',
                step.status === 'current' && 'text-primary',
                step.status === 'pending' && 'text-gray-500'
              )}
            >
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 mx-4',
                step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

interface FormActionsProps {
  onCancel?: () => void
  onSubmit?: () => void
  loading?: boolean
  disabled?: boolean
  cancelLabel?: string
  submitLabel?: string
  submitVariant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'gold' | 'navy'
}

export function FormActions({
  onCancel,
  onSubmit,
  loading = false,
  disabled = false,
  cancelLabel = 'Cancel',
  submitLabel = 'Submit',
  submitVariant = 'primary'
}: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-6 border-t">
      {onCancel && (
        <EnhancedButton
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </EnhancedButton>
      )}
      <EnhancedButton
        variant={submitVariant}
        onClick={onSubmit}
        loading={loading}
        disabled={disabled || loading}
      >
        {submitLabel}
      </EnhancedButton>
    </div>
  )
}

interface FormStatusProps {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onDismiss?: () => void
}

export function FormStatus({ type, message, onDismiss }: FormStatusProps) {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const icons = {
    success: <CheckCircle2 className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    info: <AlertCircle className="h-4 w-4" />
  }

  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg border',
      typeStyles[type]
    )}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}

interface ValidationSummaryProps {
  errors: string[]
  onDismiss?: () => void
}

export function ValidationSummary({ errors, onDismiss }: ValidationSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

interface FormContainerProps {
  title?: string
  description?: string
  children: ReactNode
  loading?: boolean
  className?: string
}

export function FormContainer({ title, description, children, loading, className }: FormContainerProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border', className)}>
      {(title || description) && (
        <div className="px-6 py-4 border-b">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
