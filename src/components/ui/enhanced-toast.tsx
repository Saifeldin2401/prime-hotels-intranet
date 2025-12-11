import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EnhancedButton } from './enhanced-button'
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  X,
  Loader2
} from 'lucide-react'

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  icon?: ReactNode
}

export function Toast({
  id,
  title,
  description,
  variant = 'info',
  duration = 5000,
  action,
  onDismiss,
  icon
}: ToastProps) {
  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    loading: 'bg-gray-50 border-gray-200 text-gray-800'
  }

  const defaultIcons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    loading: <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
  }

  return (
    <div
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right-5 fade-in-0',
        variantStyles[variant]
      )}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex-shrink-0">
        {icon || defaultIcons[variant]}
      </div>
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-semibold mb-1">{title}</h4>
        )}
        {description && (
          <p className="text-sm opacity-90">{description}</p>
        )}
        {action && (
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={action.onClick}
            className="mt-2 h-auto p-0 text-current underline hover:no-underline"
          >
            {action.label}
          </EnhancedButton>
        )}
      </div>

      {onDismiss && (
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="flex-shrink-0 h-6 w-6 p-0 opacity-70 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </EnhancedButton>
      )}

      {duration && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 animate-pulse" />
      )}
    </div>
  )
}

interface ToastProviderProps {
  children: ReactNode
}

interface ToastContextType {
  toast: (props: Omit<ToastProps, 'id' | 'onDismiss'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

export function createToastContext() {
  const toasts = new Map<string, ToastProps>()
  let listeners: (() => void)[] = []

  const subscribe = (listener: () => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }

  const notifyListeners = () => {
    listeners.forEach(listener => listener())
  }

  const toast = (props: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toastProps: ToastProps = {
      ...props,
      id,
      onDismiss: () => dismiss(id)
    }
    
    toasts.set(id, toastProps)
    notifyListeners()

    if (props.duration && props.duration > 0) {
      setTimeout(() => dismiss(id), props.duration)
    }

    return id
  }

  const dismiss = (id: string) => {
    toasts.delete(id)
    notifyListeners()
  }

  const dismissAll = () => {
    toasts.clear()
    notifyListeners()
  }

  const getAll = () => Array.from(toasts.values())

  return {
    subscribe,
    toast,
    dismiss,
    dismissAll,
    getAll
  }
}

const toastContext = createToastContext()

export function ToastProvider({ children }: ToastProviderProps) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  
  React.useEffect(() => {
    return toastContext.subscribe(() => forceUpdate())
  }, [])

  const toasts = toastContext.getAll()

  return (
    <>
      {children}
      <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </>
  )
}

export function useToast() {
  return {
    toast: toastContext.toast,
    dismiss: toastContext.dismiss,
    dismissAll: toastContext.dismissAll
  }
}

// Convenience functions for common toast types
export const toast = {
  success: (title: string, description?: string) => 
    toastContext.toast({ title, description, variant: 'success' }),
  
  error: (title: string, description?: string) => 
    toastContext.toast({ title, description, variant: 'error', duration: 10000 }),
  
  warning: (title: string, description?: string) => 
    toastContext.toast({ title, description, variant: 'warning' }),
  
  info: (title: string, description?: string) => 
    toastContext.toast({ title, description, variant: 'info' }),
  
  loading: (title: string, description?: string) => 
    toastContext.toast({ title, description, variant: 'loading', duration: 0 }),
  
  action: (title: string, action: { label: string; onClick: () => void }, description?: string) =>
    toastContext.toast({ title, description, action, variant: 'info' })
}
