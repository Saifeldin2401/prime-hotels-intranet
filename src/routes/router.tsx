import { createBrowserRouter, createRoutesFromElements, Route, Navigate, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useAuth } from '@/hooks/useAuth'

import { AuthRoutes } from './modules/AuthRoutes'
import { AdminRoutes } from './modules/AdminRoutes'
import { HRRoutes } from './modules/HRRoutes'
import { OperationsRoutes } from './modules/OperationsRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { DashboardRoutes } from './modules/DashboardRoutes'
import { MiscRoutes } from './modules/MiscRoutes'

import { PageTracker } from '@/components/analytics/PageTracker'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'

const PublicHome = lazy(() => import('@/pages/public/PublicHome'))

const RootLayout = () => {
    const { loading, rolesLoading } = useAuth()

    if (loading || rolesLoading) {
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
        <>
            <PageTracker />
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hotel-gold"></div>
                </div>
            }>
                <Outlet />
            </Suspense>
            <SessionTimeoutWarning />
        </>
    )
}

const RootIndex = () => {
    const { user } = useAuth()
    return user ? <Navigate to="/home" replace /> : <PublicHome />
}

export const router = createBrowserRouter(
    createRoutesFromElements(
        <Route element={<RootLayout />} errorElement={<ErrorBoundary fallback={<div>Something went wrong</div>}><Outlet /></ErrorBoundary>}>
            <Route path="/" element={<RootIndex />} />

            {AuthRoutes()}
            {AdminRoutes()}
            {HRRoutes()}
            {OperationsRoutes()}
            {TrainingRoutes()}
            {KnowledgeRoutes()}
            {DashboardRoutes()}
            {MiscRoutes()}

            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    )
)
