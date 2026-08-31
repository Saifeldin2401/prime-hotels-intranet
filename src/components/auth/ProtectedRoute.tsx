import type { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useUserData } from '@/contexts/auth'
import { useAccountContext } from '@/hooks/useAccountContext'
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
  const { rolesError, loadUserData } = useUserData()
  const account = useAccountContext()
  const { hasPermission } = usePermissions()
  const { t } = useTranslation('common')
  const location = useLocation()

  // Save current location for post-login redirect when user is not authenticated
  useEffect(() => {
    if (!user && !loading) {
      setPostLoginRedirect(location.pathname, location.search, location.hash)
    }
  }, [user, loading, location.pathname, location.search, location.hash])

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

  // A tenant user whose every organization is suspended/archived is held on the
  // suspension screen. Platform operators are exempt.
  if (
    !account.loading &&
    account.allOrgsSuspended &&
    !account.isPlatformOperator &&
    location.pathname !== '/suspended'
  ) {
    return <Navigate to="/suspended" replace />
  }

  // This route's access decision depends on primaryRole - wait for it to resolve before
  // evaluating either the allowedRoles or requiredPermission branch below.
  const dependsOnRole = (allowedRoles && allowedRoles.length > 0) || !!requiredPermission
  const isResolvingRole = rolesLoading || (!!user && primaryRole === null && !rolesError)

  if (dependsOnRole && isResolvingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('status_options.verifying_access')}</p>
        </div>
      </div>
    )
  }

  // A definitive load failure (query error or exhausted timeout) is not the same state as
  // "still loading" - treating it as loading forever left the user on a permanent spinner with
  // no way out but a manual reload (REL-01). Surface it as an explicit, retryable error instead.
  if (dependsOnRole && rolesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-sm px-4">
          <p className="text-foreground font-medium">{t('status_options.verify_access_failed', 'We couldn\'t verify your access')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{rolesError}</p>
          <button
            type="button"
            onClick={() => { void loadUserData(user.id) }}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('actions.retry', 'Retry')}
          </button>
        </div>
      </div>
    )
  }

  // A platform operator who has opened an audited tenant session is legitimately
  // acting inside that org — let them through org-scoped guards without loosening
  // the role check for anyone else.
  const operatorInSession = account.isPlatformOperator && !!account.activePlatformSession

  if (allowedRoles && allowedRoles.length > 0) {
    if (!canRoleAccess(primaryRole, allowedRoles) && !operatorInSession) {
      if (smartFallback && primaryRole) {
        return <Navigate to="/dashboard" replace />
      }
      return <Navigate to={fallbackPath} replace />
    }
  }

  if (
    requiredPermission &&
    !hasPermission(requiredPermission, requiredPropertyId, requiredDepartmentId) &&
    !operatorInSession
  ) {
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
