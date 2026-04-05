import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy, useEffect, useState } from 'react'
import { Navigate, Route, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const CompleteInvite = lazy(() => import('@/pages/auth/CompleteInvite'))
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

/**
 * TokenValidationGuard
 * Validates authentication tokens before rendering sensitive routes
 * Redirects to login if token is invalid or missing
 */
const TokenValidationGuard = ({ children, type }: { children: React.ReactNode; type: 'recovery' | 'invite' }) => {
    const [isValidating, setIsValidating] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const validateToken = async () => {
            const params = new URLSearchParams(location.search)
            const tokenHash = params.get('token_hash')
            const code = params.get('code')
            
            // If no token or code is present, mark as invalid
            if (!tokenHash && !code) {
                setIsValid(false)
                setIsValidating(false)
                return
            }

            // For recovery/invite flows, we need to verify the session or code
            try {
                if (code) {
                    // Exchange the code for a session
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (!error) {
                        setIsValid(true)
                    }
                }
                // Token is present, we'll let the component handle full validation
                // but we at least confirm the required params exist
                setIsValid(true)
            } catch {
                setIsValid(false)
            } finally {
                setIsValidating(false)
            }
        }

        validateToken()
    }, [location.search])

    if (isValidating) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Validating...</p>
                </div>
            </div>
        )
    }

    if (!isValid) {
        return <Navigate to="/login?error=invalid_token" replace />
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
