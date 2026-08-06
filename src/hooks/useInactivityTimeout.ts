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

const STORAGE_KEY = 'altus_last_activity'

export function useInactivityTimeout({
    timeoutMs: customTimeoutMs,
    warningMs: customWarningMs,
    onTimeout,
    onWarning,
    enabled = true
}: UseInactivityTimeoutOptions = {}) {
    const { sessionTimeoutMinutes } = useSecuritySettings()

    // Default: 30 minute timeout if setting is undefined, warning shows 2 minutes before timeout
    const defaultTimeoutMs = (sessionTimeoutMinutes && sessionTimeoutMinutes > 0 ? sessionTimeoutMinutes : 30) * 60 * 1000
    const timeoutMs = customTimeoutMs ?? defaultTimeoutMs
    const warningMs = customWarningMs ?? Math.max(10000, timeoutMs - 2 * 60 * 1000)

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

        if (!user) return

        // Verify multi-tab activity before logging out
        const lastActivityStr = localStorage.getItem(STORAGE_KEY)
        if (lastActivityStr) {
            const elapsed = Date.now() - parseInt(lastActivityStr, 10)
            if (elapsed < timeoutMs - 5000) {
                // User was active in another tab within the timeout window — do not log out
                return
            }
        }

        // Clean up storage key
        localStorage.removeItem(STORAGE_KEY)

        if (onTimeout) {
            onTimeout()
            return
        }

        try {
            await signOut()
            navigate('/login', { replace: true })
        } catch (err) {
            console.error('[InactivityTimeout] Error signing out on timeout:', err)
        }
    }, [user, clearAllTimers, onTimeout, signOut, navigate, timeoutMs])

    const handleWarning = useCallback(() => {
        if (!user) return

        const now = Date.now()
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || now.toString(), 10)
        const elapsed = now - lastActivity

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
            void handleTimeout()
        }
    }, [user, timeoutMs, warningMs, onWarning, handleTimeout])

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
        warningRef.current = setTimeout(handleWarning, Math.max(1000, warningMs))

        // Set timeout timer
        timeoutRef.current = setTimeout(handleTimeout, Math.max(5000, timeoutMs))
    }, [enabled, user, clearAllTimers, handleWarning, handleTimeout, warningMs, timeoutMs])

    const extendSession = useCallback(async () => {
        try {
            await supabase.auth.refreshSession()
        } catch {
            // Ignore background refresh errors
        }
        resetTimers()
    }, [resetTimers])

    // Activity event handler with 5-second throttle
    const handleActivity = useCallback(() => {
        if (!enabled || !user) return
        const now = Date.now()
        if (showWarning || now - lastActivityRef.current > 5000) {
            resetTimers()
        }
    }, [enabled, user, resetTimers, showWarning])

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
                return
            }

            // Tab became visible — check elapsed inactivity time
            const now = Date.now()
            const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || now.toString(), 10)
            const elapsed = now - lastActivity

            if (elapsed >= timeoutMs) {
                void handleTimeout()
            } else if (elapsed >= warningMs) {
                handleWarning()
            } else {
                resetTimers(true)
            }
        }

        // Listen for activity in other browser tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                resetTimers(true)
            }
        }

        // Start timers
        resetTimers(true)

        // User activity listeners
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true })
        })
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
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
        remainingMinutes: Math.max(0, Math.ceil(remainingTime / 60000)),
        remainingSeconds: Math.max(0, Math.ceil(remainingTime / 1000)),
        extendSession,
        signOutNow: handleTimeout
    }
}
