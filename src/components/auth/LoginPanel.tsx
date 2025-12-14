import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'

interface LoginPanelProps {
    className?: string
}

export function LoginPanel({ className = '' }: LoginPanelProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { signIn } = useAuth()
    const { toast } = useToast()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email || !password) {
            toast({
                title: 'Missing credentials',
                description: 'Please enter both email and password.',
                variant: 'destructive'
            })
            return
        }

        setIsLoading(true)

        try {
            const { error } = await signIn(email, password)

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
                // RoleBasedRedirect will handle navigation
                navigate('/', { replace: true })
            }
        } catch (err) {
            toast({
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
            {/* Header */}
            <div className="bg-hotel-navy text-white px-6 py-4 rounded-t-lg">
                <h3 className="text-lg font-semibold text-center">System Access</h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-gray-700 font-medium">
                        Username
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="pl-10 bg-white border-gray-300 focus:border-hotel-gold focus:ring-hotel-gold"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-gray-700 font-medium">
                        Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 bg-white border-gray-300 focus:border-hotel-gold focus:ring-hotel-gold"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-hotel-gold hover:bg-hotel-gold-dark text-white font-semibold py-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        </div>
    )
}

export default LoginPanel
