import { PageTracker } from '@/components/analytics/PageTracker'
import { RouteErrorBoundary } from '@/components/common'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import {
    buildLoginUrl,
    consumePostLoginRedirect,
    getRedirectFromSearch,
    getSpaRedirectFromSearch,
} from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Outlet,
    Route,
    useLocation,
} from 'react-router-dom'

import { AdminRoutes } from './modules/AdminRoutes'
import { AuthRoutes, StandaloneAuthRoutes } from './modules/AuthRoutes'
import { CommercialRoutes } from './modules/CommercialRoutes'
import { DashboardRoutes } from './modules/DashboardRoutes'
import { FinanceRoutes } from './modules/FinanceRoutes'
import { HousekeepingRoutes } from './modules/HousekeepingRoutes'
import { HRRoutes } from './modules/HRRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { MediaRoutes } from './modules/MediaRoutes'
import { MiscRoutes } from './modules/MiscRoutes'
import { OperationsRoutes } from './modules/OperationsRoutes'
import { ProcurementRoutes } from './modules/ProcurementRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'

const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'))
const PublicHome = lazy(() => import('@/pages/public/PublicHome'))
const NotFound = lazy(() => import('@/pages/NotFound'))



import { MaintenanceGuard } from '@/components/common/MaintenanceGuard'
import { PageSkeleton } from '@/components/ui/loading-skeleton'

const RootLayout = () => {
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

const RootIndex = () => {
    const { user, loading } = useAuth()
    const location = useLocation()

    const destination = useMemo(() => {
        if (!user) return null

        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        const spaRedirect = getSpaRedirectFromSearch(location.search)
        const urlRedirect = getRedirectFromSearch(location.search)
        const sessionRedirect = consumePostLoginRedirect()

        return pendingAuthFlowPath ?? spaRedirect ?? urlRedirect ?? sessionRedirect ?? '/home'
    }, [user, location.search])

    useEffect(() => {
        if (user && getAuthFlowRedirectPath()) {
            clearAuthFlowState()
        }
    }, [user])

    if (loading) {
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
const NotFoundWrapper = () => {
    const { user } = useAuth()

    if (!user) {
        return <NotFound />
    }

    return <AuthenticatedNotFound />
}

const LegacyAnalyticsRedirect = () => {
    const { user, loading, primaryRole, rolesLoading } = useAuth()
    const location = useLocation()

    if (loading || rolesLoading) {
        return <PageSkeleton />
    }

    if (!user) {
        return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
    }

    const destination = (
        primaryRole === 'corporate_admin' || primaryRole === 'regional_admin'
            ? '/admin/analytics'
            : primaryRole === 'regional_hr' || primaryRole === 'property_manager'
                ? '/reports'
                : '/learning/analytics'
    )

    return <Navigate to={`${destination}${location.search}${location.hash}`} replace />
}

const LegacyScheduleRedirect = () => {
    const { user, loading } = useAuth()
    const { hasPermission } = usePermissions()
    const location = useLocation()

    if (loading) {
        return <PageSkeleton />
    }

    if (!user) {
        return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
    }

    const destination = hasPermission('scheduling.manage')
        ? '/hr/scheduling'
        : '/hr/attendance'

    return <Navigate to={`${destination}${location.search}${location.hash}`} replace />
}

// Catch-all: authenticated users see a real 404, unauthenticated users go to login with original path preserved
const CatchAllRedirect = () => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <PageSkeleton />
    }

    if (user) {
        return <NotFoundWrapper />
    }

    return <Navigate to={buildLoginUrl(location.pathname, location.search, location.hash)} replace />
}

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {StandaloneAuthRoutes()}

            <Route element={<RootLayout />} errorElement={<RouteErrorBoundary section="App"><Outlet /></RouteErrorBoundary>}>
                <Route path="/" element={<RootIndex />} />
                <Route path="/verify/:code?" element={<VerifyCertificate />} />
                <Route path="/analytics" element={<LegacyAnalyticsRedirect />} />
                <Route path="/calendar" element={<LegacyScheduleRedirect />} />
                <Route path="/schedule" element={<LegacyScheduleRedirect />} />
                <Route path="/social" element={<Navigate to="/announcements" replace />} />
                <Route path="/support" element={<Navigate to="/knowledge" replace />} />
                <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                <Route path="/hr/leave-requests" element={<Navigate to="/hr/leave" replace />} />
                <Route path="/hr/my-attendance" element={<Navigate to="/hr/attendance" replace />} />
                <Route path="/hr/staff" element={<Navigate to="/directory" replace />} />
                <Route path="/learning/reports" element={<Navigate to="/learning/analytics" replace />} />
                <Route path="/learning/team" element={<Navigate to="/learning/analytics" replace />} />

                {AuthRoutes()}
                {AdminRoutes()}
                {HRRoutes()}
                {OperationsRoutes()}
                {HousekeepingRoutes()}
                {CommercialRoutes()}
                {ProcurementRoutes()}
                {FinanceRoutes()}
                {TrainingRoutes()}
                {KnowledgeRoutes()}
                {MediaRoutes()}
                {DashboardRoutes()}
                {MiscRoutes()}

                {/* 404 Not Found - Authenticated users see styled page, unauthenticated get redirected */}
                <Route path="/not-found" element={<NotFoundWrapper />} />

                {/* Catch-all: authenticated users go to dashboard, unauthenticated users go to login with original path preserved */}
                <Route path="*" element={<CatchAllRedirect />} />
            </Route>
        </>
    )
)

// Initialize global deep link handler for React Native / mobile integration.
if (typeof window !== 'undefined') {
    import('@/lib/authRedirect').then(({ registerGlobalDeeplinkHandler }) => {
        registerGlobalDeeplinkHandler((path) => router.navigate(path))
    }).catch((error) => {
        if (import.meta.env.DEV) {
            console.error('[Router] Failed to load deep link handler:', error)
        }
    })
}
