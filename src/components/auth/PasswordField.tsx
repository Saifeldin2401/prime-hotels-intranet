import { memo, useCallback, useState } from 'react';
import { Eye, EyeOff, Lock, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FloatingInput } from './FloatingInput';
import { cn } from '@/lib/utils';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

interface PasswordFieldProps {
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
  strengthColor = 'bg-ds-border',
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
      className="p-1.5 text-ds-muted hover:text-ds-ink transition-colors rounded-md hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-brass disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="space-y-2">
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

      {/* Password Strength Indicator (Subtle & Restrained) */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {showStrength && value && isFocused && (
            <m.div
              id="password-strength"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 pt-0.5"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1 bg-ds-surface-subtle rounded-full overflow-hidden border border-ds-border">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(strengthScore / 4) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className={cn('h-full rounded-full transition-colors duration-300', strengthColor)}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[11px] text-ds-muted min-w-[55px] text-end font-medium">
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
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="flex items-center gap-2 text-ds-warning text-xs bg-ds-warning-soft/70 p-2.5 rounded-lg border border-ds-warning/25"
              role="alert"
              aria-live="polite"
            >
              <div className="w-5 h-5 rounded bg-ds-warning/15 flex items-center justify-center shrink-0">
                <LockKeyhole className="h-3 w-3 text-ds-warning" aria-hidden="true" />
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
