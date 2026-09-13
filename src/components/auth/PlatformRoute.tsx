import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'

import { useAccountContext } from '@/hooks/useAccountContext'
import { useAuth } from '@/hooks/useAuth'
import { buildLoginUrl, setPostLoginRedirect } from '@/lib/authRedirect'
import type { PlatformPermission, PlatformRole } from '@/lib/types/platform'

import { PasswordEnforcementGuard } from './PasswordEnforcementGuard'

interface PlatformRouteProps {
  children: ReactNode
  /** Require a specific platform role (system_owner / platform_admin imply lower). */
  requiredPlatformRole?: PlatformRole
  /** Require a specific coarse platform permission. */
  requiredPermission?: PlatformPermission
  /** Require an active break-glass tenant session (for pages that operate inside a tenant). */
  requireActiveSession?: boolean
}

/**
 * Gate for the Platform Control Center (`/platform/*`). Authorization is the
 * platform-operator identity model (platform_users / platform_role_assignments),
 * resolved server-side — NOT the tenant `app_role` list. RLS is still the real
 * boundary; this only decides what UI to render.
 */
export function PlatformRoute({
  children,
  requiredPlatformRole,
  requiredPermission,
  requireActiveSession,
}: PlatformRouteProps) {
  const { user, loading } = useAuth()
  const account = useAccountContext()
  const { t } = useTranslation('common')
  const location = useLocation()

  useEffect(() => {
    if (!user && !loading) {
      setPostLoginRedirect(location.pathname, location.search, location.hash)
    }
  }, [user, loading, location.pathname, location.search, location.hash])

  if (loading || (user && account.loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('status_options.verifying_access', 'Verifying access…')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
  }

  if (!account.isPlatformOperator) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredPlatformRole && !account.hasPlatformRole(requiredPlatformRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (requiredPermission && !account.can(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (requireActiveSession && !account.activePlatformSession) {
    return <Navigate to="/platform" replace />
  }

  return <PasswordEnforcementGuard>{children}</PasswordEnforcementGuard>
}
