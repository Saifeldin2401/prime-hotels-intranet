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
  Shield,
  WifiOff,
  Lock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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

export type ErrorType = 'auth' | 'network' | 'rate' | 'lockout';

export interface LoginViewProps {
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

  // Check if CAPTCHA is required on mount and email change
  useEffect(() => {
    if (email) {
      // SECURITY: All security decisions are server-side; these are async checks
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
      
      // Check CAPTCHA requirement
      if (value) {
        // SECURITY: All security decisions are server-side; these are async checks
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
        const { error: signInError } = await signIn(
          email, 
          password
        );

        if (signInError) {
          let errorMessage = signInError.message;
          let errType: ErrorType = 'auth';

          if (errorMessage === 'Invalid login credentials') {
            errorMessage = t('errors.invalid_credentials');
            errType = 'auth';
            // Update remaining attempts
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

        // On successful sign-in, persist or clear remember-me credentials and flags
        if (rememberMe) {
          safeLocalStorage.setItem('remembered_email', email);
          safeLocalStorage.setItem(REMEMBER_ME_KEY, 'true');
          safeSessionStorage.setItem('altus_session_active', 'true');
        } else {
          safeLocalStorage.removeItem('remembered_email');
          safeLocalStorage.removeItem(REMEMBER_ME_KEY);
          safeSessionStorage.setItem('altus_session_active', 'true');
        }

        // Success
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
        return <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />;
      case 'rate':
      case 'lockout':
        return <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />;
    }
  }, [errorType]);

  // Show success state
  if ((loginSuccess || user)) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('login_success.title', { defaultValue: 'Welcome Back!' })}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('login_success.redirecting', { defaultValue: 'Redirecting you to the dashboard...' })}
          </p>
          <Loader2 className="h-5 w-5 animate-spin mt-4 text-primary" />
        </m.div>
      </LazyMotion>
    );
  }

  return (
    <>
      <LazyMotion features={domAnimation}>
        <m.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-5"
          aria-label={t('sign_in_title', { defaultValue: 'Sign In' })}
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
                autoComplete="email"
              />
            </m.div>

            {/* Password Field */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
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
                  <Alert className="bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 shadow-sm">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <AlertDescription className="text-amber-900 dark:text-amber-200 text-xs font-semibold">
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
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
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
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500/20 accent-amber-600 cursor-pointer"
                  aria-label={t('remember_me')}
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-slate-600 font-medium cursor-pointer select-none"
                >
                  {t('remember_me')}
                </label>
              </div>

              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors hover:underline underline-offset-4"
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
                  'text-xs p-3.5 rounded-2xl flex items-start gap-3 border shadow-sm',
                  errorType === 'network' &&
                    'bg-amber-50 text-amber-800 border-amber-200',
                  (errorType === 'rate' || errorType === 'lockout') &&
                    'bg-orange-50 text-orange-800 border-orange-200',
                  errorType === 'auth' &&
                    'bg-rose-50 text-rose-800 border-rose-200'
                )}
                role="alert"
                aria-live="assertive"
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-inner',
                    errorType === 'network' && 'bg-amber-100 text-amber-600',
                    (errorType === 'rate' || errorType === 'lockout') && 'bg-orange-100 text-orange-600',
                    errorType === 'auth' && 'bg-rose-100 text-rose-600'
                  )}
                >
                  {getErrorIcon()}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-bold text-slate-900">{t('errors.title')}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{error}</p>
                  {/* Self-service unlock CTA for locked accounts */}
                  {errorType === 'lockout' && onUnlockAccount && (
                    <button
                      type="button"
                      onClick={() => onUnlockAccount(email)}
                      className="mt-2.5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors duration-200 shadow-md"
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

          {/* Submit Button */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99] transition-all relative overflow-hidden border-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              disabled={loading || emailValid === false}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                  <span className="tracking-wide text-white font-bold">{t('logging_in')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <span className="tracking-wide text-white font-bold">{t('sign_in_button')}</span>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 text-white transition-transform group-hover:translate-x-1',
                      isRTL && 'rotate-180 group-hover:-translate-x-1'
                    )}
                    aria-hidden="true"
                  />
                </div>
              )}
            </Button>
          </m.div>

          {/* Security Tips */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-4 border-t border-slate-100"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                </div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700">
                  {t('security_tips.title')}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                KSA Enterprise Verified
              </span>
            </div>
            <ul className="text-xs text-slate-500 space-y-1.5">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                {t('security_tips.never_share')}
              </li>
            </ul>
          </m.div>
        </m.form>
      </LazyMotion>
    </>
  );
}

export const LoginView = memo(LoginViewComponent);
LoginView.displayName = 'LoginView';

export default LoginView;
