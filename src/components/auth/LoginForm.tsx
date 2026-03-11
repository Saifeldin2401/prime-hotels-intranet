import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
  Shield,
  CheckCircle2,
  WifiOff,
  AlertTriangle,
  LockKeyhole
} from 'lucide-react'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { cn } from '@/lib/utils'
import { showSuccessToast, showErrorToast } from '@/lib/toastHelpers'
import { supabase } from '@/lib/supabase'

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'too_short', color: 'bg-gray-200' }
  if (password.length < 6) return { score: 1, label: 'too_short', color: 'bg-red-500' }

  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  const labels = ['weak', 'weak', 'fair', 'good', 'strong']
  const colors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return {
    score,
    label: labels[score] || 'weak',
    color: colors[score] || 'bg-red-500'
  }
}

// Floating Label Input Component
interface FloatingInputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  isRTL?: boolean;
  rightElement?: React.ReactNode;
  valid?: boolean | null;
}

function FloatingInput({
  id,
  type,
  value,
  onChange,
  onFocus,
  onBlur,
  label,
  icon: Icon,
  disabled,
  isRTL,
  rightElement,
  valid
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const isActive = isFocused || value.length > 0

  return (
    <div className="relative">
      {/* Icon */}
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300",
        isRTL ? 'right-4' : 'left-4',
        isActive ? "text-primary" : "text-gray-400"
      )}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => { setIsFocused(true); onFocus?.(); }}
        onBlur={() => { setIsFocused(false); onBlur?.(); }}
        disabled={disabled}
        className={cn(
          "w-full h-14 pt-4 pb-1.5 bg-gray-50/50 dark:bg-gray-800/50 border-2 rounded-xl outline-none transition-all duration-300",
          isRTL ? "pr-12 text-right" : "pl-12 text-left",
          rightElement ? (isRTL ? "pl-12" : "pr-12") : "",
          isActive
            ? "border-primary/50 bg-white dark:bg-gray-800 shadow-sm"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          valid === true && "border-green-500/50",
          valid === false && value && "border-red-500/50",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        placeholder=" "
      />

      {/* Floating Label */}
      <label
        htmlFor={id}
        className={cn(
          "absolute pointer-events-none transition-all duration-300",
          isRTL ? "right-12" : "left-12",
          isActive
            ? "top-1.5 text-xs font-medium text-primary"
            : "top-1/2 -translate-y-1/2 text-sm text-gray-500"
        )}
      >
        {label}
      </label>

      {/* Right Element */}
      {rightElement && (
        <div className={cn(
          "absolute top-1/2 -translate-y-1/2",
          isRTL ? 'left-3' : 'right-3'
        )}>
          {rightElement}
        </div>
      )}

      {/* Validation Indicator */}
      <AnimatePresence>
        {valid === true && (
          <m.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              isRTL ? 'left-3' : 'right-10'
            )}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LoginForm() {
  const { t, i18n } = useTranslation('auth')
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'forgot_success'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'auth' | 'network' | 'rate'>('auth')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetEmailValid, setResetEmailValid] = useState<boolean | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const { signIn } = useAuth()
  // toasts via toastHelpers (showSuccessToast / showErrorToast)
  const isRTL = i18n.dir() === 'rtl'

  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
      setEmailValid(true)
    }
  }, [])

  // Detect Caps Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')) {
        setCapsLockOn(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === 'function' && !e.getModifierState('CapsLock')) {
        setCapsLockOn(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setEmailValid(value ? emailRegex.test(value) : null)
  }

  const validateResetEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setResetEmailValid(value ? emailRegex.test(value) : null)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    validateEmail(value)
    if (error) setError(null)
  }

  const handleResetEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setResetEmail(value)
    validateResetEmail(value)
    if (resetError) setResetError(null)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) setError(null)
  }

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
        let errorMessage = error.message
        let errType: 'auth' | 'network' | 'rate' = 'auth'

        if (errorMessage === 'Invalid login credentials') {
          errorMessage = t('errors.invalid_credentials')
          errType = 'auth'
        } else if (errorMessage?.toLowerCase().includes('rate') || errorMessage?.toLowerCase().includes('too many')) {
          errorMessage = t('errors.rate_limit')
          errType = 'rate'
        } else if (errorMessage?.toLowerCase().includes('network') || errorMessage?.toLowerCase().includes('fetch')) {
          errorMessage = t('errors.network_error')
          errType = 'network'
        } else if (errorMessage?.toLowerCase().includes('disabled') || errorMessage?.toLowerCase().includes('blocked')) {
          errorMessage = t('errors.account_disabled')
        }

        if (!errorMessage) errorMessage = t('errors.title')

        setErrorType(errType)
        setError(errorMessage)
        showErrorToast(t('errors.title'), errorMessage)
        setLoading(false)
      } else {
        setSuccess(true)
        showSuccessToast(t('welcome_back'), t('redirecting'))
        // Redirect handled by AuthContext/AppRouter
      }
    } catch (err) {
      setErrorType('network')
      setError(t('errors.network_error'))
      showErrorToast(t('errors.title'), t('errors.network_error'))
      setLoading(false)
    }
  }

  const openForgotPassword = () => {
    const trimmed = email.trim()
    setResetEmail(trimmed)
    validateResetEmail(trimmed)
    setResetError(null)
    setAuthView('forgot')
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)
    setResetLoading(true)

    try {
      const trimmed = resetEmail.trim()
      if (!trimmed || !trimmed.includes('@')) {
        throw new Error(t('forgot_password.invalid_email'))
      }

      const { error: invokeError } = await supabase.functions.invoke('public-forgot-password', {
        body: { email: trimmed.toLowerCase() },
      })

      if (invokeError) {
        console.error('Reset password error:', invokeError)

        if (invokeError.message?.toLowerCase().includes('too many') || invokeError.status === 429) {
          setErrorType('rate')
          setResetError(t('errors.too_many_requests'))
        } else {
          setResetError(t('errors.reset_password_failed'))
        }
        setResetLoading(false)
        return
      }

      setAuthView('forgot_success')
      showSuccessToast(t('forgot_password.success_title'), t('forgot_password.success_message'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('forgot_password.error')
      setResetError(message)
      showErrorToast(t('errors.title'), message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setAuthView('login')
    setResetError(null)
    setResetLoading(false)
  }

  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-5 w-5 shrink-0" />
      case 'rate':
        return <AlertTriangle className="h-5 w-5 shrink-0" />
      default:
        return <AlertCircle className="h-5 w-5 shrink-0" />
    }
  }

  if (success) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center space-y-6"
        >
          <m.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-full flex items-center justify-center shadow-lg"
          >
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </m.div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('welcome_back')}
            </h3>
            <p className="text-gray-500">{t('redirecting')}</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </m.div>
      </LazyMotion>
    )
  }

  if (authView === 'forgot_success') {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-10 text-center space-y-6"
        >
          <m.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-full flex items-center justify-center shadow-lg"
          >
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </m.div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('forgot_password.success_title')}
            </h3>
            <p className="text-gray-500">
              {t('forgot_password.success_message')}
            </p>
          </div>
          <div className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="truncate">{resetEmail}</span>
            </div>
          </div>
          <div className="w-full space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setResetEmail('')
                setResetEmailValid(null)
                setAuthView('forgot')
              }}
            >
              {t('forgot_password.try_different')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToLogin}
            >
              <ArrowRight className={cn("h-4 w-4 mr-2 rotate-180", isRTL && 'rotate-0')} />
              {t('forgot_password.back_to_login')}
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            {t('forgot_password.check_spam')}
          </p>
        </m.div>
      </LazyMotion>
    )
  }

  if (authView === 'forgot') {
    return (
      <LazyMotion features={domAnimation}>
        <m.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleForgotSubmit}
          className="space-y-5"
        >
        <div className="space-y-2 text-center">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {t('forgot_password.title')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('forgot_password.description')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {resetError && (
            <m.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="text-sm p-4 rounded-xl flex items-start gap-3 border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-800/30">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold">{t('errors.title')}</p>
                <p className="text-sm opacity-90 mt-0.5">{resetError}</p>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <FloatingInput
          id="reset-email"
          type="email"
          value={resetEmail}
          onChange={handleResetEmailChange}
          onFocus={() => setFocusedField('reset-email')}
          onBlur={() => setFocusedField(null)}
          label={t('forgot_password.email_label')}
          icon={Mail}
          disabled={resetLoading}
          isRTL={isRTL}
          valid={resetEmailValid}
        />

        <Button
          type="submit"
          className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={resetLoading || !resetEmailValid}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {resetLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('forgot_password.sending')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{t('forgot_password.send_link')}</span>
              <ArrowRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-1", isRTL && 'rotate-180 group-hover:-translate-x-1')} />
            </div>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm font-semibold"
          onClick={handleBackToLogin}
        >
          <ArrowRight className={cn("h-4 w-4 mr-2 rotate-180", isRTL && 'rotate-0')} />
          {t('forgot_password.back_to_login')}
        </Button>
        </m.form>
      </LazyMotion>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
      <div className="space-y-5">
        {/* Email Field */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <FloatingInput
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            label={t('email_label')}
            icon={Mail}
            disabled={loading}
            isRTL={isRTL}
            valid={emailValid}
          />
        </m.div>

        {/* Password Field */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-3"
        >
          <div className="relative">
            <FloatingInput
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              label={t('password_label')}
              icon={Lock}
              disabled={loading}
              isRTL={isRTL}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={showPassword ? t('hide_password') : t('show_password')}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
          </div>

          {/* Password Strength Indicator */}
          <AnimatePresence>
            {password && focusedField === 'password' && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      className={cn("h-full rounded-full transition-colors duration-300", passwordStrength.color)}
                    />
                  </div>
                  <span className="text-xs text-gray-500 min-w-[60px] text-right font-medium">
                    {t(`password_strength.${passwordStrength.label}`)}
                  </span>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Caps Lock Warning */}
          <AnimatePresence>
            {capsLockOn && focusedField === 'password' && (
              <m.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center gap-2.5 text-amber-600 text-xs bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-800/10 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/30"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                  <LockKeyhole className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium">{t('caps_lock_on')}</span>
              </m.div>
            )}
          </AnimatePresence>
        </m.div>

        {/* Remember Me & Forgot Password */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
            />
            <label
              htmlFor="remember"
              className="text-sm text-gray-600 dark:text-gray-400 font-medium cursor-pointer select-none"
            >
              {t('remember_me')}
            </label>
          </div>

          <button
            type="button"
            onClick={openForgotPassword}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4"
          >
            {t('forgot_password.title')}
          </button>
        </m.div>
      </div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <m.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className={cn(
              "text-sm p-4 rounded-xl flex items-start gap-3 border",
              errorType === 'network' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
              errorType === 'rate' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
              errorType === 'auth' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              errorType === 'network' && "bg-amber-100 dark:bg-amber-800/30",
              errorType === 'rate' && "bg-orange-100 dark:bg-orange-800/30",
              errorType === 'auth' && "bg-red-100 dark:bg-red-800/30"
            )}>
              {getErrorIcon()}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="font-semibold">{t('errors.title')}</p>
              <p className="text-sm opacity-90 mt-0.5">{error}</p>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Button
          type="submit"
          className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || !emailValid}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('logging_in')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{t('sign_in_button')}</span>
              <ArrowRight className={cn("h-5 w-5 transition-transform group-hover:translate-x-1", isRTL && 'rotate-180 group-hover:-translate-x-1')} />
            </div>
          )}
        </Button>
      </m.div>

      {/* Security Tips */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="pt-4 border-t border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Shield className="h-3 w-3" />
          </div>
          <span className="font-semibold uppercase tracking-wider">{t('security_tips.title')}</span>
        </div>
        <ul className="text-xs text-gray-400 space-y-1.5">
          <li className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            {t('security_tips.never_share')}
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            {t('security_tips.logout')}
          </li>
        </ul>
      </m.div>
      </m.form>
    </LazyMotion>
  )
}
