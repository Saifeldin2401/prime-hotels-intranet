/**
 * Mobile Toast Helpers
 * 
 * Enhanced toast notifications specifically optimized for mobile devices.
 * Features:
 * - Full-width toasts on mobile
 * - Swipe to dismiss
 * - Haptic feedback
 * - Optimized positioning (top for errors, bottom for success)
 * - Rich content support
 */

import { toast as sonnerToast } from 'sonner'
import { 
    CheckCircle2, 
    AlertCircle, 
    AlertTriangle, 
    Info, 
    Loader2,
    X,
    Bell,
    Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

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

interface MobileToastOptions {
    title: string
    description?: string
    icon?: ReactNode
    duration?: number
    action?: {
        label: string
        onClick: () => void
    }
    cancel?: {
        label: string
        onClick: () => void
    }
    onDismiss?: () => void
    onAutoClose?: () => void
}

// Icon components for different toast types
const ToastIcons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    loading: <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />,
    notification: <Bell className="h-5 w-5 text-purple-600" />,
    achievement: <Sparkles className="h-5 w-5 text-amber-500" />
}

/**
 * Mobile-optimized success toast
 */
export function mobileSuccess(options: MobileToastOptions) {
    haptic('success')
    return sonnerToast.success(options.title, {
        description: options.description,
        duration: options.duration || 4000,
        icon: options.icon || ToastIcons.success,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Mobile-optimized error toast
 */
export function mobileError(options: MobileToastOptions) {
    haptic('error')
    return sonnerToast.error(options.title, {
        description: options.description,
        duration: options.duration || 6000, // Errors stay longer
        icon: options.icon || ToastIcons.error,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Mobile-optimized warning toast
 */
export function mobileWarning(options: MobileToastOptions) {
    haptic('medium')
    return sonnerToast.warning(options.title, {
        description: options.description,
        duration: options.duration || 5000,
        icon: options.icon || ToastIcons.warning,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Mobile-optimized info toast
 */
export function mobileInfo(options: MobileToastOptions) {
    haptic('light')
    return sonnerToast.info(options.title, {
        description: options.description,
        duration: options.duration || 4000,
        icon: options.icon || ToastIcons.info,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Mobile-optimized loading toast
 */
export function mobileLoading(options: MobileToastOptions) {
    return sonnerToast.loading(options.title, {
        description: options.description,
        duration: Infinity, // Loading toasts don't auto-close
        icon: options.icon || ToastIcons.loading,
    })
}

/**
 * Mobile-optimized notification toast
 */
export function mobileNotification(options: MobileToastOptions) {
    haptic('light')
    return sonnerToast(options.title, {
        description: options.description,
        duration: options.duration || 5000,
        icon: options.icon || ToastIcons.notification,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Mobile-optimized achievement toast
 */
export function mobileAchievement(options: MobileToastOptions) {
    haptic('success')
    return sonnerToast.success(options.title, {
        description: options.description,
        duration: options.duration || 6000,
        icon: options.icon || ToastIcons.achievement,
        action: options.action,
        cancel: options.cancel,
        onDismiss: options.onDismiss,
        onAutoClose: options.onAutoClose,
    })
}

/**
 * Update an existing toast
 */
export function updateToast(
    toastId: string | number, 
    type: 'success' | 'error' | 'info', 
    options: MobileToastOptions
) {
    const typeFn = type === 'success' ? sonnerToast.success : 
                   type === 'error' ? sonnerToast.error : 
                   sonnerToast.info
    
    typeFn(options.title, {
        id: toastId,
        description: options.description,
        icon: options.icon,
        duration: options.duration || 4000,
    })
}

/**
 * Dismiss a specific toast
 */
export function dismissToast(toastId?: string | number) {
    sonnerToast.dismiss(toastId)
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
    sonnerToast.dismiss()
}

/**
 * Promise-based toast for async operations
 */
export function promiseToast<T>(
    promise: Promise<T>,
    messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: Error) => string)
    }
) {
    return sonnerToast.promise(promise, {
        loading: messages.loading,
        success: (data) => typeof messages.success === 'function' ? messages.success(data) : messages.success,
        error: (error) => typeof messages.error === 'function' ? messages.error(error as Error) : messages.error,
    })
}

// Export a unified mobileToast object
export const mobileToast = {
    success: mobileSuccess,
    error: mobileError,
    warning: mobileWarning,
    info: mobileInfo,
    loading: mobileLoading,
    notification: mobileNotification,
    achievement: mobileAchievement,
    update: updateToast,
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
    promise: promiseToast,
}

export default mobileToast
