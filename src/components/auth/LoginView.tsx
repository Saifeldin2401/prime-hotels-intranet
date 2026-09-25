import { memo, useCallback, useState, useEffect } from 'react';
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
  const { t } = useTranslation('auth');
  const { signIn, user } = useAuth();
  const [searchParams] = useSearchParams();
  const isTimeoutRedirect = searchParams.get('reason') === 'timeout';

  const [email, setEmail] = useState(() => safeLocalStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    const isRemembered = safeLocalStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const hasSavedEmail = safeLocalStorage.hasItem('remembered_email');
    return isRemembered || hasSavedEmail;
  });
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>('auth');
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(() => {
    const savedEmail = safeLocalStorage.getItem('remembered_email');
    if (savedEmail) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedEmail);
    }
    return null;
  });

  const [capsLockOn, setCapsLockOn] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const passwordStrength = usePasswordStrength(password);

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

  const getErrorIcon = useCallback(() => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-4 w-4 shrink-0 text-ds-warning" aria-hidden="true" />;
      case 'rate':
      case 'lockout':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-ds-warning" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-4 w-4 shrink-0 text-ds-danger" aria-hidden="true" />;
    }
  }, [errorType]);

  // Show transition state on authentication success
  if (loginSuccess || user) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-ds-success-soft text-ds-success flex items-center justify-center mb-4 border border-ds-success/20">
            <CheckCircle2 className="h-7 w-7" />
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
        {/* Email Field */}
        <div>
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
        </div>

        {/* Password Field */}
        <div>
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
        </div>

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
        <div className="flex items-center justify-between pt-1">
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
        </div>

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
                <p className="font-semibold text-ds-ink">{t('errors.title')}</p>
                <p className="text-xs text-ds-ink-secondary mt-0.5 leading-relaxed">{error}</p>

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
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 bg-ds-brass hover:bg-ds-accent-hover text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
            disabled={loading || emailValid === false}
          >
            {loading ? (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                <span className="font-medium text-white">{t('logging_in', { defaultValue: 'Signing in...' })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <span className="font-medium text-white">{t('sign_in_button', { defaultValue: 'Sign in' })}</span>
                <ArrowRight
                  className={cn(
                    'h-4 w-4 text-white transition-transform group-hover:translate-x-0.5',
                    isRTL && 'rotate-180 group-hover:-translate-x-0.5'
                  )}
                  aria-hidden="true"
                />
              </div>
            )}
          </Button>
        </div>

        {/* Enterprise Security Verification Note */}
        <div className="pt-4 border-t border-ds-border/60 flex items-center justify-between text-[11px] text-ds-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-ds-brass shrink-0" aria-hidden="true" />
            <span>Enterprise 256-bit SSL</span>
          </div>
          <span className="text-ds-muted/80">KSA Cloud Compliant</span>
        </div>
      </m.form>
    </LazyMotion>
  );
}

export const LoginView = memo(LoginViewComponent);
LoginView.displayName = 'LoginView';
export default LoginView;
