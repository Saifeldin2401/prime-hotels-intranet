import { PageTracker } from '@/components/analytics/PageTracker'
import { MaintenanceGuard } from '@/components/common/MaintenanceGuard'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useAccountContext } from '@/hooks/useAccountContext'
import { useAuth } from '@/hooks/useAuth'
import {
    buildLoginUrl,
    consumePostLoginRedirect,
    getRedirectFromSearch,
    getSpaRedirectFromSearch,
} from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { safeLocalStorage } from '@/lib/storage'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom'

const NotFound = lazy(() => import('@/pages/NotFound'))

export const RootLayout = () => {
    const { loading } = useAuth()

    if (loading) {
        return <PageSkeleton />
    }

    return (
        <NotificationProvider>
            <PageTracker />
            <MaintenanceGuard>
                <Suspense fallback={<PageSkeleton />}>
                    <Outlet />
                </Suspense>
            </MaintenanceGuard>
            <SessionTimeoutWarning />
        </NotificationProvider>
    )
}

export const RootIndex = () => {
    const { user, loading } = useAuth()
    const account = useAccountContext()
    const location = useLocation()

    const destination = useMemo(() => {
        if (!user) return null

        // guardrail-ok: retired landing URLs are recognised here so they never win over the account-aware home
        const GENERIC = new Set(['', '/', '/dashboard', '/home', '/home/learner', '/learn'])
        const isDeepLink = (p: string | null | undefined): p is string =>
            !!p && !GENERIC.has(p.split('?')[0].replace(/\/$/, '') || '/')

        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        const spaRedirect = getSpaRedirectFromSearch(location.search)
        const urlRedirect = getRedirectFromSearch(location.search)
        const sessionRedirect = consumePostLoginRedirect()

        // A genuine deep-link wins; a stale generic landing ('/dashboard', '/') does
        // NOT override the account-aware destination. `recommendedDestination` is
        // resolved server-side (resolve_account_context) from platform-operator
        // status + highest tenant membership role.
        const deepLink = [pendingAuthFlowPath, spaRedirect, urlRedirect, sessionRedirect].find(isDeepLink) ?? null
        if (deepLink) return deepLink

        if (account.isPlatformOperator && !account.activePlatformSession) {
            safeLocalStorage.removeItem('altus_active_tenant_id')
            if (user) safeLocalStorage.setItem(`active_tenant_id_${user.id}`, '__platform__')
            return '/platform'
        }

        if (account.isMultiOrg) {
            const userKey = `active_tenant_id_${user.id}`
            const stored = safeLocalStorage.getItem(userKey)
            if (!stored || stored === '__platform__') {
                return '/select-tenant'
            }
        }

        return account.recommendedDestination ?? '/learn'
    }, [user, location.search, account.recommendedDestination, account.isPlatformOperator, account.activePlatformSession, account.isMultiOrg])

    useEffect(() => {
        if (user && getAuthFlowRedirectPath()) {
            clearAuthFlowState()
        }
    }, [user])

    if (loading || (user && account.loading)) {
        return <PageSkeleton />
    }

    if (user && destination) {
        return <Navigate to={destination} replace />
    }

    const spaRedirect = getSpaRedirectFromSearch(location.search)
    if (spaRedirect) {
        return <Navigate to={spaRedirect} replace />
    }

    const redirectPath = getRedirectFromSearch(location.search)
    if (redirectPath) {
        const loginTarget = `/login?redirect=${encodeURIComponent(redirectPath)}`
        return <Navigate to={loginTarget} replace />
    }

    // Signed-out visitors go straight to sign-in; the app has no marketing site.
    return <Navigate to="/login" replace />
}

/**
 * AuthenticatedNotFound - NotFound page wrapped in AppLayout for authenticated users
 */
const AuthenticatedNotFound = () => {
    const [AppLayoutComponent, setAppLayoutComponent] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null)

    useEffect(() => {
        import('@/components/layout/AppLayout').then((module) => {
            setAppLayoutComponent(() => module.AppLayout)
        })
    }, [])

    if (!AppLayoutComponent) {
        return <PageSkeleton />
    }

    return (
        <AppLayoutComponent>
            <NotFound />
        </AppLayoutComponent>
    )
}

/**
 * NotFoundWrapper
 * Wraps NotFound component with AppLayout for authenticated users
 */
export const NotFoundWrapper = () => {
    const { user } = useAuth()

    if (!user) {
        return <NotFound />
    }

    return <AuthenticatedNotFound />
}

export const LegacyAnalyticsRedirect = () => {
    const { user, loading } = useAuth()
    const account = useAccountContext()
    const location = useLocation()

    if (loading || (user && account.loading)) {
        return <PageSkeleton />
    }

    if (!user) {
        return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
    }

    const destination = (account.isPlatformOperator && !account.activePlatformSession)
        ? '/platform/analytics'
        : '/manage/compliance'

    return <Navigate to={`${destination}${location.search}${location.hash}`} replace />
}

export const LegacyScheduleRedirect = () => <Navigate to="/" replace />

/**
 * `/dashboard` is no longer a page: every member's home is the landing of the
 * workspace that answers their first question (server-resolved in
 * resolve_account_context). An operator inside a tenant session lands on that
 * organization's overview.
 */
export const WorkspaceHomeRedirect = () => {
    const { user, loading } = useAuth()
    const account = useAccountContext()
    const location = useLocation()

    if (loading || (user && account.loading)) {
        return <PageSkeleton />
    }

    if (!user) {
        return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
    }

    const destination = account.isPlatformOperator && account.activePlatformSession
        ? '/admin/organization'
        : account.recommendedDestination || '/learn'

    return <Navigate to={`${destination}${location.search}${location.hash}`} replace />
}
