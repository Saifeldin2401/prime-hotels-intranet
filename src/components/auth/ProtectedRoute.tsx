import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { ROLES, type AppRole } from '@/lib/constants'
import type { Permission } from '@/hooks/usePermissions'
import { getDashboardPathForRole } from './RoleBasedRedirect'
import { PasswordEnforcementGuard } from './PasswordEnforcementGuard'

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
  const { user, primaryRole, roles, rolesLoading, loading } = useAuth()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation('common')

  const roleAllowed = (role: AppRole, allowed: AppRole[]) => {
    if (allowed.includes(role)) return true
    const currentLevel = ROLES[role]?.level ?? Number.MAX_SAFE_INTEGER
    return allowed.some((allowedRole) => {
      const allowedLevel = ROLES[allowedRole]?.level ?? Number.MAX_SAFE_INTEGER
      return currentLevel <= allowedLevel
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('status.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    // If roles are still loading or not resolved, show loading state to prevent unauthorized access
    if (rolesLoading || !primaryRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('status.verifying_access')}</p>
          </div>
        </div>
      )
    }

    // Roles have loaded - check if user has access
    if (primaryRole && !roleAllowed(primaryRole, allowedRoles)) {
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

  return (
    <PasswordEnforcementGuard>
      {children}
    </PasswordEnforcementGuard>
  )
}


