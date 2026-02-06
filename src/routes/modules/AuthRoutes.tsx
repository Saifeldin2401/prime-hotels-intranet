import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

export const AuthRoutes = (user: User | null) => {
    return (
        <>
            <Route
                path="/login"
                element={user ? <Navigate to="/home" replace /> : <Login />}
            />
            <Route
                path="/forgot-password"
                element={user ? <Navigate to="/home" replace /> : <ForgotPassword />}
            />
            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />
            <Route
                path="/change-password"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <div className="flex items-center justify-center min-h-[80vh]">
                                <ChangePassword />
                            </div>
                        </AppLayout>
                    </ProtectedRoute>
                }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
        </>
    )
}
