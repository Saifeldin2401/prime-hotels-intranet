import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingInput } from './FloatingInput';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toastHelpers';

interface ForgotPasswordViewProps {
  isRTL?: boolean;
  initialEmail?: string;
  onBackToLogin: () => void;
  onSuccess: (email: string) => void;
}

function ForgotPasswordViewComponent({
  isRTL = false,
  initialEmail = '',
  onBackToLogin,
  onSuccess,
}: ForgotPasswordViewProps) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState(initialEmail);
  const [emailValid, setEmailValid] = useState<boolean | null>(
    initialEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(initialEmail) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_focusedField, setFocusedField] = useState<string | null>(null);

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
    },
    [error, validateEmail]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) {
          throw new Error(t('forgot_password.invalid_email', { defaultValue: 'Please enter a valid email address.' }));
        }

        const { error: invokeError } = await supabase.functions.invoke(
          'public-forgot-password',
          {
            body: { email: trimmed.toLowerCase() },
          }
        );

        if (invokeError) {
          if (
            invokeError.message?.toLowerCase().includes('too many') ||
            invokeError.status === 429
          ) {
            setError(t('errors.rate_limit', { defaultValue: 'Too many requests. Please wait a few moments before trying again.' }));
          } else {
            setError(t('forgot_password.error', { defaultValue: 'Failed to send reset email. Please try again.' }));
          }
          setLoading(false);
          return;
        }

        onSuccess(trimmed);
        showSuccessToast(
          t('forgot_password.success_title', { defaultValue: 'Check your email' }),
          t('forgot_password.success_message', { defaultValue: 'We have dispatched a secure password reset link to your email.' })
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('forgot_password.error', { defaultValue: 'Failed to send reset email.' });
        setError(message);
        showErrorToast(t('errors.title'), message);
      } finally {
        setLoading(false);
      }
    },
    [email, onSuccess, t]
  );

  return (
    <LazyMotion features={domAnimation}>
      <m.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="space-y-4"
        aria-label={t('forgot_password.title', { defaultValue: 'Forgot password' })}
      >
        <div className="space-y-1 text-start">
          <h2 className="text-xl font-semibold text-ds-ink tracking-tight">
            {t('forgot_password.title', { defaultValue: 'Reset your password' })}
          </h2>
          <p className="text-xs text-ds-muted leading-relaxed">
            {t('forgot_password.description', { defaultValue: 'Enter your company email to receive password reset instructions.' })}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <m.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              className="text-xs p-3 rounded-lg flex items-start gap-2.5 border bg-ds-danger-soft/80 text-ds-ink border-ds-danger/30"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-ds-danger mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-ds-ink">{t('errors.title')}</p>
                <p className="text-xs text-ds-ink-secondary mt-0.5 leading-relaxed">{error}</p>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        <FloatingInput
          id="reset-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onFocus={() => setFocusedField('reset-email')}
          onBlur={() => setFocusedField(null)}
          label={t('forgot_password.email_label', { defaultValue: 'Email address' })}
          icon={Mail}
          disabled={loading}
          isRTL={isRTL}
          valid={emailValid}
          ariaDescribedBy={error ? 'forgot-error' : undefined}
          ariaInvalid={!!error}
          autoComplete="email"
        />

        <div className="pt-2 space-y-2">
          <Button
            type="submit"
            className="w-full h-12 bg-ds-brass hover:bg-ds-accent-hover text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
            disabled={loading || !emailValid}
          >
            {loading ? (
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
                <span className="font-medium text-white">{t('forgot_password.sending', { defaultValue: 'Sending link...' })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <span className="font-medium text-white">{t('forgot_password.send_link', { defaultValue: 'Send reset link' })}</span>
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

          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 text-xs font-medium text-ds-ink-secondary hover:text-ds-ink hover:bg-ds-surface-subtle"
            onClick={onBackToLogin}
          >
            <ArrowRight
              className={cn(
                'h-3.5 w-3.5 me-1.5 rotate-180',
                isRTL && 'rotate-0'
              )}
              aria-hidden="true"
            />
            {t('forgot_password.back_to_login', { defaultValue: 'Back to sign in' })}
          </Button>
        </div>
      </m.form>
    </LazyMotion>
  );
}

export const ForgotPasswordView = memo(ForgotPasswordViewComponent);
ForgotPasswordView.displayName = 'ForgotPasswordView';
export default ForgotPasswordView;
