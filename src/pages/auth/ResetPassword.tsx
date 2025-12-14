import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { securityConfig } from '@/lib/security-config'

export default function ResetPassword() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [validatingToken, setValidatingToken] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)

    // Check if we have a valid session from the reset link
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Session error:', error)
                    setTokenValid(false)
                } else if (session) {
                    setTokenValid(true)
                } else {
                    // Check if there's a hash fragment (Supabase auth redirect)
                    const hashParams = new URLSearchParams(window.location.hash.substring(1))
                    const accessToken = hashParams.get('access_token')

                    if (accessToken) {
                        const { error: refreshError } = await supabase.auth.refreshSession()
                        if (!refreshError) {
                            setTokenValid(true)
                        }
                    }
                }
            } catch (err) {
                console.error('Token validation error:', err)
                setTokenValid(false)
            } finally {
                setValidatingToken(false)
            }
        }

        checkSession()
    }, [searchParams])

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

            setSuccess(true)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                supabase.auth.signOut()
                navigate('/login')
            }, 3000)

        } catch (err: any) {
            console.error('Password update error:', err)
            setError(err.message || 'Failed to update password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Loading state while validating token
    if (validatingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-gray-600">Validating reset link...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Invalid or expired token
    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle>{t('reset_password.invalid_title', { defaultValue: 'Invalid or Expired Link' })}</CardTitle>
                        <CardDescription>
                            {t('reset_password.invalid_message', {
                                defaultValue: 'This password reset link is invalid or has expired. Please request a new one.'
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/forgot-password')}>
                            {t('reset_password.request_new', { defaultValue: 'Request New Link' })}
                        </Button>
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
                        <CardTitle>{t('reset_password.success_title', { defaultValue: 'Password Updated' })}</CardTitle>
                        <CardDescription>
                            {t('reset_password.success_message', {
                                defaultValue: 'Your password has been successfully updated. You will be redirected to login.'
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
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
                    <CardTitle>{t('reset_password.title', { defaultValue: 'Set New Password' })}</CardTitle>
                    <CardDescription>
                        {t('reset_password.description', {
                            defaultValue: 'Please enter your new password below.'
                        })}
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
                            <Label htmlFor="password">{t('reset_password.new_password', { defaultValue: 'New Password' })}</Label>
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
                                ].map((req, i) => (
                                    <li key={i} className={`flex items-center gap-1 ${req.check ? 'text-green-600' : 'text-gray-500'}`}>
                                        {req.check ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300" />}
                                        {req.text}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('reset_password.confirm_password', { defaultValue: 'Confirm Password' })}</Label>
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
                                    {t('reset_password.updating', { defaultValue: 'Updating...' })}
                                </>
                            ) : (
                                t('reset_password.update_password', { defaultValue: 'Update Password' })
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
