import { PageTracker } from '@/components/analytics/PageTracker'
import { RouteErrorBoundary } from '@/components/common'
import { MaintenanceGuard } from '@/components/common/MaintenanceGuard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
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

const LearnerHome = lazy(() => import('@/pages/home/LearnerHome'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const PublicHome = lazy(() => import('@/pages/public/PublicHome'))

export const LearnerHomeRoute = () => (
    <ProtectedRoute>
        <AppLayout>
            <LearnerHome />
        </AppLayout>
    </ProtectedRoute>
)

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

        const GENERIC = new Set(['', '/', '/dashboard', '/home', '/home/learner'])
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

        return account.recommendedDestination ?? '/dashboard'
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

    return <PublicHome />
}

/**
 * AuthenticatedNotFound - NotFound page wrapped in AppLayout for authenticated users
 */
export const AuthenticatedNotFound = () => {
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
        : '/learning/analytics'

    return <Navigate to={`${destination}${location.search}${location.hash}`} replace />
}

export const LegacyScheduleRedirect = () => <Navigate to="/" replace />
