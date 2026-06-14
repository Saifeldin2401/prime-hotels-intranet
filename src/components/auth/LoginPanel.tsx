import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { getAuthFlowRedirectPath } from '@/lib/authFlowState'
import { getRedirectFromSearch, peekPostLoginRedirect } from '@/lib/authRedirect'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import * as z from 'zod'

const loginSchema = z.object({
    email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginPanelProps {
    className?: string
}

export function LoginPanel({ className = '' }: LoginPanelProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { signIn } = useAuth()
    const { toast } = useToast()
    const navigate = useNavigate()
    const location = useLocation()
    
    // Use ref to preserve redirect across renders - critical for when auth state changes during login
    const postLoginDestinationRef = useRef<string>('/')
    
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    useEffect(() => {
        // Capture redirect on mount (or when location changes)
        const redirectPath = getRedirectFromSearch(location.search)
        const pendingAuthFlowPath = getAuthFlowRedirectPath()
        const storedRedirect = peekPostLoginRedirect()
        const destination = pendingAuthFlowPath ?? redirectPath ?? storedRedirect ?? '/'
        
        postLoginDestinationRef.current = destination
    }, [location.search])

    const onSubmit = async (values: LoginFormValues) => {
        setIsLoading(true)

        try {
            const { error } = await signIn(values.email, values.password)

            if (error) {
                toast({
                    title: 'Login failed',
                    description: error.message || 'Invalid email or password.',
                    variant: 'destructive'
                })
            } else {
                toast({
                    title: 'Welcome back!',
                    description: 'Redirecting to your dashboard...',
                })
                navigate(postLoginDestinationRef.current, { replace: true })
            }
        } catch (_err) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const onInvalid = () => {
        toast({
            title: 'Missing credentials',
            description: 'Please enter both email and password.',
            variant: 'destructive'
        })
    }

    return (
        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
            {/* Header */}
            <div className="bg-hotel-navy text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold text-center">System Access</h3>
            </div>

            {/* Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="p-6 space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-gray-700 font-medium">
                                    Username
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="Enter your email"
                                            className="ps-10 bg-white border-gray-300 focus:border-hotel-gold focus:ring-hotel-gold"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-gray-700 font-medium">
                                    Password
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            {...field}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="ps-10 pe-10 bg-white border-gray-300 focus:border-hotel-gold focus:ring-hotel-gold"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-full bg-hotel-gold hover:bg-hotel-gold-dark text-white font-semibold py-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Login'
                        )}
                    </Button>

                    {/* Links */}
                    <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                        <a
                            href="/forgot-password"
                            className="block text-hotel-navy hover:text-hotel-gold transition-colors"
                        >
                            Login Password
                        </a>
                        <a
                            href="/forgot-password"
                            className="block text-hotel-navy hover:text-hotel-gold transition-colors"
                        >
                            System Password
                        </a>
                        <a
                            href="/help"
                            className="block text-hotel-navy hover:text-hotel-gold transition-colors"
                        >
                            System Login Assistance
                        </a>
                    </div>
                </form>
            </Form>
        </div>
    )
}

export default LoginPanel
