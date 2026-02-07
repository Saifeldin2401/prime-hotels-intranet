import React, { useEffect, useRef, useState, useCallback } from 'react'

interface SmartObserverProps {
    onFocusChange?: (isFocused: boolean) => void
    onIdleChange?: (isIdle: boolean) => void
    idleTimeoutMs?: number
    className?: string
    children: React.ReactNode
}

/**
 * SmartObserver
 * Wraps content to monitor user engagement:
 * - Detects Tab/Window focus
 * - Detects User Idleness (no mouse/keyboard)
 */
export const SmartObserver: React.FC<SmartObserverProps> = ({
    onFocusChange,
    onIdleChange,
    idleTimeoutMs = 60000, // Default 1 minute
    className,
    children
}) => {
    const [isFocused, setIsFocused] = useState(true)
    const [isIdle, setIsIdle] = useState(false)
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    // --- Focus Detection ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            const focused = document.visibilityState === 'visible'
            setIsFocused(focused)
            onFocusChange?.(focused)
        }

        const handleWindowFocus = () => {
            setIsFocused(true)
            onFocusChange?.(true)
        }

        const handleWindowBlur = () => {
            setIsFocused(false)
            onFocusChange?.(false)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)
        window.addEventListener('blur', handleWindowBlur)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
            window.removeEventListener('blur', handleWindowBlur)
        }
    }, [onFocusChange])

    // --- Idle Detection ---
    const resetIdleTimer = useCallback(() => {
        lastActivityRef.current = Date.now()
        if (isIdle) {
            setIsIdle(false)
            onIdleChange?.(false)
        }

        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current)
        }

        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true)
            onIdleChange?.(true)
        }, idleTimeoutMs)
    }, [idleTimeoutMs, isIdle, onIdleChange])

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']

        // Throttle the event listeners to avoid performance hit
        let throttled = false
        const handleActivity = () => {
            if (!throttled) {
                resetIdleTimer()
                throttled = true
                setTimeout(() => throttled = false, 1000)
            }
        }

        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })

        // Start initial timer
        resetIdleTimer()

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current)
            }
        }
    }, [resetIdleTimer])

    return (
        <div className={className}>
            {children}
        </div>
    )
}
