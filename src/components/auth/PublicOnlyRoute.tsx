import { useAuth } from '@/hooks/useAuth'
import { getRedirectFromSearch } from '@/lib/authRedirect'
import { getAuthFlowRedirectPath, clearAuthFlowState } from '@/lib/authFlowState'
import { useEffect, useRef } from 'react'
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from 'react-router-dom'

interface PublicOnlyRouteProps {
    children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
    const { user, loading } = useAuth()
    const location = useLocation()
    const { t } = useTranslation('extracted');
    const hasRedirected = useRef(false)
    
    // Get redirect path from query params
    const redirectPath = getRedirectFromSearch(location.search)
    
    // Compute destination
    const destination = (() => {
        if (!user) return null
        
        // Priority: 1. Auth flow paths (reset-password, complete-invite)
        //          2. Redirect from query param (deep link preservation)
        //          3. Default to /home (which redirects to /dashboard)
        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        
        if (pendingAuthFlowPath) {
            return pendingAuthFlowPath
        } else if (redirectPath) {
            return redirectPath
        }
        return '/home'
    })()
    
    // Clear auth flow state and track redirect
    useEffect(() => {
        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        if (user && pendingAuthFlowPath && !hasRedirected.current) {
            clearAuthFlowState()
        }
        if (user && destination && !hasRedirected.current) {
            hasRedirected.current = true
        }
    }, [user, destination])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t('loading', 'Loading...')}</p>
                </div>
            </div>
        )
    }

    if (user && destination) {
        return <Navigate to={destination} replace />
    }

    return <>{children}</>
}
