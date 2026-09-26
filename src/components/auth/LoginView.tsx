import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  Mail,
  ShieldCheck,
  WifiOff,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FloatingInput } from './FloatingInput';
import { PasswordField } from './PasswordField';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { cn } from '@/lib/utils';
import { showErrorToast } from '@/lib/toastHelpers';
import { useAuth } from '@/hooks/useAuth';
import { getRemainingAttempts } from '@/lib/authSecurityService';
import { safeLocalStorage, safeSessionStorage } from '@/lib/storage';
import { REMEMBER_ME_KEY } from '@/hooks/useInactivityTimeout';

type ErrorType = 'auth' | 'network' | 'rate' | 'lockout';

interface LoginViewProps {
  isRTL?: boolean;
  onForgotPassword: () => void;
  /** Called with the current email when the user triggers self-service account unlock */
  onUnlockAccount?: (email: string) => void;
}

function LoginViewComponent({ isRTL = false, onForgotPassword, onUnlockAccount }: LoginViewProps) {
  const { t, i18n } = useTranslation('auth');
  const { signIn, signInWithGoogle, user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const isTimeoutRedirect = searchParams.get('reason') === 'timeout';
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email');
  const isNotRegistered = errorParam === 'not_registered';

  const [email, setEmail] = useState(() => searchParams.get('email') || safeLocalStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    const isRemembered = safeLocalStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const hasSavedEmail = safeLocalStorage.hasItem('remembered_email');
    return isRemembered || hasSavedEmail;
  });
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get('error') === 'not_registered') {
      const emailP = searchParams.get('email');
      return emailP
        ? t('errors.not_registered', { email: emailP, defaultValue: `This account (${emailP}) is not registered in our system. Please contact your hotel administrator to get access.` })
        : t('errors.not_registered_generic', { defaultValue: 'This account is not registered in our system. Please contact your hotel administrator to get access.' });
    }
    return null;
  });
  const [errorType, setErrorType] = useState<ErrorType>('auth');
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(() => {
    const initialEmail = searchParams.get('email') || safeLocalStorage.getItem('remembered_email');
    if (initialEmail) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(initialEmail);
    }
    return null;
  });

  const [capsLockOn, setCapsLockOn] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const passwordStrength = usePasswordStrength(password);

  const lastLoginRaw = safeLocalStorage.getItem('altus_last_login');
  const rememberedEmail = safeLocalStorage.getItem('remembered_email');
  
  const lastLoginTime = useMemo(() => {
    if (!lastLoginRaw) return null;
    try {
      const diffMs = Date.now() - new Date(lastLoginRaw).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      const rtf = new Intl.RelativeTimeFormat(i18n.language || 'en', { numeric: 'auto' });
      if (diffDays > 0) return rtf.format(-diffDays, 'day');
      if (diffHours > 0) return rtf.format(-diffHours, 'hour');
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return rtf.format(-diffMinutes || 0, 'minute');
    } catch {
      return null;
    }
  }, [lastLoginRaw, i18n.language]);

  // Set not_registered error if present in search params
  useEffect(() => {
    if (isNotRegistered) {
      const msg = emailParam
        ? t('errors.not_registered', { email: emailParam, defaultValue: `This account (${emailParam}) is not registered in our system. Please contact your hotel administrator to get access.` })
        : t('errors.not_registered_generic', { defaultValue: 'This account is not registered in our system. Please contact your hotel administrator to get access.' });
      setError(msg);
      setErrorType('auth');
      if (emailParam) {
        setEmail(emailParam);
        setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailParam));
      }
    }
  }, [isNotRegistered, emailParam, t]);

  // Check remaining attempts on mount and email change
  useEffect(() => {
    if (email) {
      void (async () => {
        const remaining = await getRemainingAttempts(email);
        setRemainingAttempts(remaining);
      })();
    }
  }, [email]);

  // Detect Caps Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        typeof e.getModifierState === 'function' &&
        e.getModifierState('CapsLock')
      ) {
        setCapsLockOn(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        typeof e.getModifierState === 'function' &&
        !e.getModifierState('CapsLock')
      ) {
        setCapsLockOn(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const validateEmail = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(value ? emailRegex.test(value) : null);
  }, []);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);
      validateEmail(value);
      if (error) setError(null);

      if (value) {
        void (async () => {
          const remaining = await getRemainingAttempts(value);
          setRemainingAttempts(remaining);
        })();
      }
    },
    [error, validateEmail]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (error) setError(null);
    },
    [error]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          let errorMessage = signInError.message;
          let errType: ErrorType = 'auth';

          if (errorMessage === 'Invalid login credentials') {
            errorMessage = t('errors.invalid_credentials');
            errType = 'auth';
            const remaining = await getRemainingAttempts(email);
            setRemainingAttempts(remaining);
          } else if (
            errorMessage?.toLowerCase().includes('rate') ||
            errorMessage?.toLowerCase().includes('too many')
          ) {
            errorMessage = t('errors.rate_limit');
            errType = 'rate';
          } else if (
            errorMessage?.toLowerCase().includes('network') ||
            errorMessage?.toLowerCase().includes('fetch')
          ) {
            errorMessage = t('errors.network_error');
            errType = 'network';
          } else if (
            errorMessage?.toLowerCase().includes('disabled') ||
            errorMessage?.toLowerCase().includes('blocked') ||
            errorMessage?.toLowerCase().includes('locked')
          ) {
            errorMessage = t('errors.account_locked');
            errType = 'lockout';
          } else if (errorMessage === 'CAPTCHA_REQUIRED') {
            errorMessage = t('errors.captcha_required');
            errType = 'auth';
          }

          if (!errorMessage) errorMessage = t('errors.title');

          setErrorType(errType);
          setError(errorMessage);
          showErrorToast(t('errors.title'), errorMessage);
          setLoading(false);
          return;
        }

        // On successful sign-in, persist or clear remember-me flags
        if (rememberMe) {
          safeLocalStorage.setItem('remembered_email', email);
          safeLocalStorage.setItem(REMEMBER_ME_KEY, 'true');
          safeSessionStorage.setItem('altus_session_active', 'true');
        } else {
          safeLocalStorage.removeItem('remembered_email');
          safeLocalStorage.removeItem(REMEMBER_ME_KEY);
          safeSessionStorage.setItem('altus_session_active', 'true');
        }

        safeLocalStorage.setItem('altus_last_login', new Date().toISOString());

        setLoginSuccess(true);
      } catch (_err) {
        setErrorType('network');
        setError(t('errors.network_error'));
        showErrorToast(t('errors.title'), t('errors.network_error'));
        setLoading(false);
      }
    },
    [email, password, rememberMe, signIn, t]
  );

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setError(null);
      setGoogleLoading(true);
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message || t('errors.network_error'));
        setErrorType('auth');
        setGoogleLoading(false);
      }
    } catch (_err) {
      setError(t('errors.network_error'));
      setErrorType('network');
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, t]);

  const getErrorIcon = useCallback(() => {
    if (isNotRegistered) {
      return <ShieldAlert className="h-4 w-4 shrink-0 text-ds-danger" aria-hidden="true" />;
    }
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-4 w-4 shrink-0 text-ds-warning" aria-hidden="true" />;
      case 'rate':
      case 'lockout':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-ds-warning" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-4 w-4 shrink-0 text-ds-danger" aria-hidden="true" />;
    }
  }, [errorType, isNotRegistered]);

  // Show transition state on authentication success (only if not an unregistered rejection)
  if (!isNotRegistered && (loginSuccess || user)) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="relative mb-4">
            <div className="w-14 h-14 rounded-full bg-ds-success-soft text-ds-success flex items-center justify-center border border-ds-success/20 relative z-10">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            {[...Array(8)].map((_, i) => (
              <m.div
                key={i}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-ds-brass"
                initial={{ x: "-50%", y: "-50%", opacity: 1 }}
                animate={{
                  x: `calc(-50% + ${Math.cos((i * 45 * Math.PI) / 180) * 45}px)`,
                  y: `calc(-50% + ${Math.sin((i * 45 * Math.PI) / 180) * 45}px)`,
                  opacity: 0,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </div>
          <h3 className="text-lg font-semibold text-ds-ink">
            {t('welcome_back', { defaultValue: 'Welcome Back' })}
          </h3>
          <p className="text-xs text-ds-muted mt-1">
            {t('redirecting', { defaultValue: 'Redirecting to your dashboard...' })}
          </p>
          <Loader2 className="h-5 w-5 animate-spin mt-4 text-ds-brass" />
        </m.div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-label={t('sign_in_title', { defaultValue: 'Sign in' })}
      >
        {/* Last Login Indicator */}
        {rememberedEmail && lastLoginRaw && lastLoginTime && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 text-[11px] text-ds-muted mb-2 px-1"
          >
            <Clock className="w-3 h-3" />
            <span>{t('last_login_indicator', { time: lastLoginTime, defaultValue: `Last signed in {{time}}` })}</span>
          </m.div>
        )}

        {/* Email Field */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <FloatingInput
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            label={t('email_label', { defaultValue: 'Email address' })}
            icon={Mail}
            disabled={loading}
            isRTL={isRTL}
            valid={emailValid}
            autoComplete="email"
          />
        </m.div>

        {/* Password Field */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
          <PasswordField
            value={password}
            onChange={handlePasswordChange}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            disabled={loading}
            isRTL={isRTL}
            showStrength={true}
            strengthScore={passwordStrength.score}
            strengthColor={passwordStrength.color}
            strengthLabel={t(`password_strength.${passwordStrength.label}`)}
            showCapsLock={true}
            isCapsLockOn={capsLockOn}
            isFocused={focusedField === 'password'}
          />
        </m.div>

        {/* Session Timeout Expiration Notice */}
        <AnimatePresence>
          {isTimeoutRedirect && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="bg-ds-warning-soft/80 border-ds-warning/30 text-ds-warning rounded-lg p-3">
                <Clock className="h-4 w-4 shrink-0 text-ds-warning" />
                <AlertDescription className="text-xs font-medium text-ds-ink">
                  {t('session_timeout.expired_message', {
                    defaultValue: 'Your session expired due to inactivity. Please sign in again to continue.'
                  })}
                </AlertDescription>
              </Alert>
            </m.div>
          )}
        </AnimatePresence>

        {/* Remaining Attempts Warning */}
        <AnimatePresence>
          {remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="bg-ds-warning-soft/60 border-ds-warning/30 text-ds-ink rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 text-ds-warning shrink-0" />
                <AlertDescription className="text-xs text-ds-ink-secondary">
                  {t('security.remaining_attempts', {
                    count: remainingAttempts,
                    defaultValue: `${remainingAttempts} login attempt${remainingAttempts === 1 ? '' : 's'} remaining before temporary lockout.`,
                  })}
                </AlertDescription>
              </Alert>
            </m.div>
          )}
        </AnimatePresence>

        {/* Remember Me & Forgot Password */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }} className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-ds-border bg-ds-surface text-ds-brass focus:ring-ds-brass/20 accent-ds-brass cursor-pointer"
              aria-label={t('remember_me', { defaultValue: 'Remember me' })}
            />
            <label
              htmlFor="remember"
              className="text-xs text-ds-ink-secondary cursor-pointer select-none font-normal"
            >
              {t('remember_me', { defaultValue: 'Remember me' })}
            </label>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-medium text-ds-brass hover:text-ds-accent-hover transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass rounded-xs"
          >
            {t('forgot_password.title', { defaultValue: 'Forgot password?' })}
          </button>
        </m.div>

        {/* Error Alert Box */}
        <AnimatePresence mode="wait">
          {error && (
            <m.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              className={cn(
                'text-xs p-3 rounded-lg flex items-start gap-2.5 border',
                errorType === 'network' && 'bg-ds-surface-subtle text-ds-ink border-ds-border',
                (errorType === 'rate' || errorType === 'lockout') &&
                  'bg-ds-warning-soft/80 text-ds-ink border-ds-warning/30',
                errorType === 'auth' && 'bg-ds-danger-soft/80 text-ds-ink border-ds-danger/30'
              )}
              role="alert"
              aria-live="assertive"
            >
              <div className="mt-0.5 shrink-0">{getErrorIcon()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ds-ink">
                  {isNotRegistered
                    ? t('errors.not_registered_title', { defaultValue: 'Account Not Registered' })
                    : t('errors.title')}
                </p>
                <p className="text-xs text-ds-ink-secondary mt-0.5 leading-relaxed">{error}</p>

                {isNotRegistered && (
                  <p className="text-[11px] text-ds-muted mt-2 pt-2 border-t border-ds-danger/20 leading-relaxed">
                    {t('errors.not_registered_hint', { defaultValue: 'Only authorized hotel staff and learners with an active account can access PRIME Connect.' })}
                  </p>
                )}

                {/* Self-service account unlock button if lockout triggered */}
                {errorType === 'lockout' && onUnlockAccount && (
                  <button
                    type="button"
                    onClick={() => onUnlockAccount(email)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-ds-warning text-white text-xs font-medium hover:bg-ds-warning/90 transition-colors shadow-xs"
                    aria-label={t('account_locked.unlock_button')}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {t('account_locked.unlock_button')}
                  </button>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Primary CTA Button: Altus Connect Brass Treatment (48-52px, restrained radius, strong contrast) */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }} className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 bg-ds-brass hover:bg-ds-accent-hover text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer relative overflow-hidden group"
            disabled={loading || emailValid === false}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {loading ? (
              <div className="flex items-center gap-2 justify-center z-10 relative">
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                <span className="font-medium text-white">{t('logging_in', { defaultValue: 'Signing in...' })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center z-10 relative">
                <span className="font-medium text-white">{t('sign_in_button', { defaultValue: 'Sign in' })}</span>
                <ArrowRight
                  className={cn(
                    'h-4 w-4 text-white transition-transform group-hover:translate-x-0.5',
                    isRTL && 'rotate-180 group-hover:-translate-x-0.5'
                  )}
                  aria-hidden="true"
                />
                <kbd className="text-[10px] opacity-60 hidden sm:inline-flex items-center justify-center w-5 h-5 rounded border border-white/30 font-mono">↵</kbd>
              </div>
            )}
          </Button>
        </m.div>

        {/* Divider */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="relative flex items-center justify-center pt-1 pb-0.5"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ds-border" />
          </div>
          <span className="relative px-3 bg-white text-[11px] font-medium text-ds-muted uppercase tracking-wider">
            {t('or_continue_with', { defaultValue: 'Or continue with' })}
          </span>
        </m.div>

        {/* Google Sign-In Button */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
        >
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full h-11 bg-white hover:bg-slate-50/80 border border-ds-border hover:border-ds-border-strong text-ds-ink font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-ds-brass" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.24 0 10.06 0 12s.45 3.76 1.25 5.39l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
            )}
            <span>{t('continue_with_google', { defaultValue: 'Continue with Google' })}</span>
          </button>
        </m.div>

        {/* Enterprise Security Verification Note */}
        <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="pt-3 border-t border-ds-border/60 flex items-center justify-between text-[11px] text-ds-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-ds-brass shrink-0" aria-hidden="true" />
            <span>{t('security_badge.ssl', { defaultValue: 'Enterprise 256-bit SSL' })}</span>
          </div>
          <span className="text-ds-muted/80">{t('security_badge.ksa_compliant', { defaultValue: 'KSA Cloud Compliant' })}</span>
        </m.div>
      </m.form>
    </LazyMotion>
  );
}

export const LoginView = memo(LoginViewComponent);
LoginView.displayName = 'LoginView';
export default LoginView;
