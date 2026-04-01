import { useAuth } from '@/hooks/useAuth';
import { getRedirectFromSearch } from '@/lib/authRedirect';
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Unified Dashboard Routing
 *
 * All roles land on /dashboard, which renders role-specific content.
 */
export function RoleBasedRedirect() {
    const { t: t_ext } = useTranslation('extracted');
    const { user, loading, rolesLoading } = useAuth()
    const location = useLocation()
    const redirectPath = getRedirectFromSearch(location.search)

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
        const loginUrl = redirectPath
            ? `/login?redirect=${encodeURIComponent(redirectPath)}`
            : '/login'
        return <Navigate to={loginUrl} replace />
    }

    // Wait for roles to load
    // We strictly wait for rolesLoading to be false.
    // AuthContext now has a safety timeout internally, so we don't need a second one here.
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

    // Always redirect to unified dashboard (or preserved deep link)
    return <Navigate to={redirectPath ?? "/dashboard"} replace />
}

// Note: getDashboardPathForRole function removed from this file to fix fast refresh warning.
// It now always returns '/dashboard' and is inlined in ProtectedRoute.tsx where needed.
