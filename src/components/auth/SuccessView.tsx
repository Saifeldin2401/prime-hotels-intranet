import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';

export interface SuccessViewProps {
  title?: string;
  subtitle?: string;
  showLoader?: boolean;
}

function SuccessViewComponent({
  title,
  subtitle,
  showLoader = true,
}: SuccessViewProps) {
  const { t } = useTranslation('auth');

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-6"
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
            {title || t('welcome_back')}
          </h3>
          <p className="text-gray-500">{subtitle || t('redirecting')}</p>
        </div>
        {showLoader && (
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        )}
      </m.div>
    </LazyMotion>
  );
}

export const SuccessView = memo(SuccessViewComponent);
SuccessView.displayName = 'SuccessView';

export default SuccessView;
