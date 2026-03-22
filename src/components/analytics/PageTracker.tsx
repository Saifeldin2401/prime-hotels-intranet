import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEvents } from '@/types/analytics'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function PageTracker() {
    const location = useLocation()
    const { track } = useAnalytics()

    useEffect(() => {
        track(AnalyticsEvents.PAGE_VIEW, {
            path: location.pathname,
            search: location.search,
            title: document.title,
            referrer: document.referrer
        }, 'navigation')
    }, [location, track])

    return null
}
