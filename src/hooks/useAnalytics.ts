import { analytics } from '@/services/analyticsService'
import type { AnalyticsEvents } from '@/types/analytics'
import { useCallback } from 'react'

export function useAnalytics() {
    /**
     * Track a specific event
     */
    const track = useCallback((eventName: string | AnalyticsEvents, properties?, category?: string) => {
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
