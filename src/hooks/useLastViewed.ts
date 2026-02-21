/**
 * useLastViewed Hook
 * 
 * Tracks when the user last viewed specific content using localStorage.
 * Used to show "Updated since last view" badges.
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'prime_kb_last_viewed'

interface LastViewedMap {
    [documentId: string]: string // ISO timestamp
}

export function useLastViewed(userId?: string) {
    const [lastViewedMap, setLastViewedMap] = useState<LastViewedMap>({})
    const [isLoaded, setIsLoaded] = useState(false)
    const storageKey = userId ? `${STORAGE_KEY}_${userId}` : `${STORAGE_KEY}_anon`

    // Load from localStorage on mount
    useEffect(() => {
        setIsLoaded(false)
        try {
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                setLastViewedMap(JSON.parse(stored))
            } else {
                setLastViewedMap({})
            }
        } catch (e) {
            console.warn('Failed to load last viewed data:', e)
            setLastViewedMap({})
        }
        setIsLoaded(true)
    }, [storageKey])

    // Save to localStorage when map changes
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(lastViewedMap))
            } catch (e) {
                console.warn('Failed to save last viewed data:', e)
            }
        }
    }, [lastViewedMap, isLoaded, storageKey])

    /**
     * Get the last viewed timestamp for a document
     */
    const getLastViewed = useCallback((documentId: string): Date | null => {
        const timestamp = lastViewedMap[documentId]
        return timestamp ? new Date(timestamp) : null
    }, [lastViewedMap])

    /**
     * Check if document has been updated since last view
     */
    const hasBeenUpdatedSinceLastView = useCallback((
        documentId: string,
        updatedAt: string | Date
    ): boolean => {
        const lastViewed = getLastViewed(documentId)
        if (!lastViewed) return false // First time viewing

        const updateDate = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt
        return updateDate > lastViewed
    }, [getLastViewed])

    /**
     * Mark a document as viewed now
     */
    const markAsViewed = useCallback((documentId: string) => {
        setLastViewedMap(prev => ({
            ...prev,
            [documentId]: new Date().toISOString()
        }))
    }, [])

    /**
     * Get formatted "time since" string for last view
     */
    const getTimeSinceLastView = useCallback((documentId: string): string | null => {
        const lastViewed = getLastViewed(documentId)
        if (!lastViewed) return null

        const now = new Date()
        const diffMs = now.getTime() - lastViewed.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 30) return `${diffDays}d ago`
        return lastViewed.toLocaleDateString()
    }, [getLastViewed])

    return {
        getLastViewed,
        hasBeenUpdatedSinceLastView,
        markAsViewed,
        getTimeSinceLastView,
        isLoaded
    }
}

export default useLastViewed
