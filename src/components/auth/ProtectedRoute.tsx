import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import type { AppRole } from '@/lib/constants'
import type { Permission } from '@/hooks/usePermissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: AppRole[]
  requiredPermission?: Permission
  requiredPropertyId?: string
  requiredDepartmentId?: string
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requiredPermission,
  requiredPropertyId,
  requiredDepartmentId,
  fallbackPath = "/unauthorized"
}: ProtectedRouteProps) {
  const { user, primaryRole, loading } = useAuth()
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
  if (allowedRoles && primaryRole && !allowedRoles.includes(primaryRole)) {
    return <Navigate to={fallbackPath} replace />
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission, requiredPropertyId, requiredDepartmentId)) {
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

