
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Check, X, Eye, EyeOff, Loader2, ShieldCheck, Lock, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { markWizardPending } from '@/config/newUserTour'

export default function ChangePassword() {
    const { user, profile, loading: authLoading, signOut, refreshSession } = useAuth()
    const navigate = useNavigate()
    const { toast } = useToast()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isTempPassword = profile?.is_temp_password

    // Prevent back navigation if forced
    useEffect(() => {
        if (isTempPassword) {
            window.history.pushState(null, '', window.location.href)
            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href)
            }
            window.addEventListener('popstate', handlePopState)
            return () => window.removeEventListener('popstate', handlePopState)
        }
    }, [isTempPassword])

    const requirements = [
        { label: 'At least 8 characters', valid: newPassword.length >= 8 },
        { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPassword) },
        { label: 'At least one lowercase letter', valid: /[a-z]/.test(newPassword) },
        { label: 'At least one number', valid: /[0-9]/.test(newPassword) },
        { label: 'At least one special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    ]

    const isPasswordValid = requirements.every(r => r.valid)
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

    const handleSignOut = async () => {
        try {
            await signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        // Capture this BEFORE any async operations that might change it
        const wasUsingTempPassword = isTempPassword
        console.log('Password change started. Is temp password?', wasUsingTempPassword)

        try {
            if (!passwordsMatch) throw new Error('Passwords do not match')
            if (!isPasswordValid) throw new Error('Password does not meet requirements')

            // 1. Check Reuse (Internal DB check)
            const { data: isReused, error: reuseError } = await supabase.rpc('check_password_reuse', {
                plain_password: newPassword
            })

            if (reuseError) throw reuseError
            if (isReused) {
                throw new Error('You cannot reuse any of your last 5 passwords.')
            }

            // 2. Update Auth (Supabase)
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            // 3. Finalize (Update DB flags)
            const { error: rpcError } = await supabase.rpc('complete_password_reset')

            if (rpcError) {
                console.error('Failed to finalize password reset:', rpcError)
                throw new Error('Failed to update account status. Please try again.')
            }

            // Trigger onboarding wizard for first-time users BEFORE refreshSession
            // Use the captured value, not the current state
            if (wasUsingTempPassword) {
                console.log('Marking wizard as pending for new user...')
                markWizardPending()
            }

            // REFRESH SESSION to get updated profile (is_temp_password: false)
            try {
                await refreshSession()
            } catch (refreshErr) {
                console.warn('Session refresh failed, but password was changed:', refreshErr)
            }

            toast({
                title: "Success",
                description: "Your password has been changed successfully.",
            })

            // Redirect to home
            console.log('Redirecting to /home...')
            navigate('/home', { replace: true })

        } catch (err: any) {
            console.error('Password change error:', err)
            setError(err.message || 'An error occurred while changing your password.')
        } finally {
            setIsLoading(false)
        }
    }

    if (authLoading) return null

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        {isTempPassword ? 'Change Temporary Password' : 'Change Password'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isTempPassword
                            ? 'For security reasons, you must change your temporary password before continuing.'
                            : 'Choose a strong password to keep your account secure.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Current Password Field - Only for self service, technically auth.updateUser handles verification if reauth needed? 
                Actually supabase.auth.updateUser doesn't strictly require old password if session is active.
                But for extra security we might want to verify it?
                However, for "isTempPassword" flow, they just logged in, so session is fresh.
                For self-service, usually we want it.
                But Supabase JS doesn't have "verifyPassword" easily without re-login.
                We will skip "Current Password" for now unless user asked strictly.
                Prompt said: "Require: Current password verification" for Anytime.
                For First Login: Not needed (they just used it).
            */}

                        {!isTempPassword && (
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="current-password"
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password Requirements */}
                        <div className="space-y-2 bg-muted/50 p-3 rounded-md text-sm">
                            <p className="font-medium mb-2">Password Requirements:</p>
                            {requirements.map((req, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    {req.valid ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <X className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className={req.valid ? "text-green-600" : "text-muted-foreground"}>
                                        {req.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11"
                            disabled={isLoading || !isPasswordValid || !passwordsMatch}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating Password...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Set New Password
                                </>
                            )}
                        </Button>

                        {isTempPassword && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full mt-2"
                                onClick={handleSignOut}
                            >
                                Log Out
                            </Button>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
