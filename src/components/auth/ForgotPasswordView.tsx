import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingInput } from './FloatingInput';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/toastHelpers';

export interface ForgotPasswordViewProps {
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
          throw new Error(t('forgot_password.invalid_email'));
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
            setError(t('errors.too_many_requests'));
          } else {
            setError(t('errors.reset_password_failed'));
          }
          setLoading(false);
          return;
        }

        onSuccess(trimmed);
        showSuccessToast(
          t('forgot_password.success_title'),
          t('forgot_password.success_message')
        );
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('forgot_password.error');
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
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="space-y-5"
        aria-label={t('forgot_password.title')}
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
          {error && (
            <m.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="text-sm p-4 rounded-xl flex items-start gap-3 border bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
              role="alert"
              aria-live="assertive"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-800/30">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-semibold">{t('errors.title')}</p>
                <p className="text-sm opacity-90 mt-0.5">{error}</p>
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
          label={t('forgot_password.email_label')}
          icon={Mail}
          disabled={loading}
          isRTL={isRTL}
          valid={emailValid}
          ariaDescribedBy={error ? 'forgot-error' : undefined}
          ariaInvalid={!!error}
          autoComplete="email"
        />

        <Button
          type="submit"
          className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || !emailValid}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>{t('forgot_password.sending')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{t('forgot_password.send_link')}</span>
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

        <Button
          type="button"
          variant="ghost"
          className="w-full text-sm font-semibold"
          onClick={onBackToLogin}
        >
          <ArrowRight
            className={cn(
              'h-4 w-4 mr-2 rotate-180',
              isRTL && 'rotate-0'
            )}
            aria-hidden="true"
          />
          {t('forgot_password.back_to_login')}
        </Button>
      </m.form>
    </LazyMotion>
  );
}

export const ForgotPasswordView = memo(ForgotPasswordViewComponent);
ForgotPasswordView.displayName = 'ForgotPasswordView';

export default ForgotPasswordView;
