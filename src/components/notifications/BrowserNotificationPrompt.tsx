import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { Bell, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const PROMPT_DISMISSED_KEY = 'altus_notification_prompt_dismissed'
const PROMPT_DELAY_MS = 5000 // Show after 5 seconds on the page
const PROMPT_COOLDOWN_DAYS = 7 // Don't re-prompt for 7 days after dismissal

/**
 * BrowserNotificationPrompt
 * 
 * Automatically shows a floating prompt asking the user to enable
 * browser push notifications. The prompt appears:
 * - After the user is authenticated
 * - After a 5-second delay (so it doesn't interrupt page load)
 * - Only if browser Notification API is supported
 * - Only if permission is NOT already granted or permanently denied
 * - Only if user hasn't dismissed the prompt recently (7 day cooldown)
 * - Only if browser_push_enabled is not already true in their preferences
 */
export function BrowserNotificationPrompt() {
    const { user } = useAuth()
    const { preferences, updatePreferences } = useNotificationPreferences()
    const { t } = useTranslation('common')
    const navigate = useNavigate()

    const [visible, setVisible] = useState(false)
    const [animateIn, setAnimateIn] = useState(false)

    const shouldShowPrompt = useCallback((): boolean => {
        // Must be authenticated
        if (!user) return false

        // Browser must support Notification API
        if (!('Notification' in window)) return false

        // If already granted or explicitly denied, don't show
        if (Notification.permission === 'granted') return false
        if (Notification.permission === 'denied') return false

        // If user already enabled push in preferences, no need
        if (preferences?.browser_push_enabled) return false

        // Check cooldown
        try {
            const dismissedData = localStorage.getItem(PROMPT_DISMISSED_KEY)
            if (dismissedData) {
                const parsed = JSON.parse(dismissedData)
                const dismissedAt = new Date(parsed.dismissedAt).getTime()
                const cooldownMs = PROMPT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
                if (Date.now() - dismissedAt < cooldownMs) {
                    return false
                }
            }
        } catch {
            // Ignore storage errors
        }

        return true
    }, [user, preferences])

    useEffect(() => {
        if (!shouldShowPrompt()) return

        const timer = setTimeout(() => {
            setVisible(true)
            // Trigger animation after mount
            requestAnimationFrame(() => {
                setAnimateIn(true)
            })
        }, PROMPT_DELAY_MS)

        return () => clearTimeout(timer)
    }, [shouldShowPrompt])

    const handleDismiss = useCallback(() => {
        setAnimateIn(false)
        // Wait for animation to complete before unmounting
        setTimeout(() => {
            setVisible(false)
            // Store UI state (non-sensitive: dismissed timestamp and userId)
            // Using safe storage helper to prevent errors in restricted environments
            try {
                localStorage.setItem(PROMPT_DISMISSED_KEY, JSON.stringify({
                    dismissedAt: new Date().toISOString(),
                    userId: user?.id
                }))
            } catch {
                // Silently ignore storage errors (e.g., private mode, quota exceeded)
                // This is acceptable as this is non-critical UI state data
            }
        }, 300)
    }, [user])

    const handleEnable = useCallback(async () => {
        try {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                // Update the user's preferences to enable browser push
                updatePreferences.mutate({
                    browser_push_enabled: true,
                    approval_push: true,
                    training_push: true,
                    announcement_push: true,
                    maintenance_push: true,
                })

                toast.success(t('notification_prompt.enabled_success'))

                // Close prompt
                setAnimateIn(false)
                setTimeout(() => setVisible(false), 300)
            } else if (permission === 'denied') {
                toast.error(t('notification_prompt.denied_message'))
                handleDismiss()
            } else {
                // 'default' means the browser dismissed the prompt without choosing
                handleDismiss()
            }
        } catch {
            toast.error(t('notification_prompt.error'))
            handleDismiss()
        }
    }, [updatePreferences, t, handleDismiss])

    const handleGoToSettings = useCallback(() => {
        handleDismiss()
        navigate('/settings')
    }, [handleDismiss, navigate])

    if (!visible) return null

    return (
        <div
            className={`
        fixed bottom-6 end-6 z-[100] max-w-sm w-full
        transition-all duration-300 ease-out
        ${animateIn
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-4 scale-95'
                }
      `}
        >
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-white dark:bg-hotel-navy shadow-2xl shadow-black/10 dark:shadow-black/30">
                {/* Top accent gradient */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-hotel-gold via-amber-400 to-hotel-gold" />

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 end-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label={t('action.close')}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-5 pt-6">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-hotel-gold/20 to-amber-500/20 dark:from-hotel-gold/30 dark:to-amber-500/30 flex items-center justify-center ring-1 ring-hotel-gold/20">
                            <Bell className="h-6 w-6 text-hotel-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                {t('notification_prompt.title')}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {t('notification_prompt.description')}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                        <Button
                            onClick={handleEnable}
                            size="sm"
                            className="flex-1 bg-hotel-gold hover:bg-hotel-gold/90 text-hotel-dark font-medium text-xs h-9"
                        >
                            <Bell className="h-3.5 w-3.5 me-1.5" />
                            {t('notification_prompt.enable_button')}
                        </Button>
                        <Button
                            onClick={handleGoToSettings}
                            size="sm"
                            variant="outline"
                            className="text-xs h-9 px-3"
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            size="sm"
                            variant="ghost"
                            className="text-xs h-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            {t('notification_prompt.dismiss_button')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
