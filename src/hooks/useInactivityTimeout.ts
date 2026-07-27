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

const STORAGE_KEY = 'prime_last_activity'

export function useInactivityTimeout({
    timeoutMs: customTimeoutMs,
    warningMs: customWarningMs,
    onTimeout,
    onWarning,
    enabled = true
}: UseInactivityTimeoutOptions = {}) {
    const { sessionTimeoutMinutes } = useSecuritySettings()

    const timeoutMs = customTimeoutMs ?? sessionTimeoutMinutes * 60 * 1000
    const warningMs = customWarningMs ?? Math.max(0, timeoutMs - 5 * 60 * 1000)

    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [showWarning, setShowWarning] = useState(false)
    const [remainingTime, setRemainingTime] = useState(timeoutMs - warningMs)

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastActivityRef = useRef(0)

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
        localStorage.removeItem(STORAGE_KEY)

        if (onTimeout) {
            onTimeout()
            return
        }

        // Before logging out, verify the session is actually expired server-side.
        // On mobile, timers are suspended during backgrounding — the user may have
        // been active on another tab or the session may have been refreshed.
        try {
            const { data, error } = await supabase.auth.getUser()
            if (error || !data?.user) {
                // Session truly expired — proceed with logout
                await signOut()
                navigate('/login')
            } else {
                // Session is still valid — try refreshing activity from other tabs
                const otherTabActivity = localStorage.getItem(STORAGE_KEY)
                if (otherTabActivity) {
                    const elapsed = Date.now() - parseInt(otherTabActivity, 10)
                    if (elapsed < timeoutMs) {
                        // Another tab was active — don't log out, just reset timers
                        // This will be handled by the visibility change handler
                        return
                    }
                }
                // User genuinely inactive but session valid — still log them out for security
                await signOut()
                navigate('/login')
            }
        } catch {
            // Network error — don't logout, user might just have flaky connection
            // Re-check when network is available
            if (import.meta.env.DEV) {
                console.warn('[InactivityTimeout] Network error during session check, deferring logout')
            }
        }
    }, [clearAllTimers, onTimeout, signOut, navigate, timeoutMs])

    const handleWarning = useCallback(() => {
        const now = Date.now()
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || now.toString(), 10)
        const elapsed = now - lastActivity

        // If we already passed the warning threshold but haven't timed out yet
        if (elapsed >= warningMs && elapsed < timeoutMs) {
            setShowWarning(true)
            const remaining = Math.max(0, timeoutMs - elapsed)
            setRemainingTime(remaining)

            if (!countdownRef.current) {
                countdownRef.current = setInterval(() => {
                    setRemainingTime(prev => {
                        if (prev <= 1000) {
                            if (countdownRef.current) {
                                clearInterval(countdownRef.current)
                                countdownRef.current = null
                            }
                            return 0
                        }
                        return prev - 1000
                    })
                }, 1000)
            }

            if (onWarning) {
                onWarning()
            }
        } else if (elapsed >= timeoutMs) {
            handleTimeout()
        }
    }, [timeoutMs, warningMs, onWarning, handleTimeout])

    const resetTimers = useCallback((isExternalUpdate = false) => {
        if (!enabled || !user) return

        clearAllTimers()
        setShowWarning(false)

        const now = Date.now()
        if (!isExternalUpdate) {
            localStorage.setItem(STORAGE_KEY, now.toString())
        }
        lastActivityRef.current = now

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
        // Throttle: only reset if more than 1 second since last activity or if warning is showing
        const now = Date.now()
        if (showWarning || now - lastActivityRef.current > 1000) {
            resetTimers()
        }
    }, [resetTimers, showWarning])

    useEffect(() => {
        if (!enabled || !user) {
            clearAllTimers()
            return
        }

        // Initialize last activity if not present
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, Date.now().toString())
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // When hidden, we don't clear timers because we want the background timeout to fire
                // if the tab stays open in the background.
                return
            }

            // Returning to the tab: check if we timed out while away.
            // Use a small delay on mobile to let localStorage sync from other tabs
            // and network to stabilize after backgrounding.
            const checkAfterResume = () => {
                const now = Date.now()
                const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || now.toString(), 10)
                const elapsed = now - lastActivity

                if (elapsed >= timeoutMs) {
                    handleTimeout()
                } else if (elapsed >= warningMs) {
                    handleWarning()
                } else {
                    // Not even in warning zone, just reset timers based on the synchronized last activity
                    resetTimers(true)
                }
            }

            // Brief delay allows localStorage cross-tab sync to complete
            setTimeout(checkAfterResume, 100)
        }

        // Listen for activity in other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                // Activity happened in another tab
                resetTimers(true)
            }
        }

        // Set up timers after effect commit to avoid synchronous state updates in effect body.
        const initTimerId = window.setTimeout(() => {
            resetTimers(true)
        }, 0)

        // Listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true })
        })
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            clearTimeout(initTimerId)
            clearAllTimers()
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [enabled, user, resetTimers, handleActivity, clearAllTimers, handleTimeout, handleWarning, timeoutMs, warningMs])

    return {
        showWarning,
        remainingTime,
        remainingMinutes: Math.ceil(remainingTime / 60000),
        remainingSeconds: Math.ceil(remainingTime / 1000),
        extendSession,
        signOutNow: handleTimeout
    }
}
