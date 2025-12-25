import { useCallback } from 'react'
import { analytics } from '@/services/analyticsService'
import type { AnalyticsEvents } from '@/types/analytics'

export function useAnalytics() {
    /**
     * Track a specific event
     */
    const track = useCallback((eventName: string | AnalyticsEvents, properties?: Record<string, any>, category?: string) => {
        analytics.track(eventName, properties, category)
    }, [])

    /**
     * Identify the user (call after login)
     */
    const identify = useCallback((userId: string) => {
        analytics.identify(userId)
    }, [])

    return {
        track,
        identify
    }
}
