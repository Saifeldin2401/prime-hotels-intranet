import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ForgotPasswordSuccessViewProps {
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-10 text-center space-y-6"
        role="status"
        aria-live="polite"
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-full flex items-center justify-center shadow-lg"
          aria-hidden="true"
        >
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </m.div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('forgot_password.success_title')}
          </h3>
          <p className="text-gray-500">{t('forgot_password.success_message')}</p>
        </div>
        <div className="w-full rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="truncate">{email}</span>
          </div>
        </div>
        <div className="w-full space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onTryDifferentEmail}
          >
            {t('forgot_password.try_different')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBackToLogin}
          >
            <ArrowRight
              className={cn(
                'h-4 w-4 me-2 rotate-180',
                isRTL && 'rotate-0'
              )}
              aria-hidden="true"
            />
            {t('forgot_password.back_to_login')}
          </Button>
        </div>
        <p className="text-xs text-gray-400">{t('forgot_password.check_spam')}</p>
      </m.div>
    </LazyMotion>
  );
}

export const ForgotPasswordSuccessView = memo(ForgotPasswordSuccessViewComponent);
ForgotPasswordSuccessView.displayName = 'ForgotPasswordSuccessView';

export default ForgotPasswordSuccessView;
