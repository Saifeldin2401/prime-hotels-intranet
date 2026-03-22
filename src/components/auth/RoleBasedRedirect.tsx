import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/lib/constants';
import { useTranslation } from "react-i18next";
import { Navigate } from 'react-router-dom';

/**
 * Unified Dashboard Routing
 *
 * All roles land on /dashboard, which renders role-specific content.
 */
export function RoleBasedRedirect() {
    const { t: t_ext } = useTranslation('extracted');
    const { user, loading, rolesLoading } = useAuth()

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
        return <Navigate to="/login" replace />
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

    // Always redirect to unified dashboard
    return <Navigate to="/dashboard" replace />
}

/**
 * Helper function to get dashboard path for a role
 * Useful for programmatic navigation
 */
export function getDashboardPathForRole(_role: AppRole | string): string {
    return '/dashboard'
}
