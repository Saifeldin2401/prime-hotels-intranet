/**
 * usePullToRefresh Hook
 * 
 * Provides pull-to-refresh functionality for mobile devices.
 * Detects overscroll at top of page and triggers refresh callback.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>
    threshold?: number // minimum pull distance to trigger refresh (default 80px)
    resistance?: number // resistance factor (higher = harder to pull, default 2.5)
    enabled?: boolean
}

interface UsePullToRefreshReturn {
    isPulling: boolean
    isRefreshing: boolean
    pullDistance: number
    pullProgress: number // 0 to 1, capped at 1
}

export function usePullToRefresh({
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
    const [isPulling, setIsPulling] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)

    const startY = useRef(0)
    const currentY = useRef(0)

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!enabled || isRefreshing) return
        if (window.scrollY !== 0) return // only at top of page

        startY.current = e.touches[0].clientY
        setIsPulling(true)
    }, [enabled, isRefreshing])

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling || isRefreshing) return

        currentY.current = e.touches[0].clientY
        const diff = currentY.current - startY.current

        if (diff > 0) {
            // Apply resistance to make it harder to pull
            const distance = Math.min(diff / resistance, threshold * 1.5)
            setPullDistance(distance)

            // Prevent default scroll when pulling
            if (window.scrollY === 0 && diff > 0) {
                e.preventDefault()
            }
        }
    }, [isPulling, isRefreshing, resistance, threshold])

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return

        if (pullDistance >= threshold) {
            setIsRefreshing(true)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
            }
        }

        setIsPulling(false)
        setPullDistance(0)
        startY.current = 0
        currentY.current = 0
    }, [isPulling, pullDistance, threshold, onRefresh])

    useEffect(() => {
        if (!enabled) return

        const options: AddEventListenerOptions = { passive: false }

        document.addEventListener('touchstart', handleTouchStart, options)
        document.addEventListener('touchmove', handleTouchMove, options)
        document.addEventListener('touchend', handleTouchEnd)

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

    return {
        isPulling,
        isRefreshing,
        pullDistance,
        pullProgress: Math.min(pullDistance / threshold, 1)
    }
}
