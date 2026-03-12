import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { securityConfig } from '@/lib/security-config'
import { auditLog } from '@/lib/auditLog'

export default function ResetPassword() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [validatingToken, setValidatingToken] = useState(false)
    const [tokenValid, setTokenValid] = useState(false)
    const [validationNonce, setValidationNonce] = useState(0)
    const validationInFlightRef = useRef(false)
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

    // Confirmation gate: protect against email security scanners that pre-fetch links.
    // Disabled by default when using action_link (server-side token verification).
    // The gate is only shown when the URL has a token_hash param (direct link flow).
    const hasTokenHashInUrl = new URLSearchParams(window.location.search).has('token_hash')
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(hasTokenHashInUrl)

    // Inline resend: allow users to request a new link directly from the error page.
    const [resendEmail, setResendEmail] = useState('')
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [resendError, setResendError] = useState<string | null>(null)

    type SupportedOtpType = 'recovery'

    const isSupportedOtpType = (value: string | null): value is SupportedOtpType => value === 'recovery'

    // Detect if URL has any reset tokens (for the confirmation gate UI)
    const hasResetParams = useCallback(() => {
        const url = new URL(window.location.href)
        const queryParams = url.searchParams
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        return !!(
            queryParams.get('code') ||
            queryParams.get('token_hash') ||
            queryParams.get('access_token') ||
            hashParams.get('access_token')
        )
    }, [])

    // Check if we have a valid session from the reset link.
    // IMPORTANT: Run validation ONCE per nonce. Do NOT re-run on focus/visibility
    // events because one-time tokens (OTP, code) are consumed on first attempt, and
    // re-validation on mobile focus events causes a flood of "One-time token not found"
    // errors that permanently break the reset flow.
    useEffect(() => {
        // Don't run verification until user clicks "Confirm" (scanner protection)
        if (awaitingConfirmation) return

        const checkSession = async () => {
            if (validationInFlightRef.current) return
            validationInFlightRef.current = true
            let isTokenValid = false
            try {
                const url = new URL(window.location.href)
                const queryParams = url.searchParams
                const code = queryParams.get('code')
                const tokenHash = queryParams.get('token_hash')
                const otpType = queryParams.get('type')

                // Strategy 1: PKCE code exchange (from action_link redirect)
                if (!isTokenValid && code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                    if (!exchangeError && data.session) {
                        isTokenValid = true
                        url.searchParams.delete('code')
                        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
                    }
                }

                // Strategy 2: OTP token_hash verification (direct link fallback, single attempt only)
                if (!isTokenValid && tokenHash && isSupportedOtpType(otpType)) {
                    const { data, error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: otpType,
                    })
                    if (!verifyError && data.session) {
                        isTokenValid = true
                        window.history.replaceState({}, document.title, window.location.pathname)
                    }
                }

                // Strategy 3: Direct session tokens from hash/query
                if (!isTokenValid) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1))
                    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
                    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

                    if (accessToken && refreshToken) {
                        const { data, error: setSessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        })
                        if (!setSessionError && data.session) {
                            isTokenValid = true
                            window.history.replaceState({}, document.title, window.location.pathname)
                        }
                    }
                }

                // Final fallback: if no tokens in URL but user already has a session
                // (e.g. Supabase already verified the token and established a session
                // before landing on this component), allow them to stay on the page.
                if (!isTokenValid) {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session?.user) {
                        isTokenValid = true
                    }
                }
            } catch (err) {
                console.error('Token validation error:', err)
            } finally {
                setTokenValid(isTokenValid)
                setValidatingToken(false)
                validationInFlightRef.current = false
            }
        }

        setValidatingToken(true)
        void checkSession()
    }, [validationNonce, awaitingConfirmation])

    useEffect(() => {
        if (!success) {
            setRedirectCountdown(null)
            return
        }

        setRedirectCountdown(3)
        const interval = window.setInterval(() => {
            setRedirectCountdown((value) => {
                if (value === null) return value
                return Math.max(0, value - 1)
            })
        }, 1000)

        return () => {
            window.clearInterval(interval)
        }
    }, [success])

    // Handle confirmation gate click — user confirms they want to proceed
    const handleConfirmClick = () => {
        setAwaitingConfirmation(false)
    }

    // Handle inline resend
    const handleResend = async () => {
        setResendError(null)
        setResendSuccess(false)

        const email = resendEmail.trim().toLowerCase()
        if (!email || !email.includes('@')) {
            setResendError(t('forgot_password.invalid_email'))
            return
        }

        setResendLoading(true)
        try {
            const { error: invokeError } = await supabase.functions.invoke('public-forgot-password', {
                body: { email },
            })

            if (invokeError?.message?.toLowerCase().includes('too many')) {
                setResendError(t('reset_password.resend_rate_limited'))
                return
            }

            setResendSuccess(true)
        } catch {
            setResendError(t('forgot_password.error'))
        } finally {
            setResendLoading(false)
        }
    }

    // Password validation
    const validatePassword = (pwd: string): string[] => {
        const errors: string[] = []
        const config = securityConfig.auth

        if (pwd.length < config.passwordMinLength) {
            errors.push(`At least ${config.passwordMinLength} characters`)
        }
        if (config.passwordRequireUppercase && !/[A-Z]/.test(pwd)) {
            errors.push('One uppercase letter')
        }
        if (config.passwordRequireLowercase && !/[a-z]/.test(pwd)) {
            errors.push('One lowercase letter')
        }
        if (config.passwordRequireNumbers && !/\d/.test(pwd)) {
            errors.push('One number')
        }
        if (config.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            errors.push('One special character')
        }

        return errors
    }

    const passwordErrors = validatePassword(password)
    const isPasswordValid = passwordErrors.length === 0 && password.length > 0
    const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!isPasswordValid) {
            setError('Please meet all password requirements')
            return
        }

        if (!doPasswordsMatch) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                throw updateError
            }

            // Finalize first-time password flows (invite / temp password flags).
            const { error: finalizeError } = await supabase.rpc('complete_password_reset')
            if (finalizeError) {
                console.warn('Password updated, but failed to finalize reset flags:', finalizeError)
            }

            setSuccess(true)

            await auditLog.passwordChange().catch(() => undefined)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                supabase.auth.signOut()
                navigate('/login')
            }, 3000)

        } catch (err: unknown) {
            console.error('Password update error:', err)
            const errorMessage = err instanceof Error ? err.message : 'Failed to update password. Please try again.'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    // Confirmation gate: show "Confirm" button before verifying token.
    // This prevents email security scanners (Outlook Safe Links, Google, Barracuda)
    // from consuming the one-time token when they pre-fetch the link.
    if (awaitingConfirmation) {
        // If there are no reset params in the URL, skip the gate and show the error page
        if (!hasResetParams()) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                            </div>
                            <CardTitle>{t('reset_password.invalid_title')}</CardTitle>
                            <CardDescription>
                                {t('reset_password.invalid_message')}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <div className="w-full">
                                <Button className="w-full" variant="outline" onClick={() => navigate('/forgot-password')}>
                                    {t('reset_password.request_new')}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{t('reset_password.confirm_title')}</CardTitle>
                        <CardDescription>
                            {t('reset_password.confirm_message')}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handleConfirmClick}>
                            {t('reset_password.confirm_button')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Loading state while validating token
    if (validatingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-gray-600">{t('reset_password.validating')}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Invalid or expired token — with inline resend
    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle>{t('reset_password.invalid_title')}</CardTitle>
                        <CardDescription>
                            {t('reset_password.invalid_message')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Inline resend: request a new link without navigating away */}
                        <div className="border rounded-lg p-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {t('reset_password.resend_title')}
                            </p>

                            {resendSuccess ? (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-700">
                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-sm">{t('reset_password.resend_success')}</span>
                                </div>
                            ) : (
                                <>
                                    {resendError && (
                                        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-700">
                                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                            <span className="text-xs">{resendError}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            placeholder={t('email_placeholder')}
                                            disabled={resendLoading}
                                            className="flex-1"
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleResend() } }}
                                        />
                                        <Button
                                            onClick={() => void handleResend()}
                                            disabled={resendLoading || !resendEmail.trim()}
                                            size="sm"
                                            className="shrink-0"
                                        >
                                            {resendLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <div className="w-full space-y-3">
                            <Button className="w-full" onClick={() => setValidationNonce((v) => v + 1)}>
                                {t('reset_password.revalidate_link')}
                            </Button>
                            <Button className="w-full" variant="outline" onClick={() => navigate('/forgot-password')}>
                                {t('reset_password.request_new')}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle>{t('reset_password.success_title')}</CardTitle>
                        <CardDescription>
                            {t('reset_password.success_message')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                        {redirectCountdown !== null && (
                            <p className="mt-4 text-sm text-gray-500">{t('reset_password.redirecting', { count: redirectCountdown })}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Reset form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{t('reset_password.title')}</CardTitle>
                    <CardDescription>
                        {t('reset_password.description')}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('reset_password.new_password')}</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Password Requirements:
                            </p>
                            <ul className="text-xs space-y-1">
                                {[
                                    { check: password.length >= securityConfig.auth.passwordMinLength, text: `At least ${securityConfig.auth.passwordMinLength} characters` },
                                    { check: /[A-Z]/.test(password), text: 'One uppercase letter' },
                                    { check: /[a-z]/.test(password), text: 'One lowercase letter' },
                                    { check: /\d/.test(password), text: 'One number' },
                                    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' }
                                ].map((req) => (
                                    <li key={req.text} className={`flex items-center gap-1 ${req.check ? 'text-green-600' : 'text-gray-500'}`}>
                                        {req.check ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300" />}
                                        {req.text}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('reset_password.confirm_password')}</Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                            {confirmPassword && !doPasswordsMatch && (
                                <p className="text-xs text-red-500">Passwords do not match</p>
                            )}
                            {doPasswordsMatch && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Passwords match
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !isPasswordValid || !doPasswordsMatch}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('reset_password.updating')}
                                </>
                            ) : (
                                t('reset_password.update_password')
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
