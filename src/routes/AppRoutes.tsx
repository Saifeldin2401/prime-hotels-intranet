import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthRoutes } from './modules/AuthRoutes'
import { AdminRoutes } from './modules/AdminRoutes'
import { HRRoutes } from './modules/HRRoutes'
import { OperationsRoutes } from './modules/OperationsRoutes'
import { TrainingRoutes } from './modules/TrainingRoutes'
import { KnowledgeRoutes } from './modules/KnowledgeRoutes'
import { DashboardRoutes } from './modules/DashboardRoutes'
import { MiscRoutes } from './modules/MiscRoutes'

const PublicHome = lazy(() => import('@/pages/public/PublicHome'))

export const AppRoutes = () => {
    const { user, loading, rolesLoading } = useAuth()

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
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hotel-gold"></div>
            </div>
        }>
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/"
                    element={user ? <Navigate to="/home" replace /> : <PublicHome />}
                />

                {/* Modularized Routes */}
                {AuthRoutes()}
                {AdminRoutes()}
                {HRRoutes()}
                {OperationsRoutes()}
                {TrainingRoutes()}
                {KnowledgeRoutes()}
                {DashboardRoutes()}
                {MiscRoutes()}

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    )
}

export default AppRoutes
