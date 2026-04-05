import { PageTracker } from '@/components/analytics/PageTracker'
import { RouteErrorBoundary } from '@/components/common'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useAuth } from '@/hooks/useAuth'
import {
    buildLoginUrl,
    consumePostLoginRedirect,
    getRedirectFromSearch,
    getSpaRedirectFromSearch,
} from '@/lib/authRedirect'
import { clearAuthFlowState, getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { ROUTE_PARAM_PATTERNS } from '@/routes/constants'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Outlet,
    Route,
    useLocation,
    useParams,
} from 'react-router-dom'

import { AdminRoutes } from './modules/AdminRoutes'
import { AuthRoutes, StandaloneAuthRoutes } from './modules/AuthRoutes'
import { DashboardRoutes } from './modules/DashboardRoutes'
import { GuestReviewRoutes } from './modules/GuestReviewRoutes'
import { HRRoutes } from './modules/HRRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { MediaRoutes } from './modules/MediaRoutes'
import { MiscRoutes } from './modules/MiscRoutes'
import { OperationsRoutes } from './modules/OperationsRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'

const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const RootLayout = () => {
    const { loading } = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p className="mt-4 animate-pulse text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <NotificationProvider>
            <PageTracker />
            <Suspense fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-hotel-gold"></div>
                </div>
            }>
                <Outlet />
            </Suspense>
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
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user && destination) {
        return <Navigate to={destination} replace />
    }

    const spaRedirect = getSpaRedirectFromSearch(location.search)
    if (spaRedirect) {
        return <Navigate to={spaRedirect} replace />
    }

    const redirectPath = getRedirectFromSearch(location.search)
    const loginTarget = redirectPath
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login'

    return <Navigate to={loginTarget} replace />
}

/**
 * RouteParamValidator
 * Validates dynamic route parameters against defined patterns
 * Renders NotFound page if parameters are invalid
 */
const RouteParamValidator = ({
    children,
    validations,
}: {
    children: React.ReactNode
    validations: Record<string, keyof typeof ROUTE_PARAM_PATTERNS>
}) => {
    const params = useParams()

    for (const [param, pattern] of Object.entries(validations)) {
        const value = params[param]
        if (value && !ROUTE_PARAM_PATTERNS[pattern].test(value)) {
            return <NotFound />
        }
    }

    return <>{children}</>
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
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        )
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

// Catch-all: authenticated users go to dashboard, unauthenticated users go to login with original path preserved
const CatchAllRedirect = () => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user) {
        return <Navigate to="/dashboard" replace />
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

                {AuthRoutes()}
                {AdminRoutes()}
                {HRRoutes()}
                {OperationsRoutes()}
                {GuestReviewRoutes()}
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
