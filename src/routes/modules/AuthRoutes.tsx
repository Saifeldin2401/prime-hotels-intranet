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
 * 
 * IMPORTANT: Supabase is configured with detectSessionInUrl: true, which means
 * it automatically consumes tokens from the URL hash on page load. By the time
 * this component runs, the hash may already be cleared and the session established.
 * So we check for both:
 * 1. Tokens in URL (for manual handling)
 * 2. Existing session (for auto-consumed tokens)
 */
const TokenValidationGuard = ({ children, type }: { children: React.ReactNode; type: 'recovery' | 'invite' }) => {
    const [isValidating, setIsValidating] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const validateToken = async () => {
            // DEBUG: Log the current URL state
            console.log('[TokenValidationGuard] Validating:', {
                type,
                search: location.search,
                hash: location.hash,
                pathname: location.pathname,
                fullUrl: window.location.href,
            })

            // Check query params
            const queryParams = new URLSearchParams(location.search)
            const tokenHash = queryParams.get('token_hash')
            const code = queryParams.get('code')
            
            // Check hash fragment (Supabase puts tokens here before auto-consuming them)
            const hashParams = new URLSearchParams(location.hash.substring(1))
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            const hashType = hashParams.get('type')
            
            // Check if this is a valid auth callback for our type
            const isValidType = hashType === type || queryParams.get('type') === type
            
            // Check if we have any token data in URL
            const hasUrlTokens = !!(tokenHash || code || accessToken)

            console.log('[TokenValidationGuard] Token check:', {
                hasUrlTokens,
                tokenHash: !!tokenHash,
                code: !!code,
                accessToken: !!accessToken,
                refreshToken: !!refreshToken,
                isValidType,
            })

            // If we have URL tokens, validate them
            if (hasUrlTokens) {
                try {
                    if (code) {
                        // Exchange the code for a session
                        const { error } = await supabase.auth.exchangeCodeForSession(code)
                        console.log('[TokenValidationGuard] Code exchange result:', { error: !!error })
                        setIsValid(!error)
                    } else if (accessToken && refreshToken) {
                        // Tokens in hash - Supabase may have already auto-consumed them
                        // Check if we now have a valid session
                        const { data: { session } } = await supabase.auth.getSession()
                        console.log('[TokenValidationGuard] Session from hash tokens:', { hasSession: !!session })
                        setIsValid(!!session)
                    } else if (tokenHash && isValidType) {
                        // Token hash present with correct type
                        setIsValid(true)
                    } else {
                        // Some token is present, let component handle it
                        setIsValid(true)
                    }
                } catch (err) {
                    console.error('[TokenValidationGuard] Validation error:', err)
                    setIsValid(false)
                } finally {
                    setIsValidating(false)
                }
                return
            }

            // No tokens in URL - but Supabase may have already auto-consumed them
            // Check if we have an active session (which would indicate successful token consumption)
            try {
                // Wait a bit for Supabase to finish processing tokens (if it just happened)
                await new Promise(resolve => setTimeout(resolve, 500))
                
                const { data: { session }, error } = await supabase.auth.getSession()
                console.log('[TokenValidationGuard] Session check (no URL tokens):', { 
                    hasSession: !!session, 
                    hasUser: !!session?.user,
                    error: !!error 
                })
                if (session?.user && !error) {
                    // Supabase has already processed the tokens and established a session
                    setIsValid(true)
                } else {
                    // No tokens in URL and no session - this is an invalid access
                    setIsValid(false)
                }
            } catch (err) {
                console.error('[TokenValidationGuard] Session check error:', err)
                setIsValid(false)
            } finally {
                setIsValidating(false)
            }
        }

        validateToken()
    }, [location.search, location.hash, type])

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
