import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRedirectFromSearch } from '@/lib/authRedirect'
import { supabase } from '@/lib/supabase'
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

export default function ForgotPassword() {
    const { t } = useTranslation('auth')
    const location = useLocation()
    const redirectPath = getRedirectFromSearch(location.search)
    const loginUrl = redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            // Validate email
            if (!email.trim() || !email.includes('@')) {
                throw new Error('Please enter a valid email address')
            }

            const normalizedEmail = email.trim().toLowerCase()

            const { error: invokeError } = await supabase.functions.invoke('public-forgot-password', {
                body: { email: normalizedEmail },
            })

            if (invokeError) {
                console.error('Password reset invoke error:', invokeError)
                if (invokeError.message?.toLowerCase().includes('too many')) {
                    setError('Too many requests. Please try again later.')
                    return
                }
            }

            setSuccess(true)
        } catch (err: unknown) {
            console.error('Password reset error:', err)
            const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-ds-surface-subtle px-4 py-12">
                <div className="w-full max-w-md flex flex-col items-center">
                    <div className="mt-16 mb-8 text-center">
                        <img src="/altus-logo-light.png" alt="Altus" className="h-14 w-auto mx-auto object-contain" />
                    </div>
                    <Card className="w-full">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-ds-success-soft rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="h-6 w-6 text-ds-success" />
                            </div>
                            <CardTitle>{t('forgot_password.success_title')}</CardTitle>
                            <CardDescription>
                                {t('forgot_password.success_message')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <div className="p-4 bg-ds-surface-subtle dark:bg-muted/50 rounded-lg">
                                <Mail className="h-5 w-5 mx-auto text-ds-muted mb-2" />
                                <p className="text-sm text-ds-muted">{email}</p>
                            </div>
                            <p className="text-sm text-ds-muted">
                                {t('forgot_password.check_spam')}
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSuccess(false)
                                    setEmail('')
                                }}
                            >
                                {t('forgot_password.try_different')}
                            </Button>
                            <Link to={loginUrl} className="w-full">
                                <Button variant="ghost" className="w-full">
                                    <ArrowLeft className="h-4 w-4 me-2" />
                                    {t('forgot_password.back_to_login')}
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ds-surface-subtle px-4 py-12">
            <div className="w-full max-w-md flex flex-col items-center">
                <div className="mt-16 mb-8 text-center">
                    <img src="/altus-logo-light.png" alt="Altus" className="h-14 w-auto mx-auto object-contain" />
                </div>
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <CardTitle>{t('forgot_password.title')}</CardTitle>
                        <CardDescription>
                            {t('forgot_password.description')}
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-ds-danger-soft border border-ds-danger/30 rounded-md text-ds-danger">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">{t('forgot_password.email_label')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@altusadvisory.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin me-2" />
                                        {t('forgot_password.sending')}
                                    </>
                                ) : (
                                    t('forgot_password.send_link')
                                )}
                            </Button>
                            <Link to={loginUrl} className="w-full">
                                <Button variant="outline" className="w-full" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4 me-2" />
                                    {t('forgot_password.back_to_login')}
                                </Button>
                            </Link>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
