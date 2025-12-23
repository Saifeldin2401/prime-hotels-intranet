import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function LoginForm() {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const isRTL = i18n.dir() === 'rtl'

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (rememberMe) {
      localStorage.setItem('remembered_email', email)
    } else {
      localStorage.removeItem('remembered_email')
    }

    try {
      const { error } = await signIn(email, password)

      if (error) {
        const errorMessage = error.message || t('errors.invalid_credentials')
        setError(errorMessage)
        toast.error(t('errors.title'), {
          description: errorMessage
        })
        setLoading(false)
      } else {
        // Sign in successful
        toast.success(t('sign_in_title'), {
          description: t('welcome_back', 'Welcome back to Prime Hotels'),
        })
        // Redirect handled by AuthContext/AppRouter, but we can ensure navigation
      }
    } catch (err) {
      setError(t('errors.network_error'))
      toast.error(t('errors.title'), {
        description: t('errors.network_error')
      })
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium">
            {t('email_label')}
          </Label>
          <div className="relative group">
            <div className={`absolute top-2.5 text-gray-400 group-focus-within:text-primary transition-colors ${isRTL ? 'right-3' : 'left-3'}`}>
              <Mail className="h-5 w-5" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder={t('email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className={cn(
                "h-12 transition-all bg-gray-50/50 border-gray-200 focus:bg-white focus:border-primary focus:ring-primary/20",
                isRTL ? "pr-10" : "pl-10"
              )}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              {t('password_label')}
            </Label>
          </div>
          <div className="relative group">
            <div className={`absolute top-2.5 text-gray-400 group-focus-within:text-primary transition-colors ${isRTL ? 'right-3' : 'left-3'}`}>
              <Lock className="h-5 w-5" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t('password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className={cn(
                "h-12 transition-all bg-gray-50/50 border-gray-200 focus:bg-white focus:border-primary focus:ring-primary/20",
                isRTL ? "pr-10 pl-10" : "pl-10 pr-10"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute top-3 text-gray-400 hover:text-gray-600 transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
              aria-label={showPassword ? t('hide_password') : t('show_password')}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="remember"
              className="text-sm text-gray-600 font-normal cursor-pointer select-none"
            >
              {t('remember_me')}
            </Label>
          </div>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:text-accent transition-colors hover:underline"
          >
            {t('forgot_password')}
          </Link>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-heading"
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('logging_in')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>{t('sign_in_button')}</span>
            <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        )}
      </Button>
    </motion.form>
  )
}

