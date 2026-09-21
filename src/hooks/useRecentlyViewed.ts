/**
 * useRecentlyViewed Hook
 * 
 * Tracks and retrieves user's recently viewed Knowledge Base documents.
 * Uses localStorage for client-side tracking (no DB table needed).
 */

import { useAuth } from '@/hooks/useAuth'
import * as KnowledgeService from '@/services/knowledgeService'
import { useEffect } from 'react'

const STORAGE_KEY = 'kb_recently_viewed'
const MAX_ITEMS = 10

interface RecentlyViewedItem {
    id: string
    viewedAt: string
}

/**
 * Get recently viewed document IDs from localStorage
 */
function getStoredViews(userId: string): RecentlyViewedItem[] {
    try {
        const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
        return data ? JSON.parse(data) : []
    } catch {
        return []
    }
}

/**
 * Validate if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

/**
 * Save recently viewed document ID to localStorage
 */
function saveView(userId: string, documentId: string): void {
    // Validate UUID to prevent storing route segments like "new", "create", "edit"
    if (!isValidUUID(documentId)) {
        return
    }
    try {
        const existing = getStoredViews(userId)
        // Remove if already exists
        const filtered = existing.filter(item => item.id !== documentId)
        // Add to front
        const updated = [
            { id: documentId, viewedAt: new Date().toISOString() },
            ...filtered
        ].slice(0, MAX_ITEMS)
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated))
    } catch (e) {
        console.warn('Failed to save recently viewed:', e)
    }
}

/**
 * Hook to track document views
 */
export function useTrackView(documentId: string | undefined) {
    const { user } = useAuth()

    useEffect(() => {
        if (user?.id && documentId && isValidUUID(documentId)) {
            saveView(user.id, documentId)
            // Increment global view count
            KnowledgeService.incrementViewCount(documentId)
        }
    }, [user?.id, documentId])
}
