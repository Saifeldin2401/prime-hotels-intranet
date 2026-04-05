import { useAuth } from '@/hooks/useAuth';
import { getRedirectFromSearch, consumePostLoginRedirect } from '@/lib/authRedirect';
import { getAuthFlowRedirectPath, clearAuthFlowState } from '@/lib/authFlowState';
import { useEffect, useMemo } from 'react';
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Unified Dashboard Routing
 *
 * All roles land on /dashboard, which renders role-specific content.
 * This component handles post-login redirects including deep links.
 */
export function RoleBasedRedirect() {
    const { t: t_ext } = useTranslation('extracted');
    const { user, loading, rolesLoading } = useAuth()
    const location = useLocation()
    
    // Compute destination synchronously
    const destination = useMemo(() => {
        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        const urlRedirect = getRedirectFromSearch(location.search)
        const sessionRedirect = consumePostLoginRedirect()
        
        // Priority: auth flow > URL param > session storage > default
        return pendingAuthFlowPath ?? urlRedirect ?? sessionRedirect ?? "/dashboard"
    }, [location.search, user])

    // Clear auth flow state after computing destination
    useEffect(() => {
        if (user && getAuthFlowRedirectPath()) {
            clearAuthFlowState()
        }
    }, [user])

    // Show loading while auth is loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t_ext('loading', 'Loading...')}</p>
                </div>
            </div>
        )
    }

    if (!user) {
        const redirectPath = getRedirectFromSearch(location.search)
        const loginUrl = redirectPath
            ? `/login?redirect=${encodeURIComponent(redirectPath)}`
            : '/login'
        return <Navigate to={loginUrl} replace />
    }

    // Wait for roles to load
    if (rolesLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t_ext('preparing_your_dashboard', 'Preparing your dashboard...')}</p>
                </div>
            </div>
        )
    }

    // Navigate to computed destination
    return <Navigate to={destination} replace />
}
