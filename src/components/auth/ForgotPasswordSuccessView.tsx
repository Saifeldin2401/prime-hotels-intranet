import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ForgotPasswordSuccessViewProps {
  email: string;
  isRTL?: boolean;
  onBackToLogin: () => void;
  onTryDifferentEmail: () => void;
}

function ForgotPasswordSuccessViewComponent({
  email,
  isRTL = false,
  onBackToLogin,
  onTryDifferentEmail,
}: ForgotPasswordSuccessViewProps) {
  const { t } = useTranslation('auth');

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-6 text-center space-y-4"
        role="status"
        aria-live="polite"
      >
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-14 h-14 bg-ds-success-soft text-ds-success border border-ds-success/20 rounded-full flex items-center justify-center shadow-xs"
          aria-hidden="true"
        >
          <CheckCircle2 className="w-7 h-7" />
        </m.div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-ds-ink tracking-tight">
            {t('forgot_password.success_title', { defaultValue: 'Check your inbox' })}
          </h2>
          <p className="text-xs text-ds-muted leading-relaxed max-w-xs mx-auto">
            {t('forgot_password.success_message', {
              defaultValue: 'We have dispatched a password reset link to your registered email address.'
            })}
          </p>
        </div>

        <div className="w-full rounded-lg bg-ds-surface-subtle border border-ds-border p-3 text-xs text-ds-ink-secondary">
          <div className="flex items-center justify-center gap-2">
            <Mail className="h-4 w-4 text-ds-brass shrink-0" aria-hidden="true" />
            <span className="truncate font-medium">{email}</span>
          </div>
        </div>

        <div className="w-full space-y-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-ds-border text-ds-ink hover:bg-ds-surface-subtle text-xs font-medium rounded-lg"
            onClick={onTryDifferentEmail}
          >
            {t('forgot_password.try_different', { defaultValue: 'Try a different email' })}
          </Button>

          <Button
            type="button"
            className="w-full h-11 bg-ds-brass hover:bg-ds-accent-hover text-white text-xs font-medium rounded-lg shadow-xs"
            onClick={onBackToLogin}
          >
            <ArrowRight
              className={cn(
                'h-3.5 w-3.5 me-1.5 rotate-180',
                isRTL && 'rotate-0'
              )}
              aria-hidden="true"
            />
            {t('forgot_password.back_to_login', { defaultValue: 'Return to sign in' })}
          </Button>
        </div>

        <p className="text-[11px] text-ds-muted pt-1">
          {t('forgot_password.check_spam', { defaultValue: "Didn't receive the email? Check your spam folder." })}
        </p>
      </m.div>
    </LazyMotion>
  );
}

export const ForgotPasswordSuccessView = memo(ForgotPasswordSuccessViewComponent);
ForgotPasswordSuccessView.displayName = 'ForgotPasswordSuccessView';
export default ForgotPasswordSuccessView;
