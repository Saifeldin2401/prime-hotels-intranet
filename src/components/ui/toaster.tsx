import { useTranslation } from 'react-i18next'
import { Toaster as SonnerToaster } from 'sonner'

/**
 * Enhanced Sonner-powered Toaster with premium mobile-first design.
 * 
 * Mobile Enhancements:
 * - Full-width toasts on mobile for better readability
 * - Larger touch targets for close buttons
 * - Enhanced swipe gestures
 * - Improved typography and spacing
 * - Better color contrast
 * - Smooth animations optimized for mobile
 */
export function Toaster() {
    const { i18n } = useTranslation()
    const isRTL = i18n.dir() === 'rtl'

    return (
        <SonnerToaster
            position={isRTL ? 'bottom-center' : 'bottom-center'}
            dir={isRTL ? 'rtl' : 'ltr'}
            expand={false}
            richColors
            closeButton
            duration={4000}
            gap={12}
            visibleToasts={3}
            toastOptions={{
                classNames: {
                    // Base toast styling - mobile optimized
                    toast: `
                        group toast 
                        font-sans 
                        shadow-xl 
                        border 
                        rounded-2xl 
                        px-4 py-4 
                        text-sm 
                        w-full 
                        max-w-[calc(100vw-2rem)]
                        sm:max-w-[400px]
                        min-h-[64px]
                        flex items-center gap-3
                        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
                        data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
                        data-[swipe=cancel]:translate-x-0
                        data-[swipe=end]:animate-swipe-out
                    `,
                    // Title styling
                    title: `
                        font-semibold 
                        text-[15px] 
                        leading-tight
                        line-clamp-2
                    `,
                    // Description styling
                    description: `
                        text-[13px] 
                        opacity-85
                        leading-relaxed
                        line-clamp-2
                        mt-0.5
                    `,
                    // Action button styling
                    actionButton: `
                        bg-[#0B1C3E] 
                        text-white 
                        hover:bg-[#1a3a6e] 
                        text-xs 
                        font-semibold 
                        px-4 
                        py-2 
                        rounded-lg 
                        transition-all
                        active:scale-95
                        touch-target
                        min-h-[36px]
                    `,
                    // Cancel button styling
                    cancelButton: `
                        text-muted-foreground 
                        hover:text-foreground 
                        text-xs 
                        font-medium 
                        px-3 
                        py-2 
                        rounded-lg 
                        transition-colors
                        touch-target
                    `,
                    // Close button - larger for mobile touch
                    closeButton: `
                        opacity-0 
                        group-hover:opacity-100 
                        transition-opacity
                        absolute
                        top-2
                        right-2
                        p-2
                        rounded-full
                        hover:bg-black/5
                        dark:hover:bg-white/10
                        touch-target
                        min-h-[36px]
                        min-w-[36px]
                        flex items-center justify-center
                    `,
                    // Success variant - enhanced
                    success: `
                        border-green-200 
                        bg-green-50 
                        text-green-900 
                        dark:border-green-800 
                        dark:bg-green-950 
                        dark:text-green-100
                        shadow-green-500/10
                    `,
                    // Error variant - enhanced
                    error: `
                        border-red-200 
                        bg-red-50 
                        text-red-900 
                        dark:border-red-800 
                        dark:bg-red-950 
                        dark:text-red-100
                        shadow-red-500/10
                    `,
                    // Warning variant - enhanced
                    warning: `
                        border-amber-200 
                        bg-amber-50 
                        text-amber-900 
                        dark:border-amber-800 
                        dark:bg-amber-950 
                        dark:text-amber-100
                        shadow-amber-500/10
                    `,
                    // Info variant - enhanced
                    info: `
                        border-blue-200 
                        bg-blue-50 
                        text-blue-900 
                        dark:border-blue-800 
                        dark:bg-blue-950 
                        dark:text-blue-100
                        shadow-blue-500/10
                    `,
                    // Loading variant
                    loading: `
                        border-gray-200 
                        bg-gray-50 
                        text-gray-900 
                        dark:border-gray-700 
                        dark:bg-gray-900 
                        dark:text-gray-100
                    `,
                }
            }}

        />
    )
}
