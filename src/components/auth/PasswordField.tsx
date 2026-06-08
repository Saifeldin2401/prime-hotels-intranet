import { memo, useCallback, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FloatingInput } from './FloatingInput';
import { cn } from '@/lib/utils';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { Lock, LockKeyhole } from 'lucide-react';

export interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  isRTL?: boolean;
  showStrength?: boolean;
  strengthScore?: number;
  strengthColor?: string;
  strengthLabel?: string;
  showCapsLock?: boolean;
  isCapsLockOn?: boolean;
  isFocused?: boolean;
  valid?: boolean | null;
  ariaDescribedBy?: string;
}

function PasswordFieldComponent({
  id = 'password',
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  isRTL = false,
  showStrength = false,
  strengthScore = 0,
  strengthColor = 'bg-gray-200',
  strengthLabel = '',
  showCapsLock = false,
  isCapsLockOn = false,
  isFocused = false,
  valid = null,
  ariaDescribedBy,
}: PasswordFieldProps) {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const passwordButton = (
    <button
      type="button"
      onClick={togglePasswordVisibility}
      disabled={disabled}
      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={showPassword ? t('hide_password') : t('show_password')}
      aria-pressed={showPassword}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <FloatingInput
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        label={t('password_label')}
        icon={Lock}
        disabled={disabled}
        isRTL={isRTL}
        valid={valid}
        rightElement={passwordButton}
        autoComplete="current-password"
        ariaDescribedBy={
          [
            ariaDescribedBy,
            showStrength && value && isFocused ? 'password-strength' : null,
            showCapsLock && isCapsLockOn && isFocused ? 'caps-lock-warning' : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
      />

      {/* Password Strength Indicator */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {showStrength && value && isFocused && (
            <m.div
              id="password-strength"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(strengthScore / 4) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className={cn('h-full rounded-full transition-colors duration-300', strengthColor)}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-[60px] text-right font-medium">
                  {strengthLabel}
                </span>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Caps Lock Warning */}
        <AnimatePresence>
          {showCapsLock && isCapsLockOn && isFocused && (
            <m.div
              id="caps-lock-warning"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="flex items-center gap-2.5 text-amber-600 text-xs bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-900/20 dark:to-amber-800/10 p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/30"
              role="alert"
              aria-live="polite"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="font-medium">{t('caps_lock_on')}</span>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}

export const PasswordField = memo(PasswordFieldComponent);
PasswordField.displayName = 'PasswordField';

export default PasswordField;
