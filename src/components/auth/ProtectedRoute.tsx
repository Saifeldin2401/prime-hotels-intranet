import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { canRoleAccess, type Permission } from '@/features/access/policy'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { buildLoginUrl, setPostLoginRedirect } from '@/lib/authRedirect'
import type { AppRole } from '@/lib/constants'

import { PasswordEnforcementGuard } from './PasswordEnforcementGuard'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: AppRole[]
  requiredPermission?: Permission
  requiredPropertyId?: string
  requiredDepartmentId?: string
  fallbackPath?: string
  smartFallback?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
  requiredPropertyId,
  requiredDepartmentId,
  fallbackPath = '/unauthorized',
  smartFallback = true,
}: ProtectedRouteProps) {
  const { user, primaryRole, rolesLoading, loading } = useAuth()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation('common')
  const location = useLocation()

  // Save current location for post-login redirect when user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      setPostLoginRedirect(location.pathname, location.search, location.hash)
    }
  }, [user, loading, location])

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
    const loginUrl = buildLoginUrl(location.pathname, location.search, location.hash)
    return <Navigate to={loginUrl} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (rolesLoading || !primaryRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('status_options.verifying_access')}</p>
          </div>
        </div>
      )
    }

    if (!canRoleAccess(primaryRole, allowedRoles)) {
      if (smartFallback) {
        return <Navigate to="/dashboard" replace />
      }
      return <Navigate to={fallbackPath} replace />
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission, requiredPropertyId, requiredDepartmentId)) {
    if (smartFallback && primaryRole) {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to={fallbackPath} replace />
  }

  return (
    <PasswordEnforcementGuard>
      {children}
    </PasswordEnforcementGuard>
  )
}
