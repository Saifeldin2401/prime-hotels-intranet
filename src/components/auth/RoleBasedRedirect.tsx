import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AppRole } from '@/lib/constants'
import { useState, useEffect } from 'react'

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
 * Falls back to /staff-dashboard for unknown roles or timeout
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
    const [timedOut, setTimedOut] = useState(false)

    // Timeout after 3 seconds to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            if (roles.length === 0) {
                console.warn('RoleBasedRedirect: Timeout waiting for roles, using fallback')
                setTimedOut(true)
            }
        }, 3000)

        return () => clearTimeout(timer)
    }, [roles.length])

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

    // Wait for roles to load, but not forever
    if (roles.length === 0 && !timedOut) {
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
    // Default to staff-dashboard if no roles (after timeout or genuinely no roles)
    const dashboardPath = primaryRole
        ? (roleToDashboardPath[primaryRole as AppRole] || '/staff-dashboard')
        : '/staff-dashboard'

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


