import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy, useEffect, useState } from 'react'
import { Route } from 'react-router-dom'

const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const CompleteInvite = lazy(() => import('@/pages/auth/CompleteInvite'))
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

/**
 * TokenValidationGuard
 * Validates authentication tokens before rendering sensitive routes.
 * 
 * CRITICAL FIX: Removed validation entirely to let ResetPassword component handle it.
 * The issue is that Supabase detectSessionInUrl creates race conditions.
 */
const TokenValidationGuard = ({ children, type: _type }: { children: React.ReactNode; type: 'recovery' | 'invite' }) => {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        // Give Supabase a moment to process any tokens, then just render
        // The child component (ResetPassword/CompleteInvite) will handle actual validation
        const timer = setTimeout(() => {
            setIsReady(true)
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    if (!isReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export const AuthRoutes = () => {
    return (
        <>
            <Route
                path="/login"
                element={
                    <PublicOnlyRoute>
                        <Login />
                    </PublicOnlyRoute>
                }
            />
            <Route
                path="/forgot-password"
                element={
                    <PublicOnlyRoute>
                        <ForgotPassword />
                    </PublicOnlyRoute>
                }
            />
            <Route
                path="/reset-password"
                element={
                    <TokenValidationGuard type="recovery">
                        <ResetPassword />
                    </TokenValidationGuard>
                }
            />
            <Route
                path="/complete-invite"
                element={
                    <TokenValidationGuard type="invite">
                        <CompleteInvite />
                    </TokenValidationGuard>
                }
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
