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
 */
import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'default' | 'destructive'

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

/**
 * Maps the Radix `variant` to the correct Sonner call.
 */
function fireToast(opts: ToastOptions): ToastReturn {
  const message = opts.title ?? ''
  const sonnerOpts = {
    description: opts.description,
    duration: opts.duration,
    action: opts.action
      ? { label: opts.action.label, onClick: opts.action.onClick }
      : undefined,
  }

  const id = opts.variant === 'destructive'
    ? sonnerToast.error(message, sonnerOpts)
    : sonnerToast(message, sonnerOpts)

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (newOpts: ToastOptions) => {
      const updatedMsg = newOpts.title ?? message
      const updatedSonnerOpts = {
        id,
        description: newOpts.description ?? opts.description,
        duration: newOpts.duration,
      }
      if ((newOpts.variant ?? opts.variant) === 'destructive') {
        sonnerToast.error(updatedMsg, updatedSonnerOpts)
      } else {
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
  }
}
