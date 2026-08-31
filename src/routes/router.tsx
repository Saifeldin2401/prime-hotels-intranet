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
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'
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
import { DashboardRoutes } from './modules/DashboardRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { ManageRoutes } from './modules/ManageRoutes'
import { MiscRoutes } from './modules/MiscRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'
import { LegacyDomainRedirects } from './redirects'

const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'))
const PublicLayout = lazy(() => import('@/pages/public/PublicLayout'))
const PublicHome = lazy(() => import('@/pages/public/PublicHome'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const MethodologyPage = lazy(() => import('@/pages/public/MethodologyPage'))
const VisionPage = lazy(() => import('@/pages/public/VisionPage'))
const CaseStudiesPage = lazy(() => import('@/pages/public/CaseStudiesPage'))
const LeadershipPage = lazy(() => import('@/pages/public/LeadershipPage'))
const DigitalAIPage = lazy(() => import('@/pages/public/DigitalAIPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Learner platform landing page (Training + Knowledge Base + Quiz).
// Minimal wiring: routed at /home/learner and made the default post-login
// destination for learner roles (see RootIndex below). NOTE: navigation.ts /
// DashboardRoutes are churned by other branches — on conflict, keep this route
// plus the RootIndex learner branch and re-apply on top.
const LearnerHome = lazy(() => import('@/pages/home/LearnerHome'))



import { MaintenanceGuard } from '@/components/common/MaintenanceGuard'
import { PageSkeleton } from '@/components/ui/loading-skeleton'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

const LearnerHomeRoute = () => (
    <ProtectedRoute allowedRoles={['staff', 'manager', 'department_head']}>
        <AppLayout>
            <LearnerHome />
        </AppLayout>
    </ProtectedRoute>
)

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
    const { user, loading, primaryRole } = useAuth()
    const location = useLocation()

    const destination = useMemo(() => {
        if (!user) return null

        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        const spaRedirect = getSpaRedirectFromSearch(location.search)
        const urlRedirect = getRedirectFromSearch(location.search)
        const sessionRedirect = consumePostLoginRedirect()

        // Learner roles land on the learning-focused home; everyone else keeps /dashboard.
        const defaultDestination =
            primaryRole === 'staff' || primaryRole === 'manager'
                ? '/home/learner'
                : '/dashboard'

        return pendingAuthFlowPath ?? spaRedirect ?? urlRedirect ?? sessionRedirect ?? defaultDestination
    }, [user, location.search, primaryRole])

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

const LegacyScheduleRedirect = () => <Navigate to="/" replace />

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {StandaloneAuthRoutes()}

            <Route element={<RootLayout />} errorElement={<RouteErrorBoundary section="App"><Outlet /></RouteErrorBoundary>}>
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<RootIndex />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/methodology" element={<MethodologyPage />} />
                    <Route path="/vision-2030" element={<VisionPage />} />
                    <Route path="/case-studies" element={<CaseStudiesPage />} />
                    <Route path="/leadership" element={<LeadershipPage />} />
                    <Route path="/digital" element={<DigitalAIPage />} />
                </Route>
                <Route path="/verify/:code?" element={<VerifyCertificate />} />
                <Route path="/analytics" element={<LegacyAnalyticsRedirect />} />
                <Route path="/calendar" element={<LegacyScheduleRedirect />} />
                <Route path="/schedule" element={<LegacyScheduleRedirect />} />
                <Route path="/support" element={<PreserveQueryNavigate to="/knowledge" />} />
                <Route path="/admin" element={<PreserveQueryNavigate to="/admin/users" />} />
                <Route path="/learning/reports" element={<PreserveQueryNavigate to="/learning/analytics" />} />
                <Route path="/learning/team" element={<PreserveQueryNavigate to="/learning/analytics" />} />

                {LegacyDomainRedirects()}

                {AuthRoutes()}
                {AdminRoutes()}
                <Route
                    path="/home/learner"
                    element={<LearnerHomeRoute />}
                    errorElement={<RouteErrorBoundary section="Learner Home" />}
                />
                {TrainingRoutes()}
                {KnowledgeRoutes()}
                {ManageRoutes()}
                {DashboardRoutes()}
                {MiscRoutes()}

                {/* 404 Not Found - Authenticated users see styled page, unauthenticated get clean 404 */}
                <Route path="/not-found" element={<NotFoundWrapper />} />

                {/* Catch-all: all unmatched URLs render 404 directly */}
                <Route path="*" element={<NotFoundWrapper />} />
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
