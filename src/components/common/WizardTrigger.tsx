/**
 * WizardTrigger Component
 * 
 * Automatically triggers the new user onboarding wizard when needed.
 * Uses polling to detect when wizard should start (after password change redirect).
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTour } from '@/hooks/useTour'
import {
    getTourStepsForRole,
    shouldShowWizard,
    markWizardCompleted
} from '@/config/newUserTour'

// Pages where wizard should NOT start
const EXCLUDED_PATHS = ['/change-password', '/login', '/forgot-password', '/reset-password']

export function WizardTrigger() {
    const { user, primaryRole } = useAuth()
    const location = useLocation()
    const userId = user?.id
    const wizardStarted = useRef(false)
    const [checkCounter, setCheckCounter] = useState(0)

    // Get role-specific tour steps
    const tourSteps = getTourStepsForRole(primaryRole)
    const { startTour } = useTour(tourSteps)

    // Poll for wizard state changes (handles the case where pending is set after mount)
    useEffect(() => {
        const interval = setInterval(() => {
            setCheckCounter(c => c + 1)
        }, 500) // Check every 500ms

        // Stop polling after 10 seconds
        const timeout = setTimeout(() => {
            clearInterval(interval)
        }, 10000)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [])

    // Check and trigger wizard
    useEffect(() => {
        // Don't start wizard on excluded pages (auth pages)
        const isExcludedPath = EXCLUDED_PATHS.some(p => location.pathname.startsWith(p))
        if (isExcludedPath || !userId || wizardStarted.current) return

        const shouldShow = shouldShowWizard(userId)

        console.log('🔍 WizardTrigger check:', {
            shouldShow,
            started: wizardStarted.current,
            userId,
            primaryRole,
            path: location.pathname,
            pendingFlag: localStorage.getItem('prime_wizard_pending')
        })

        if (shouldShow) {
            wizardStarted.current = true

            // Delay to let the page render
            setTimeout(() => {
                // Double-check we're not on an excluded page before starting
                const stillExcluded = EXCLUDED_PATHS.some(p => window.location.pathname.startsWith(p))
                if (stillExcluded) {
                    console.log('⚠️ Wizard cancelled - still on excluded page:', window.location.pathname)
                    wizardStarted.current = false // Reset so it can try again
                    return
                }

                console.log('🎯 Starting new user wizard for user:', userId)
                startTour()
                markWizardCompleted(userId)
            }, 1000)
        }
    }, [userId, primaryRole, checkCounter, startTour, location.pathname])

    return null
}
