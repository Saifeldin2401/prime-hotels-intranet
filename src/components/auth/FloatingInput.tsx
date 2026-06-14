import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { useState, useCallback, memo } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

export interface FloatingInputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
  isRTL?: boolean;
  rightElement?: React.ReactNode;
  valid?: boolean | null;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  autoComplete?: string;
}

function FloatingInputComponent({
  id,
  type,
  value,
  onChange,
  onFocus,
  onBlur,
  label,
  icon: Icon,
  disabled,
  isRTL = false,
  rightElement,
  valid = null,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  autoComplete,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || value.length > 0;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
  }, [onChange]);

  return (
    <div className="relative">
      {/* Icon */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300',
          isRTL ? 'end-4' : 'start-4',
          isActive ? 'text-primary' : 'text-gray-400'
        )}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid ?? (valid === false && value.length > 0)}
        className={cn(
          'w-full h-14 pt-4 pb-1.5 bg-gray-50/50 dark:bg-gray-800/50 border-2 rounded-xl outline-none transition-all duration-300',
          isRTL ? 'pe-12 text-right' : 'ps-12 text-left',
          rightElement ? (isRTL ? 'ps-12' : 'pe-12') : '',
          isActive
            ? 'border-primary/50 bg-white dark:bg-gray-800 shadow-sm'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
          valid === true && 'border-green-500/50',
          valid === false && value && 'border-red-500/50',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        placeholder=" "
      />

      {/* Floating Label */}
      <label
        htmlFor={id}
        className={cn(
          'absolute pointer-events-none transition-all duration-300',
          isRTL ? 'end-12' : 'start-12',
          isActive
            ? 'top-1.5 text-xs font-medium text-primary'
            : 'top-1/2 -translate-y-1/2 text-sm text-gray-500'
        )}
      >
        {label}
      </label>

      {/* Right Element */}
      {rightElement && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2',
            isRTL ? 'start-3' : 'end-3'
          )}
        >
          {rightElement}
        </div>
      )}

      {/* Validation Indicator */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {valid === true && (
            <m.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2',
                isRTL ? 'start-3' : 'end-10'
              )}
              aria-hidden="true"
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}

export const FloatingInput = memo(FloatingInputComponent);
FloatingInput.displayName = 'FloatingInput';

export default FloatingInput;
