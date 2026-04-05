import { RouteErrorBoundary } from '@/components/common'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { useAuth } from '@/hooks/useAuth'
import { buildLoginUrl, getRedirectFromSearch } from '@/lib/authRedirect'
import { getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, useLocation } from 'react-router-dom'

import { AdminRoutes } from './modules/AdminRoutes'
import { AuthRoutes } from './modules/AuthRoutes'
import { DashboardRoutes } from './modules/DashboardRoutes'
import { GuestReviewRoutes } from './modules/GuestReviewRoutes'
import { HRRoutes } from './modules/HRRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { MediaRoutes } from './modules/MediaRoutes'
import { MiscRoutes } from './modules/MiscRoutes'
import { OperationsRoutes } from './modules/OperationsRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'

import { PageTracker } from '@/components/analytics/PageTracker'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'

const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'))

const RootLayout = () => {
    const { loading } = useAuth()

    // Only wait for auth session loading here.
    // Role loading is handled by ProtectedRoute for protected routes,
    // so public routes (login, public home) aren't blocked.
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground animate-pulse">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <NotificationProvider>
            <PageTracker />
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hotel-gold"></div>
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
    const pendingAuthFlowPath = getAuthFlowRedirectPath()
    const redirectPath = getRedirectFromSearch(location.search)
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
        )
    }
    
    if (user && pendingAuthFlowPath) {
        return <Navigate to={`${pendingAuthFlowPath}${location.search}`} replace />
    }

    if (user) {
        return <Navigate to={`${redirectPath ?? "/home"}${location.search}`} replace />
    }

    // Not authenticated — redirect to login, preserving any ?redirect= param
    const loginTarget = redirectPath
        ? `/login?redirect=${encodeURIComponent(redirectPath)}`
        : '/login'
    return <Navigate to={loginTarget} replace />
}

// Catch-all: authenticated users go to dashboard, unauthenticated users go to login with original path preserved
const CatchAllRedirect = () => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
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

            <Route path="*" element={<CatchAllRedirect />} />
        </Route>
    )
)
