/**
 * useToast – Sonner-backed shim for Radix-style useToast() callers.
 *
 * The codebase has two toast APIs:
 *   1. `toast` from 'sonner'  – used in ~44 files
 *   2. `const { toast } = useToast()` – used in ~50 files
 *
 * Both now proxy through Sonner so a single <Toaster> renders everything.
 * The hook API is identical to the old Radix implementation so every
 * existing call site works without modification.
 * 
 * MOBILE ENHANCEMENTS:
 * - Haptic feedback on toast display
 * - Mobile-optimized positioning
 * - Better touch targets
 */
import { toast as sonnerToast } from 'sonner'
import React from 'react'
import { 
    CheckCircle2, 
    AlertCircle, 
    AlertTriangle, 
    Info 
} from 'lucide-react'

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastReturn = {
  id: string | number
  dismiss: () => void
  update: (opts: ToastOptions) => void
}

// Haptic feedback helper
const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [30, 100, 30]
        }
        navigator.vibrate(patterns[type])
    }
}

// Icon mapping for different variants
const variantIcons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    default: undefined
}

/**
 * Maps the Radix `variant` to the correct Sonner call.
 */
function fireToast(opts: ToastOptions): ToastReturn {
  const message = opts.title ?? ''
  
  // Haptic feedback based on variant
  if (opts.variant === 'destructive' || opts.variant === 'error') {
    haptic('error')
  } else if (opts.variant === 'success') {
    haptic('success')
  } else if (opts.variant === 'warning') {
    haptic('medium')
  } else {
    haptic('light')
  }
  
  const sonnerOpts = {
    description: opts.description,
    duration: opts.duration,
    icon: variantIcons[opts.variant || 'default'],
    action: opts.action
      ? { label: opts.action.label, onClick: opts.action.onClick }
      : undefined,
  }

  let id: string | number
  
  switch (opts.variant) {
    case 'success':
      id = sonnerToast.success(message, sonnerOpts)
      break
    case 'destructive':
    case 'error':
      id = sonnerToast.error(message, sonnerOpts)
      break
    case 'warning':
      id = sonnerToast.warning(message, sonnerOpts)
      break
    case 'info':
      id = sonnerToast.info(message, sonnerOpts)
      break
    default:
      id = sonnerToast(message, sonnerOpts)
  }

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (newOpts: ToastOptions) => {
      const updatedMsg = newOpts.title ?? message
      const updatedSonnerOpts = {
        id,
        description: newOpts.description ?? opts.description,
        duration: newOpts.duration,
        icon: variantIcons[newOpts.variant || opts.variant || 'default'],
      }
      
      switch (newOpts.variant || opts.variant) {
        case 'success':
          sonnerToast.success(updatedMsg, updatedSonnerOpts)
          break
        case 'destructive':
        case 'error':
          sonnerToast.error(updatedMsg, updatedSonnerOpts)
          break
        case 'warning':
          sonnerToast.warning(updatedMsg, updatedSonnerOpts)
          break
        case 'info':
          sonnerToast.info(updatedMsg, updatedSonnerOpts)
          break
        default:
          sonnerToast(updatedMsg, updatedSonnerOpts)
      }
    },
  }
}

/** Drop-in replacement for the Radix `toast()` standalone function */
export function toast(opts: ToastOptions): ToastReturn {
  return fireToast(opts)
}

/** Drop-in replacement for the Radix `useToast()` hook */
export function useToast() {
  return {
    toast: (opts: ToastOptions) => fireToast(opts),
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    toasts: [] as ToastOptions[], // kept for API compat; Sonner manages its own state
    
    // Mobile-optimized helpers
    success: (title: string, description?: string) => 
        fireToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) => 
        fireToast({ title, description, variant: 'destructive' }),
    warning: (title: string, description?: string) => 
        fireToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) => 
        fireToast({ title, description, variant: 'info' }),
  }
}
