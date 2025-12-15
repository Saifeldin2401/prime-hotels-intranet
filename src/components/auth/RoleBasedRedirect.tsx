import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AppRole } from '@/lib/constants'

/**
 * Smart Role-Based Dashboard Routing
 * 
 * Maps each role to their appropriate dashboard:
 * - staff → /staff-dashboard
 * - department_head → /dashboard/department-head
 * - property_manager → /dashboard/property-manager  
 * - property_hr → /dashboard/property-hr
 * - regional_hr → /dashboard/regional-hr
 * - regional_admin → /dashboard/corporate-admin
 * 
 * Falls back to /dashboard for unknown roles
 */

const roleToDashboardPath: Record<AppRole, string> = {
    staff: '/staff-dashboard',
    department_head: '/dashboard/department-head',
    property_manager: '/dashboard/property-manager',
    property_hr: '/dashboard/property-hr',
    regional_hr: '/dashboard/regional-hr',
    regional_admin: '/dashboard/corporate-admin',
}

export function RoleBasedRedirect() {
    const { user, primaryRole, roles, loading } = useAuth()

    // Show loading while auth is loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Wait for roles to load (they load async after user is available)
    // Show loading spinner while waiting for roles
    if (roles.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Preparing your dashboard...</p>
                </div>
            </div>
        )
    }

    // Get the dashboard path for the user's primary role
    const dashboardPath = primaryRole
        ? (roleToDashboardPath[primaryRole as AppRole] || '/dashboard')
        : '/dashboard'

    console.log('RoleBasedRedirect: primaryRole =', primaryRole, '-> redirecting to', dashboardPath)

    return <Navigate to={dashboardPath} replace />
}

/**
 * Helper function to get dashboard path for a role
 * Useful for programmatic navigation
 */
export function getDashboardPathForRole(role: AppRole | string): string {
    return roleToDashboardPath[role as AppRole] || '/dashboard'
}


