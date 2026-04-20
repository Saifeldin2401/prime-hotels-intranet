import { memo, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  Shield,
  WifiOff,
  Lock,
  ShieldAlert,
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
import { MFAVerificationDialog } from './MFAVerificationDialog';
import { isCaptchaRequired, getRemainingAttempts } from '@/lib/authSecurityService';
import { safeLocalStorage } from '@/lib/storage';

export type ErrorType = 'auth' | 'network' | 'rate' | 'lockout' | 'mfa';

export interface LoginViewProps {
  isRTL?: boolean;
  onForgotPassword: () => void;
  /** Called with the current email when the user triggers self-service account unlock */
  onUnlockAccount?: (email: string) => void;
}

function LoginViewComponent({ isRTL = false, onForgotPassword, onUnlockAccount }: LoginViewProps) {
  const { t } = useTranslation('auth');
  const { signIn, user, pendingMFAUserId } = useAuth();

  const [email, setEmail] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('remembered_email') || '';
      }
    } catch {
      // localStorage not available (Safari private mode, etc.)
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return !!localStorage.getItem('remembered_email');
      }
    } catch {
      // localStorage not available (Safari private mode, etc.)
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>('auth');
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        return !!localStorage.getItem('remembered_email');
      }
    } catch {
      // localStorage not available (Safari private mode, etc.)
    }
    return null;
  });
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [showMFADialog, setShowMFADialog] = useState(false);
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



  const handleMFASuccess = useCallback(() => {
    setShowMFADialog(false);
    setLoginSuccess(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
      } catch {
        // localStorage not available (Safari private mode, etc.)
      }

      try {
        const { error: signInError, requiresMFA } = await signIn(
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

        // Check if MFA is required
        if (requiresMFA) {
          setShowMFADialog(true);
          setLoading(false);
          return;
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
  if ((loginSuccess || user) && !showMFADialog && !pendingMFAUserId) {
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
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                  className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
                  aria-label={t('remember_me')}
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
                onClick={onForgotPassword}
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
                  'text-sm p-4 rounded-xl flex items-start gap-3 border',
                  errorType === 'network' &&
                    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                  (errorType === 'rate' || errorType === 'lockout') &&
                    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
                  errorType === 'auth' &&
                    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                )}
                role="alert"
                aria-live="assertive"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    errorType === 'network' && 'bg-amber-100 dark:bg-amber-800/30',
                    (errorType === 'rate' || errorType === 'lockout') && 'bg-orange-100 dark:bg-orange-800/30',
                    errorType === 'auth' && 'bg-red-100 dark:bg-red-800/30'
                  )}
                >
                  {getErrorIcon()}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-semibold">{t('errors.title')}</p>
                  <p className="text-sm opacity-90 mt-0.5">{error}</p>
                  {/* Self-service unlock CTA for locked accounts */}
                  {errorType === 'lockout' && onUnlockAccount && (
                    <button
                      type="button"
                      onClick={() => onUnlockAccount(email)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
                      aria-label={t('account_locked.unlock_button')}
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
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
              className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading || !emailValid}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span>{t('logging_in')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{t('sign_in_button')}</span>
                  <ArrowRight
                    className={cn(
                      'h-5 w-5 transition-transform group-hover:translate-x-1',
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
            className="pt-4 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Shield className="h-3 w-3" aria-hidden="true" />
              </div>
              <span className="font-semibold uppercase tracking-wider">
                {t('security_tips.title')}
              </span>
            </div>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
                {t('security_tips.never_share')}
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
                {t('security_tips.logout')}
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-gray-300" />
                {t('security_tips.encrypted', { defaultValue: 'Secure, encrypted connection' })}
              </li>
            </ul>
          </m.div>
        </m.form>
      </LazyMotion>

      {/* MFA Verification Dialog */}
      <MFAVerificationDialog
        isOpen={showMFADialog}
        onClose={() => {
          setShowMFADialog(false);
          setLoading(false);
        }}
        onSuccess={handleMFASuccess}
      />
    </>
  );
}

export const LoginView = memo(LoginViewComponent);
LoginView.displayName = 'LoginView';

export default LoginView;
