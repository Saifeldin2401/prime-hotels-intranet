import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { lazy, useEffect, useRef, useState } from 'react'
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
 * Validates authentication tokens before rendering sensitive routes.
 * 
 * CRITICAL: This component handles Supabase auth callbacks. Supabase is configured
 * with detectSessionInUrl: true, which auto-consumes tokens from the URL hash.
 * Due to race conditions, we need to poll for session establishment.
 */
const TokenValidationGuard = ({ children, type }: { children: React.ReactNode; type: 'recovery' | 'invite' }) => {
    const [isValidating, setIsValidating] = useState(true)
    const [isValid, setIsValid] = useState(false)
    const location = useLocation()
    const attemptRef = useRef(0)
    const maxAttempts = 20 // 20 * 250ms = 5 seconds max wait

    useEffect(() => {
        // Check if there are any auth params in URL (indicates this is an auth callback)
        const hasAuthParams = () => {
            const query = new URLSearchParams(location.search)
            const hash = new URLSearchParams(location.hash.substring(1))
            return !!(query.get('code') || query.get('token_hash') || hash.get('access_token') || query.get('type'))
        }

        const validateToken = async () => {
            attemptRef.current++
            
            console.log('[TokenValidationGuard] Attempt', attemptRef.current, {
                type,
                hasAuthParams: hasAuthParams(),
                search: location.search,
                hashPreview: location.hash.substring(0, 50),
            })

            // Check query params
            const queryParams = new URLSearchParams(location.search)
            const tokenHash = queryParams.get('token_hash')
            const code = queryParams.get('code')
            const queryType = queryParams.get('type')
            
            // Check hash fragment
            const hashParams = new URLSearchParams(location.hash.substring(1))
            const accessToken = hashParams.get('access_token')
            const hashType = hashParams.get('type')
            
            const isValidType = hashType === type || queryType === type
            const hasUrlTokens = !!(tokenHash || code || accessToken)

            // If we have URL tokens, try to validate them
            if (hasUrlTokens) {
                try {
                    if (code) {
                        const { error } = await supabase.auth.exchangeCodeForSession(code)
                        console.log('[TokenValidationGuard] Code exchange:', { success: !error })
                        if (!error) {
                            setIsValid(true)
                            setIsValidating(false)
                            return
                        }
                    } else if (accessToken) {
                        // Tokens present - wait for Supabase to auto-consume them
                        // Don't mark as invalid yet, keep polling
                        console.log('[TokenValidationGuard] Tokens in hash, waiting for auto-consumption...')
                    } else if (tokenHash && isValidType) {
                        setIsValid(true)
                        setIsValidating(false)
                        return
                    }
                } catch (err) {
                    console.error('[TokenValidationGuard] Validation error:', err)
                }
            }

            // Check if Supabase has established a session (either auto-consumed or manually set)
            const { data: { session }, error } = await supabase.auth.getSession()
            
            if (session?.user) {
                console.log('[TokenValidationGuard] Session established!')
                setIsValid(true)
                setIsValidating(false)
                return
            }

            // No session yet - decide whether to keep polling or give up
            if (hasUrlTokens && attemptRef.current < maxAttempts) {
                // Tokens are in URL but session not established yet - keep polling
                console.log('[TokenValidationGuard] No session yet, retrying...', attemptRef.current)
                setTimeout(validateToken, 250)
                return
            }

            // No tokens and no session (or max attempts reached) - invalid
            console.log('[TokenValidationGuard] Validation failed:', { 
                hasUrlTokens, 
                attempt: attemptRef.current,
                error: error?.message 
            })
            setIsValid(false)
            setIsValidating(false)
        }

        // Reset state on mount
        attemptRef.current = 0
        setIsValidating(true)
        setIsValid(false)
        
        // Start validation
        validateToken()
        
        // Cleanup
        return () => {
            attemptRef.current = maxAttempts // Stop any pending retries
        }
    }, [location.search, location.hash, location.pathname, type])

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
