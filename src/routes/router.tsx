import { RouteErrorBoundary } from '@/components/common'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PreserveQueryNavigate } from './utils/QueryPreserveRedirect'
import { lazy } from 'react'
import {
    createBrowserRouter,
    createRoutesFromElements,
    Outlet,
    Route,
} from 'react-router-dom'

import {
    LegacyAnalyticsRedirect,
    LegacyScheduleRedirect,
    NotFoundWrapper,
    RootIndex,
    RootLayout,
    WorkspaceHomeRedirect,
} from './RouteComponents'

import { AdminRoutes } from './modules/AdminRoutes'
import { AuthRoutes, StandaloneAuthRoutes } from './modules/AuthRoutes'
import { LearnRoutes } from './modules/LearnRoutes'
import { ManageRoutes } from './modules/ManageRoutes'
import { MiscRoutes } from './modules/MiscRoutes'
import { StudioRoutes } from './modules/StudioRoutes'
import { LegacyRedirects } from './legacyRedirects'

const VerifyCertificate = lazy(() => import('@/pages/public/VerifyCertificate'))
const OrgSuspended = lazy(() => import('@/pages/OrgSuspended'))
const SelectTenant = lazy(() => import('@/pages/auth/SelectTenant'))
const ComponentGallery = lazy(() => import('@/pages/gallery/ComponentGallery'))

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {StandaloneAuthRoutes()}

            <Route element={<RootLayout />} errorElement={<RouteErrorBoundary section="App"><Outlet /></RouteErrorBoundary>}>
                <Route path="/" element={<RootIndex />} />
                {/* The consulting marketing pages moved out of the app (product
                    definition, decision 2). Old links land on sign-in. */}
                {['/about', '/methodology', '/vision-2030', '/case-studies', '/leadership', '/digital'].map((path) => (
                    <Route key={path} path={path} element={<PreserveQueryNavigate to="/login" />} />
                ))}
                <Route path="/verify/:code?" element={<VerifyCertificate />} />
                {/* Design-system gallery: a developer tool, not part of the product.
                    Available in development builds only. */}
                {import.meta.env.DEV && <Route path="/design-system" element={<ComponentGallery />} />}
                {import.meta.env.DEV && <Route path="/gallery" element={<ComponentGallery />} />}
                <Route path="/analytics" element={<LegacyAnalyticsRedirect />} />
                <Route path="/calendar" element={<LegacyScheduleRedirect />} />
                <Route path="/schedule" element={<LegacyScheduleRedirect />} />
                <Route path="/dashboard" element={<WorkspaceHomeRedirect />} />

                {/* Retired URLs: kept for bookmarks and emailed links only. */}
                {LegacyRedirects()}

                {AuthRoutes()}

                {/* The five workspaces - one canonical URL per job. */}
                {LearnRoutes()}
                {StudioRoutes()}
                {ManageRoutes()}
                {AdminRoutes()}
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
                {/* Account utilities, reachable from every workspace. */}
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
