import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import type { AppRole } from '@/lib/constants'
import type { Permission } from '@/hooks/usePermissions'
import { getDashboardPathForRole } from './RoleBasedRedirect'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: AppRole[]
  requiredPermission?: Permission
  requiredPropertyId?: string
  requiredDepartmentId?: string
  fallbackPath?: string
  /**
   * If true, redirect to user's dashboard when role doesn't match
   * instead of /unauthorized
   */
  smartFallback?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
  requiredPropertyId,
  requiredDepartmentId,
  fallbackPath = "/unauthorized",
  smartFallback = true // Default to smart fallback for better UX
}: ProtectedRouteProps) {
  const { user, primaryRole, roles, loading } = useAuth()
  const { hasPermission } = usePermissions()

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

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    // If roles haven't loaded yet, wait by allowing access temporarily
    // The user will be redirected once roles load if they don't have access
    if (roles.length === 0) {
      // Allow rendering while roles are loading
      return <>{children}</>
    }

    // Roles have loaded - check if user has access
    if (primaryRole && !allowedRoles.includes(primaryRole)) {
      // Use smart fallback - redirect to user's correct dashboard
      if (smartFallback && primaryRole) {
        const correctDashboard = getDashboardPathForRole(primaryRole)
        return <Navigate to={correctDashboard} replace />
      }
      return <Navigate to={fallbackPath} replace />
    }
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission, requiredPropertyId, requiredDepartmentId)) {
    if (smartFallback && primaryRole) {
      const correctDashboard = getDashboardPathForRole(primaryRole)
      return <Navigate to={correctDashboard} replace />
    }
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}


