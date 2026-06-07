/**
 * MobileLogin Component
 * 
 * Mobile-optimized login page with:
 * - Simplified single-column layout
 * - Touch-friendly inputs
 * - Quick authentication options
 * - Biometric login support (if available)
 * - Offline mode indicator
 */

import { Button } from '@/components/ui/button'
import { TEMP_LEARNING_PORTAL_BRAND } from '@/config/temporaryLearningPortal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
// cn utility not currently used in this component
import { zodResolver } from '@hookform/resolvers/zod'
import { Fingerprint, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

/**
 * MobileLogin - Optimized login for mobile devices
 */
export function MobileLogin() {
    const { t } = useTranslation('auth')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { signIn } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [biometricAvailable] = useState(
        'credentials' in navigator && window.PublicKeyCredential !== undefined
    )

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true)
        try {
            const { error } = await signIn(data.email, data.password)
            if (error) throw error
            
            toast({
                title: t('login_success', 'Welcome back!'),
                description: t('login_success_desc', 'You have successfully logged in.'),
            })
            navigate('/')
        } catch (error) {
            toast({
                title: t('login_error', 'Login failed'),
                description: error instanceof Error ? error.message : t('invalid_credentials'),
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleBiometricLogin = async () => {
        // Placeholder for biometric authentication
        toast({
            title: t('biometric_not_available', 'Biometric login'),
            description: t('biometric_coming_soon', 'Coming soon!'),
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-hotel-navy via-hotel-navy to-hotel-navy-dark flex flex-col">
            {/* Header */}
            <div className="flex-1 flex flex-col justify-center px-6 py-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <img
                            src={TEMP_LEARNING_PORTAL_BRAND.logo}
                            alt={TEMP_LEARNING_PORTAL_BRAND.fullName}
                            className="w-16 h-16 object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {TEMP_LEARNING_PORTAL_BRAND.productName}
                    </h1>
                    <p className="text-white/60 text-sm">
                        {t('sign_in_to_continue', 'Sign in to continue')}
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-white/80">
                            {t('email', 'Email')}
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@dyafa.com"
                                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-red-400 text-xs">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-white/80">
                            {t('password', 'Password')}
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-400 text-xs">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Forgot Password */}
                    <div className="text-right">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-sm text-hotel-gold hover:text-hotel-gold-light"
                        >
                            {t('forgot_password', 'Forgot Password?')}
                        </button>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full h-12 bg-hotel-gold hover:bg-hotel-gold-dark text-white font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            t('sign_in', 'Sign In')
                        )}
                    </Button>

                    {/* Biometric Login */}
                    {biometricAvailable && (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full h-12 border-white/20 text-white hover:bg-white/10"
                            onClick={handleBiometricLogin}
                        >
                            <Fingerprint className="h-5 w-5 mr-2" />
                            {t('biometric_login', 'Biometric Login')}
                        </Button>
                    )}
                </form>

                {/* Help */}
                <div className="mt-8 text-center">
                    <p className="text-white/40 text-sm">
                        {t('need_help', 'Need help?')}{' '}
                        <button
                            onClick={() => navigate('/knowledge')}
                            className="text-hotel-gold hover:underline"
                        >
                            {t('contact_support', 'Contact Support')}
                        </button>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="py-4 px-6 text-center">
                <p className="text-white/30 text-xs">
                    © {new Date().getFullYear()} PRIME Hotels Group. All rights reserved.
                </p>
            </div>
        </div>
    )
}
