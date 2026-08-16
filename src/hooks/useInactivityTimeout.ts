import { useAuth } from '@/hooks/useAuth'
import { useSecuritySettings } from '@/hooks/useSystemSettings'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UseInactivityTimeoutOptions {
    timeoutMs?: number
    warningMs?: number
    onTimeout?: () => void
    onWarning?: () => void
    enabled?: boolean
}

export const STORAGE_KEY = 'altus_last_activity'
export const REMEMBER_ME_KEY = 'altus_remember_me'

export function useInactivityTimeout({
    timeoutMs: customTimeoutMs,
    warningMs: customWarningMs,
    onTimeout,
    onWarning,
    enabled = true
}: UseInactivityTimeoutOptions = {}) {
    const { sessionTimeoutMinutes } = useSecuritySettings()

    // Default timeout from security settings (default 30 min)
    const timeoutMinutes = (sessionTimeoutMinutes && sessionTimeoutMinutes > 0) ? sessionTimeoutMinutes : 30
    const defaultTimeoutMs = timeoutMinutes * 60 * 1000
    const timeoutMs = customTimeoutMs ?? defaultTimeoutMs

    // Warning lead time: 2 minutes, or 50% of total timeout if timeout is <= 2 minutes (min 10s)
    const warningLeadTimeMs = customWarningMs !== undefined
        ? Math.max(1000, timeoutMs - customWarningMs)
        : Math.min(2 * 60 * 1000, Math.max(10_000, timeoutMs / 2))
    const warningMs = customWarningMs ?? Math.max(5000, timeoutMs - warningLeadTimeMs)

    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(warningLeadTimeMs)

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastActivityRef = useRef<number>(Date.now())
    const showWarningRef = useRef<boolean>(false)

    // Keep showWarningRef in sync with showWarning state
    useEffect(() => {
        showWarningRef.current = showWarning
    }, [showWarning])

    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
        if (warningRef.current) {
            clearTimeout(warningRef.current)
            warningRef.current = null
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
        }
    }, [])

    const handleTimeout = useCallback(async () => {
        clearAllTimers()
        setShowWarning(false)

        if (!user) return

        // Verify multi-tab activity before logging out
        try {
            const lastActivityStr = localStorage.getItem(STORAGE_KEY)
            if (lastActivityStr) {
                const lastActivity = parseInt(lastActivityStr, 10)
                const elapsed = Date.now() - lastActivity
                if (elapsed < timeoutMs - 3000) {
                    // User was active in another tab within the timeout window — reschedule timers
                    return
                }
            }
        } catch {
            // Ignore storage errors
        }

        // Clean up activity storage key
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            // Ignore
        }

        if (onTimeout) {
            onTimeout()
            return
        }

        try {
            await signOut()
            navigate('/login?reason=timeout', { replace: true })
        } catch (err) {
            console.error('[InactivityTimeout] Error signing out on timeout:', err)
            navigate('/login?reason=timeout', { replace: true })
        }
    }, [user, clearAllTimers, timeoutMs, onTimeout, signOut, navigate])

    const startCountdown = useCallback((targetLastActivity: number) => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
        }

        const updateCountdown = () => {
            const now = Date.now()
            let effectiveLastActivity = targetLastActivity
            try {
                const stored = localStorage.getItem(STORAGE_KEY)
                if (stored) {
                    effectiveLastActivity = Math.max(targetLastActivity, parseInt(stored, 10))
                }
            } catch {
                // Ignore
            }

            const elapsed = now - effectiveLastActivity
            const remaining = Math.max(0, timeoutMs - elapsed)
            setRemainingTime(remaining)

            if (remaining <= 0) {
                if (countdownRef.current) {
                    clearInterval(countdownRef.current)
                    countdownRef.current = null
                }
                void handleTimeout()
            }
        }

        updateCountdown()
        countdownRef.current = setInterval(updateCountdown, 1000)
    }, [timeoutMs, handleTimeout])

    const handleWarning = useCallback(() => {
        if (!user || !enabled) return

        const now = Date.now()
        let lastActivity = lastActivityRef.current
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                lastActivity = parseInt(stored, 10)
            }
        } catch {
            // Ignore
        }

        const elapsed = now - lastActivity

        if (elapsed >= timeoutMs) {
            void handleTimeout()
        } else if (elapsed >= warningMs) {
            setShowWarning(true)
            startCountdown(lastActivity)
            if (onWarning) {
                onWarning()
            }
        }
    }, [user, enabled, timeoutMs, warningMs, handleTimeout, startCountdown, onWarning])

    const scheduleTimers = useCallback(() => {
        if (!enabled || !user) {
            clearAllTimers()
            setShowWarning(false)
            return
        }

        clearAllTimers()

        const now = Date.now()
        let lastActivity = lastActivityRef.current
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                lastActivity = parseInt(stored, 10)
            }
        } catch {
            // Ignore
        }

        const elapsed = now - lastActivity

        if (elapsed >= timeoutMs) {
            void handleTimeout()
            return
        }

        if (elapsed >= warningMs) {
            setShowWarning(true)
            startCountdown(lastActivity)
            return
        }

        // Reschedule warning and timeout for remaining durations
        const timeUntilWarning = Math.max(1000, warningMs - elapsed)
        const timeUntilTimeout = Math.max(5000, timeoutMs - elapsed)

        warningRef.current = setTimeout(handleWarning, timeUntilWarning)
        timeoutRef.current = setTimeout(handleTimeout, timeUntilTimeout)
    }, [enabled, user, clearAllTimers, timeoutMs, warningMs, handleTimeout, handleWarning, startCountdown])

    const extendSession = useCallback(async () => {
        try {
            await supabase.auth.refreshSession()
        } catch {
            // Ignore background refresh errors
        }

        const now = Date.now()
        lastActivityRef.current = now
        try {
            localStorage.setItem(STORAGE_KEY, now.toString())
        } catch {
            // Ignore
        }

        setShowWarning(false)
        scheduleTimers()
    }, [scheduleTimers])

    // User activity listener with 3-second throttle
    const handleActivity = useCallback(() => {
        if (!enabled || !user) return

        // While warning modal is active, background movements shouldn't secretly dismiss it.
        // The user must explicitly choose "Stay Signed In" or "Sign Out Now" on the modal.
        if (showWarningRef.current) return

        const now = Date.now()
        if (now - lastActivityRef.current > 3000) {
            lastActivityRef.current = now
            try {
                localStorage.setItem(STORAGE_KEY, now.toString())
            } catch {
                // Ignore
            }
            scheduleTimers()
        }
    }, [enabled, user, scheduleTimers])

    useEffect(() => {
        if (!enabled || !user) {
            clearAllTimers()
            setShowWarning(false)
            return
        }

        const now = Date.now()
        lastActivityRef.current = now
        try {
            localStorage.setItem(STORAGE_KEY, now.toString())
        } catch {
            // Ignore
        }

        scheduleTimers()

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                scheduleTimers()
            }
        }

        // Listen for activity in other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const otherTabActivity = parseInt(e.newValue, 10)
                if (!isNaN(otherTabActivity)) {
                    lastActivityRef.current = otherTabActivity
                    if (showWarningRef.current) {
                        setShowWarning(false)
                    }
                    scheduleTimers()
                }
            }
        }

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true })
        })
        document.addEventListener('visibilitychange', handleVisibilityOrFocus)
        window.addEventListener('focus', handleVisibilityOrFocus)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            clearAllTimers()
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
            window.removeEventListener('focus', handleVisibilityOrFocus)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [enabled, user, scheduleTimers, handleActivity, clearAllTimers])

    return {
        showWarning,
        remainingTime,
        remainingMinutes: Math.max(0, Math.floor(remainingTime / 60000)),
        remainingSeconds: Math.max(0, Math.ceil(remainingTime / 1000)),
        extendSession,
        signOutNow: handleTimeout
    }
}

