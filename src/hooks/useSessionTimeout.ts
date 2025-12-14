import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UseSessionTimeoutOptions {
    timeoutMs?: number      // Total inactivity time before logout (default: 30 min)
    warningMs?: number      // Time before timeout to show warning (default: 5 min)
    onWarning?: () => void  // Callback when warning should show
    onTimeout?: () => void  // Callback when timeout occurs
    enabled?: boolean       // Whether timeout is enabled
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000  // 30 minutes
const DEFAULT_WARNING_MS = 5 * 60 * 1000   // 5 minutes before timeout

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        warningMs = DEFAULT_WARNING_MS,
        onWarning,
        onTimeout,
        enabled = true
    } = options

    const { user, signOut } = useAuth()
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(warningMs)

    const lastActivityRef = useRef(Date.now())
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Reset activity timestamp
    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now()
        setShowWarning(false)
        setRemainingTime(warningMs)
    }, [warningMs])

    // Extend session (called when user clicks "Stay Logged In")
    const extendSession = useCallback(() => {
        resetActivity()
    }, [resetActivity])

    // Handle timeout - logout user
    const handleTimeout = useCallback(() => {
        if (onTimeout) {
            onTimeout()
        }
        signOut()
    }, [onTimeout, signOut])

    // Handle warning - show warning modal
    const handleWarning = useCallback(() => {
        setShowWarning(true)
        if (onWarning) {
            onWarning()
        }

        // Start countdown
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current
            const remaining = Math.max(0, timeoutMs - elapsed)
            setRemainingTime(remaining)

            if (remaining <= 0) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                }
            }
        }, 1000)
    }, [onWarning, timeoutMs])

    // Setup activity listeners
    useEffect(() => {
        if (!enabled || !user) return

        const warningTime = timeoutMs - warningMs

        // Schedule warning
        const scheduleWarning = () => {
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current)
            }
            warningTimeoutRef.current = setTimeout(() => {
                handleWarning()
            }, warningTime)
        }

        // Schedule logout
        const scheduleLogout = () => {
            if (logoutTimeoutRef.current) {
                clearTimeout(logoutTimeoutRef.current)
            }
            logoutTimeoutRef.current = setTimeout(() => {
                handleTimeout()
            }, timeoutMs)
        }

        // Activity handler
        const handleActivity = () => {
            resetActivity()
            scheduleWarning()
            scheduleLogout()
        }

        // Activity events to monitor
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']

        // Debounced activity handler
        let activityTimeout: NodeJS.Timeout | null = null
        const debouncedActivity = () => {
            if (activityTimeout) return
            activityTimeout = setTimeout(() => {
                handleActivity()
                activityTimeout = null
            }, 1000)
        }

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, debouncedActivity, { passive: true })
        })

        // Initial schedule
        scheduleWarning()
        scheduleLogout()

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, debouncedActivity)
            })
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current)
            }
            if (logoutTimeoutRef.current) {
                clearTimeout(logoutTimeoutRef.current)
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            if (activityTimeout) {
                clearTimeout(activityTimeout)
            }
        }
    }, [enabled, user, timeoutMs, warningMs, handleWarning, handleTimeout, resetActivity])

    // Format remaining time for display
    const formatRemainingTime = useCallback((ms: number) => {
        const minutes = Math.floor(ms / 60000)
        const seconds = Math.floor((ms % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }, [])

    return {
        showWarning,
        remainingTime,
        remainingTimeFormatted: formatRemainingTime(remainingTime),
        extendSession,
        logout: handleTimeout
    }
}
