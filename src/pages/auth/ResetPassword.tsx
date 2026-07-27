import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    AUTH_SERVICE_UNAVAILABLE_MESSAGE,
    classifyAuthLinkError,
    withAuthLinkTimeout,
} from '@/lib/authLinkRecovery'
import { clearAuthFlowState, setAuthFlowState } from '@/lib/authFlowState'
import { auditLog } from '@/lib/auditLog'
import { securityConfig } from '@/lib/security-config'
import { SecurityMiddleware, rateLimitConfig } from '@/lib/security-middleware'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

type SupportedOtpType = 'recovery'

function isSupportedOtpType(value: string | null): value is SupportedOtpType {
    return value === 'recovery'
}

export default function ResetPassword() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const { signOut } = useAuth()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [validatingToken, setValidatingToken] = useState(false)
    const [tokenValid, setTokenValid] = useState(false)
    const [serviceUnavailableMessage, setServiceUnavailableMessage] = useState<string | null>(null)
    const [validationNonce, setValidationNonce] = useState(0)
    const validationInFlightRef = useRef(false)
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

    // Protect against mail scanners prefetching the direct token link.
    const hasTokenHashInUrl = new URLSearchParams(window.location.search).has('token_hash')
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(hasTokenHashInUrl)

    const [resendEmail, setResendEmail] = useState('')
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [resendError, setResendError] = useState<string | null>(null)

    useEffect(() => {
        setAuthFlowState('reset-password')
    }, [])

    const hasResetParams = useCallback(() => {
        const url = new URL(window.location.href)
        const queryParams = url.searchParams
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        return Boolean(
            queryParams.get('code') ||
            queryParams.get('token_hash') ||
            queryParams.get('access_token') ||
            hashParams.get('access_token')
        )
    }, [])

    useEffect(() => {
        if (awaitingConfirmation) return

        // Reset in-flight flag on mount/cleanup to prevent stale state on mobile
        validationInFlightRef.current = false

        const checkSession = async () => {
            if (validationInFlightRef.current) return
            validationInFlightRef.current = true
            setValidatingToken(true)
            setServiceUnavailableMessage(null)
            let isTokenCurrentlyValid = false
            let temporaryFailureMessage: string | null = null

            const rememberValidationError = (candidateError: unknown) => {
                const classified = classifyAuthLinkError(candidateError)
                if (classified.kind !== 'invalid_link') {
                    temporaryFailureMessage = AUTH_SERVICE_UNAVAILABLE_MESSAGE
                }
            }

            try {
                const url = new URL(window.location.href)
                const queryParams = url.searchParams
                const code = queryParams.get('code')
                const tokenHash = queryParams.get('token_hash')
                const otpType = queryParams.get('type')

                if (!isTokenCurrentlyValid && code) {
                    const { data, error: exchangeError } = await withAuthLinkTimeout(
                        supabase.auth.exchangeCodeForSession(code),
                        'Password reset session exchange'
                    )

                    if (!exchangeError && data.session) {
                        isTokenCurrentlyValid = true
                        url.searchParams.delete('code')
                        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''))
                        setAuthFlowState('reset-password')
                    } else if (exchangeError) {
                        rememberValidationError(exchangeError)
                    }
                }

                if (!isTokenCurrentlyValid && tokenHash && isSupportedOtpType(otpType)) {
                    const { data, error: verifyError } = await withAuthLinkTimeout(
                        supabase.auth.verifyOtp({
                            token_hash: tokenHash,
                            type: otpType,
                        }),
                        'Password reset token verification'
                    )

                    if (!verifyError && data.session) {
                        isTokenCurrentlyValid = true
                        window.history.replaceState({}, document.title, window.location.pathname)
                        setAuthFlowState('reset-password')
                    } else if (verifyError) {
                        rememberValidationError(verifyError)
                    }
                }

                if (!isTokenCurrentlyValid) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1))
                    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
                    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

                    if (accessToken && refreshToken) {
                        const { data, error: setSessionError } = await withAuthLinkTimeout(
                            supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            }),
                            'Password reset session restore'
                        )

                        if (!setSessionError && data.session) {
                            isTokenCurrentlyValid = true
                            window.history.replaceState({}, document.title, window.location.pathname)
                            setAuthFlowState('reset-password')
                        } else if (setSessionError) {
                            rememberValidationError(setSessionError)
                        }
                    }
                }

                if (!isTokenCurrentlyValid) {
                    const { data: { session }, error: sessionError } = await withAuthLinkTimeout(
                        supabase.auth.getSession(),
                        'Password reset session lookup'
                    )

                    if (session?.user) {
                        isTokenCurrentlyValid = true
                        setAuthFlowState('reset-password')
                    } else if (sessionError) {
                        rememberValidationError(sessionError)
                    }
                }
            } catch (candidateError) {
                console.error('Token validation error:', candidateError)
                rememberValidationError(candidateError)
            } finally {
                setTokenValid(isTokenCurrentlyValid)
                setServiceUnavailableMessage(isTokenCurrentlyValid ? null : temporaryFailureMessage)
                setValidatingToken(false)
                validationInFlightRef.current = false
            }
        }

        void checkSession()
    }, [awaitingConfirmation, validationNonce])

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

    const handleConfirmClick = () => {
        setAuthFlowState('reset-password')
        setAwaitingConfirmation(false)
    }

    const handleResend = async () => {
        setResendError(null)
        setResendSuccess(false)

        const email = resendEmail.trim().toLowerCase()
        if (!email || !email.includes('@')) {
            setResendError(t('forgot_password.invalid_email'))
            return
        }

        // Rate limiting check
        const rateLimitKey = `auth:password-reset:${email}`
        if (!SecurityMiddleware.rateLimit(rateLimitKey, rateLimitConfig.auth.maxRequests, rateLimitConfig.auth.windowMs)) {
            setResendError(t('reset_password.resend_rate_limited'))
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

            if (invokeError) {
                const classified = classifyAuthLinkError(invokeError)
                if (classified.kind !== 'invalid_link') {
                    setResendError(AUTH_SERVICE_UNAVAILABLE_MESSAGE)
                    return
                }
            }

            setResendSuccess(true)
        } catch (candidateError) {
            const classified = classifyAuthLinkError(candidateError)
            if (classified.kind !== 'invalid_link') {
                setResendError(AUTH_SERVICE_UNAVAILABLE_MESSAGE)
                return
            }
            setResendError(t('forgot_password.error'))
        } finally {
            setResendLoading(false)
        }
    }

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
                password,
            })

            if (updateError) {
                throw updateError
            }

            const { error: finalizeError } = await supabase.rpc('complete_password_reset')
            if (finalizeError) {
                console.warn('Password updated, but failed to finalize reset flags:', finalizeError)
            }

            setSuccess(true)
            await auditLog.passwordChange().catch(() => undefined)

            window.setTimeout(() => {
                signOut().finally(() => {
                    clearAuthFlowState('reset-password')
                    navigate('/login')
                })
            }, 3000)
        } catch (candidateError: unknown) {
            console.error('Password update error:', candidateError)
            const classified = classifyAuthLinkError(candidateError)
            setError(
                classified.kind === 'service_unavailable'
                    ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
                    : (candidateError instanceof Error ? candidateError.message : 'Failed to update password. Please try again.')
            )
        } finally {
            setLoading(false)
        }
    }

    const renderResendPanel = () => (
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void handleResend()
                                }
                            }}
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
    )

    const renderWrapper = (content: React.ReactNode) => (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-hotel-navy-dark px-4 py-12">
            <div className="w-full max-w-md flex flex-col items-center">
                <div className="mt-16 mb-8 text-center">
                    <img src="/remal-logo-web.png" alt="REMAL" className="h-14 w-auto mx-auto object-contain" />
                </div>
                {content}
            </div>
        </div>
    )

    if (awaitingConfirmation) {
        if (!hasResetParams()) {
            return renderWrapper(
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle>{t('reset_password.invalid_title')}</CardTitle>
                        <CardDescription>
                            {t('reset_password.invalid_message')}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <div className="w-full">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => {
                                    clearAuthFlowState('reset-password')
                                    navigate('/forgot-password')
                                }}
                            >
                                {t('reset_password.request_new')}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )
        }

        return renderWrapper(
            <Card className="w-full">
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
        )
    }

    if (validatingToken) {
        return renderWrapper(
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">{t('reset_password.validating')}</p>
                </CardContent>
            </Card>
        )
    }

    if (!tokenValid && serviceUnavailableMessage) {
        return renderWrapper(
            <Card className="w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle>
                        {t('reset_password.service_unavailable_title', { defaultValue: 'Authentication service unavailable' })}
                    </CardTitle>
                    <CardDescription>
                        {t('reset_password.service_unavailable_message', { defaultValue: serviceUnavailableMessage })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderResendPanel()}
                </CardContent>
                <CardFooter>
                    <div className="w-full space-y-3">
                        <Button className="w-full" onClick={() => setValidationNonce((value) => value + 1)}>
                            {t('reset_password.revalidate_link')}
                        </Button>
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => {
                                clearAuthFlowState('reset-password')
                                navigate('/forgot-password')
                            }}
                        >
                            {t('reset_password.request_new')}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        )
    }

    if (!tokenValid) {
        return renderWrapper(
            <Card className="w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <CardTitle>{t('reset_password.invalid_title')}</CardTitle>
                    <CardDescription>
                        {t('reset_password.invalid_message')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderResendPanel()}
                </CardContent>
                <CardFooter>
                    <div className="w-full space-y-3">
                        <Button className="w-full" onClick={() => setValidationNonce((value) => value + 1)}>
                            {t('reset_password.revalidate_link')}
                        </Button>
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => {
                                clearAuthFlowState('reset-password')
                                navigate('/forgot-password')
                            }}
                        >
                            {t('reset_password.request_new')}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        )
    }

    if (success) {
        return renderWrapper(
            <Card className="w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
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
        )
    }

    return renderWrapper(
        <Card className="w-full">
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
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-850/50 rounded-md text-red-700 dark:text-red-400">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('reset_password.new_password')}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="pe-10"
                            />
                            <button
                                type="button"
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-muted/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Password Requirements:
                        </p>
                        <ul className="text-xs space-y-1">
                            {[
                                { check: password.length >= securityConfig.auth.passwordMinLength, text: `At least ${securityConfig.auth.passwordMinLength} characters` },
                                { check: /[A-Z]/.test(password), text: 'One uppercase letter' },
                                { check: /[a-z]/.test(password), text: 'One lowercase letter' },
                                { check: /\d/.test(password), text: 'One number' },
                                { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' },
                            ].map((requirement) => (
                                <li key={requirement.text} className={`flex items-center gap-1 ${requirement.check ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {requirement.check ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-700" />}
                                    {requirement.text}
                                </li>
                            ))}
                        </ul>
                    </div>

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
                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
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
                                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                {t('reset_password.updating')}
                            </>
                        ) : (
                            t('reset_password.update_password')
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
