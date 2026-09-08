import { RouteErrorBoundary } from '@/components/common'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { TenantContextGuard } from '@/components/auth/TenantContextGuard'
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'
import { lazy } from 'react'
import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Outlet,
    Route,
} from 'react-router-dom'

import {
    AuthenticatedNotFound,
    LearnerHomeRoute,
    LegacyAnalyticsRedirect,
    LegacyScheduleRedirect,
    NotFoundWrapper,
    RootIndex,
    RootLayout,
} from './RouteComponents'

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
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const MethodologyPage = lazy(() => import('@/pages/public/MethodologyPage'))
const VisionPage = lazy(() => import('@/pages/public/VisionPage'))
const CaseStudiesPage = lazy(() => import('@/pages/public/CaseStudiesPage'))
const LeadershipPage = lazy(() => import('@/pages/public/LeadershipPage'))
const DigitalAIPage = lazy(() => import('@/pages/public/DigitalAIPage'))
const OrgSuspended = lazy(() => import('@/pages/OrgSuspended'))
const SelectTenant = lazy(() => import('@/pages/auth/SelectTenant'))

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
                <Route
                    path="/suspended"
                    element={
                        <ProtectedRoute smartFallback={false}>
                            <OrgSuspended />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/select-tenant"
                    element={
                        <ProtectedRoute smartFallback={false}>
                            <SelectTenant />
                        </ProtectedRoute>
                    }
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
