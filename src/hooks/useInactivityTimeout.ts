import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UseInactivityTimeoutOptions {
    timeoutMs?: number
    warningMs?: number
    onTimeout?: () => void
    onWarning?: () => void
    enabled?: boolean
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const DEFAULT_WARNING_MS = 25 * 60 * 1000 // 25 minutes (5 min before timeout)

export function useInactivityTimeout({
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    onTimeout,
    onWarning,
    enabled = true
}: UseInactivityTimeoutOptions = {}) {
    const { user, signOut } = useAuth()
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(timeoutMs - warningMs)

    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const warningRef = useRef<NodeJS.Timeout | null>(null)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef(Date.now())

    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (warningRef.current) clearTimeout(warningRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
        timeoutRef.current = null
        warningRef.current = null
        countdownRef.current = null
    }, [])

    const handleTimeout = useCallback(async () => {
        clearAllTimers()
        setShowWarning(false)

        if (onTimeout) {
            onTimeout()
        } else {
            await signOut()
        }
    }, [clearAllTimers, onTimeout, signOut])

    const handleWarning = useCallback(() => {
        setShowWarning(true)
        setRemainingTime(timeoutMs - warningMs)

        // Start countdown
        countdownRef.current = setInterval(() => {
            setRemainingTime(prev => {
                if (prev <= 1000) {
                    return 0
                }
                return prev - 1000
            })
        }, 1000)

        if (onWarning) {
            onWarning()
        }
    }, [timeoutMs, warningMs, onWarning])

    const resetTimers = useCallback(() => {
        if (!enabled || !user) return

        clearAllTimers()
        setShowWarning(false)
        lastActivityRef.current = Date.now()

        // Set warning timer
        warningRef.current = setTimeout(handleWarning, warningMs)

        // Set timeout timer
        timeoutRef.current = setTimeout(handleTimeout, timeoutMs)
    }, [enabled, user, clearAllTimers, handleWarning, handleTimeout, warningMs, timeoutMs])

    const extendSession = useCallback(() => {
        resetTimers()
    }, [resetTimers])

    // Activity event handler
    const handleActivity = useCallback(() => {
        // Throttle: only reset if more than 1 second since last activity
        const now = Date.now()
        if (now - lastActivityRef.current > 1000) {
            resetTimers()
        }
    }, [resetTimers])

    useEffect(() => {
        if (!enabled || !user) {
            clearAllTimers()
            return
        }

        // Set up timers
        resetTimers()

        // Listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true })
        })

        return () => {
            clearAllTimers()
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
        }
    }, [enabled, user, resetTimers, handleActivity, clearAllTimers])

    return {
        showWarning,
        remainingTime,
        remainingMinutes: Math.ceil(remainingTime / 60000),
        remainingSeconds: Math.ceil(remainingTime / 1000),
        extendSession,
        signOutNow: handleTimeout
    }
}
