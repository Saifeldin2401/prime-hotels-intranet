import { useTranslation } from 'react-i18next'
import { Toaster as SonnerToaster } from 'sonner'

/**
 * Enhanced Sonner-powered Toaster with premium PHG branding.
 * 
 * Replaces the unused Radix-based Toaster — all 44+ files use
 * Sonner's `toast()` function via toastHelpers, so this unifies
 * the rendering with proper theming.
 */
export function Toaster() {
    const { i18n } = useTranslation()
    const isRTL = i18n.dir() === 'rtl'

    return (
        <SonnerToaster
            position={isRTL ? 'bottom-left' : 'bottom-right'}
            dir={isRTL ? 'rtl' : 'ltr'}
            expand={false}
            richColors
            closeButton
            duration={4000}
            gap={8}
            toastOptions={{
                classNames: {
                    toast: 'group toast font-sans shadow-lg border rounded-xl px-4 py-3 text-sm',
                    title: 'font-semibold text-[14px]',
                    description: 'text-[13px] opacity-80',
                    actionButton: 'bg-[#0B1C3E] text-white hover:bg-[#1a3a6e] text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                    cancelButton: 'text-muted-foreground hover:text-foreground text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                    closeButton: 'opacity-0 group-hover:opacity-100 transition-opacity',
                    success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
                    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
                    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
                    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
                    loading: 'border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                }
            }}
        />
    )
}
