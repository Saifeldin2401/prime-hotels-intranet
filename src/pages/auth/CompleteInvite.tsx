import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { markWizardPending } from '@/config/newUserTour'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { securityConfig } from '@/lib/security-config'

type SupportedOtpType = 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email' | 'email_change'

function isSupportedOtpType(value: string | null): value is SupportedOtpType {
    return value === 'invite'
        || value === 'recovery'
        || value === 'signup'
        || value === 'magiclink'
        || value === 'email'
        || value === 'email_change'
}

interface PropertyOption {
    id: string
    name: string
}

export default function CompleteInvite() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const { refreshSession } = useAuth()

    const [fullName, setFullName] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [phone, setPhone] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [propertyId, setPropertyId] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [validatingToken, setValidatingToken] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)
    const [jobTitleOptions, setJobTitleOptions] = useState<string[]>([])
    const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([])
    const [loadingFormOptions, setLoadingFormOptions] = useState(false)

    useEffect(() => {
        const initializeInviteSession = async () => {
            try {
                let validSession = false
                const queryParams = new URLSearchParams(window.location.search)
                const tokenHash = queryParams.get('token_hash')
                const otpType = queryParams.get('type')
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')

                if (tokenHash && isSupportedOtpType(otpType)) {
                    // Explicit invite/recovery tokens must override any existing browser session.
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
                    const { data: verifiedData, error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: otpType,
                    })

                    if (!verifyError && verifiedData.session) {
                        validSession = true
                        window.history.replaceState({}, document.title, window.location.pathname)
                    }
                }

                if (!validSession && accessToken && refreshToken) {
                    const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    })

                    if (!setSessionError && setSessionData.session) {
                        validSession = true
                        window.history.replaceState({}, document.title, window.location.pathname)
                    }
                }

                if (!validSession) {
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
                    if (!sessionError && sessionData.session) {
                        validSession = true
                    }
                }

                setTokenValid(validSession)
            } catch (err) {
                console.error('Invite session validation failed:', err)
                setTokenValid(false)
            } finally {
                setValidatingToken(false)
            }
        }

        initializeInviteSession()
    }, [])

    useEffect(() => {
        if (!tokenValid) return

        let cancelled = false

        const loadFormOptions = async () => {
            setLoadingFormOptions(true)
            try {
                const [
                    { data: jobTitleRows, error: jobTitleError },
                    { data: propertyRows, error: propertyError },
                ] = await Promise.all([
                    supabase
                        .from('job_titles')
                        .select('title')
                        .order('title', { ascending: true }),
                    supabase
                        .from('properties')
                        .select('id, name')
                        .eq('is_active', true)
                        .order('name', { ascending: true }),
                ])

                if (jobTitleError) throw jobTitleError
                if (propertyError) throw propertyError

                const normalizedJobTitles = (jobTitleRows || [])
                    .map((row) => row.title)
                    .filter((title): title is string => typeof title === 'string' && title.trim().length > 0)

                const allPropertyOptions = (propertyRows || [])
                    .map((row) => ({ id: row.id, name: row.name }))
                    .filter((property): property is PropertyOption =>
                        typeof property.id === 'string' &&
                        property.id.length > 0 &&
                        typeof property.name === 'string' &&
                        property.name.length > 0
                    )

                const { data: userData, error: userError } = await supabase.auth.getUser()
                if (userError || !userData.user) {
                    throw new Error('Your invite session is invalid. Please request a new invitation link.')
                }

                const { data: assignedProperties, error: assignedPropertiesError } = await supabase
                    .from('user_properties')
                    .select('property_id, properties(id, name)')
                    .eq('user_id', userData.user.id)

                if (assignedPropertiesError) throw assignedPropertiesError

                const assignedPropertyOptions = (assignedProperties || [])
                    .map((row) => {
                        const relatedProperty = row.properties as
                            | { id?: string; name?: string }
                            | { id?: string; name?: string }[]
                            | null
                        const normalizedProperty = Array.isArray(relatedProperty) ? relatedProperty[0] : relatedProperty
                        if (!normalizedProperty?.id || !normalizedProperty?.name) return null
                        return { id: normalizedProperty.id, name: normalizedProperty.name }
                    })
                    .filter((property): property is PropertyOption => !!property)

                const availableProperties = assignedPropertyOptions.length > 0
                    ? assignedPropertyOptions
                    : allPropertyOptions

                if (cancelled) return

                setJobTitleOptions(Array.from(new Set(normalizedJobTitles)))
                setPropertyOptions(Array.from(new Map(availableProperties.map((property) => [property.id, property])).values()))

                if (availableProperties.length === 1) {
                    setPropertyId(availableProperties[0].id)
                }
            } catch (err) {
                console.error('Failed to load invite setup options:', err)
                if (!cancelled) {
                    setError('Failed to load job titles and properties. Please refresh the page.')
                }
            } finally {
                if (!cancelled) {
                    setLoadingFormOptions(false)
                }
            }
        }

        loadFormOptions()

        return () => {
            cancelled = true
        }
    }, [tokenValid])

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

        const trimmedName = fullName.trim()
        const trimmedDob = dateOfBirth.trim()

        if (!trimmedName || !trimmedDob) {
            setError('Please complete full name and date of birth.')
            return
        }

        const parsedDob = new Date(trimmedDob)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (Number.isNaN(parsedDob.getTime()) || parsedDob > today) {
            setError('Please enter a valid date of birth.')
            return
        }

        if (!isPasswordValid) {
            setError('Please meet all password requirements')
            return
        }

        if (!doPasswordsMatch) {
            setError('Passwords do not match')
            return
        }

        if (!propertyId) {
            setError('Please select your property.')
            return
        }

        setLoading(true)

        try {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError || !userData.user) {
                throw new Error('Your invite link session is invalid or expired. Please request a new invite.')
            }

            const { data: completeInviteData, error: completeInviteError } = await supabase.functions.invoke(
                'complete-invite-profile',
                {
                    body: {
                        fullName: trimmedName,
                        dateOfBirth: trimmedDob,
                        phone: phone.trim() || null,
                        jobTitle: jobTitle || null,
                        propertyId,
                    },
                }
            )

            if (completeInviteError) {
                const maybeContext = completeInviteError as unknown as { context?: Response | { response?: Response } }
                const response = maybeContext?.context instanceof Response
                    ? maybeContext.context
                    : maybeContext?.context?.response
                if (response) {
                    const text = await response.text().catch(() => '')
                    let parsedError: string | undefined
                    if (text) {
                        try {
                            const parsed = JSON.parse(text) as { error?: string }
                            parsedError = parsed?.error
                        } catch {
                            parsedError = text
                        }
                    }
                    throw new Error(parsedError || completeInviteError.message || 'Failed to complete invite profile setup')
                }

                throw new Error(completeInviteError.message || 'Failed to complete invite profile setup')
            }

            if (completeInviteData?.error) {
                throw new Error(completeInviteData.error)
            }

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

            try {
                await refreshSession()
            } catch (refreshErr) {
                console.warn('Session refresh failed after invite completion:', refreshErr)
            }

            markWizardPending()
            setSuccess(true)

            setTimeout(() => {
                navigate('/home', { replace: true })
            }, 1200)
        } catch (err: unknown) {
            console.error('Complete invite error:', err)
            const errorMessage = err instanceof Error
                ? err.message
                : 'Failed to complete account setup. Please try again.'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (validatingToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-gray-600">Validating invite link...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                    <CardFooter>
                        <Button className="w-full" onClick={() => navigate('/login')}>
                            {t('forgot_password.back_to_login')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle>Account setup complete</CardTitle>
                        <CardDescription>
                            Redirecting you to the app...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <UserRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Complete your account setup</CardTitle>
                    <CardDescription>
                        Add your details and set your password to activate your account.
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

                        <div className="space-y-2">
                            <Label htmlFor="full-name">Full Name</Label>
                            <Input
                                id="full-name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date-of-birth">Date of Birth</Label>
                                <Input
                                    id="date-of-birth"
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone (Optional)</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="job-title">Job Title (Optional)</Label>
                            <select
                                id="job-title"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                disabled={loading || loadingFormOptions}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select job title</option>
                                {jobTitleOptions.map((titleOption) => (
                                    <option key={titleOption} value={titleOption}>
                                        {titleOption}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="property-id">Property</Label>
                            <select
                                id="property-id"
                                value={propertyId}
                                onChange={(e) => setPropertyId(e.target.value)}
                                disabled={loading || loadingFormOptions}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                required
                            >
                                <option value="">Select property</option>
                                {propertyOptions.map((propertyOption) => (
                                    <option key={propertyOption.id} value={propertyOption.id}>
                                        {propertyOption.name}
                                    </option>
                                ))}
                            </select>
                            {loadingFormOptions && (
                                <p className="text-xs text-gray-500">Loading properties...</p>
                            )}
                        </div>

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
                                    required
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
                                    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' },
                                ].map((req, i) => (
                                    <li key={i} className={`flex items-center gap-1 ${req.check ? 'text-green-600' : 'text-gray-500'}`}>
                                        {req.check ? <CheckCircle className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-gray-300" />}
                                        {req.text}
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
                                required
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
                            disabled={
                                loading ||
                                loadingFormOptions ||
                                !isPasswordValid ||
                                !doPasswordsMatch ||
                                !fullName.trim() ||
                                !dateOfBirth.trim() ||
                                !propertyId
                            }
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
