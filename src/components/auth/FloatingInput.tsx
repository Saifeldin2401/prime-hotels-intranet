import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';
import { useState, useCallback, memo } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

interface FloatingInputProps {
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
    },
    [onChange]
  );

  return (
    <div className="relative group">
      {/* Icon */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 pointer-events-none',
          isRTL ? 'end-3.5' : 'start-3.5',
          isFocused
            ? 'text-ds-brass'
            : isActive
            ? 'text-ds-ink-secondary'
            : 'text-ds-muted'
        )}
        aria-hidden="true"
      >
        <Icon className="w-4 h-4 transition-transform duration-200" />
      </div>

      {/* Input Field: 48px height, pure white background, immune to browser autofill blue */}
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
        placeholder=" "
        className={cn(
          'peer w-full h-12 pt-4 pb-1.5 bg-white focus:bg-white border rounded-lg outline-none transition-all duration-200 text-ds-ink font-normal text-sm',
          '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#15212e]',
          isRTL ? 'pe-10 text-end' : 'ps-10 text-start',
          rightElement ? (isRTL ? 'ps-11' : 'pe-11') : '',
          isFocused
            ? 'border-ds-brass shadow-xs'
            : isActive
            ? 'border-ds-border-strong'
            : 'border-ds-border hover:border-ds-border-strong',
          valid === true && 'border-ds-success',
          valid === false && value && 'border-ds-danger',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-50'
        )}
      />

      {/* Focus ripple ring */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {isFocused && (
            <m.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'absolute inset-0 rounded-lg pointer-events-none',
                valid === true
                  ? 'ring-2 ring-ds-success/20'
                  : valid === false && value
                  ? 'ring-2 ring-ds-danger/20'
                  : 'ring-2 ring-ds-brass/20'
              )}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </LazyMotion>

      {/* Floating Label (with peer selector to immediately float if browser autofills) */}
      <label
        htmlFor={id}
        className={cn(
          'absolute pointer-events-none transition-all duration-200 tracking-normal',
          isRTL ? 'end-10' : 'start-10',
          isActive
            ? 'top-1.5 text-[10px] font-semibold uppercase tracking-wider text-ds-brass'
            : 'top-1/2 -translate-y-1/2 text-xs text-ds-muted font-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-ds-brass peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:text-ds-brass peer-autofill:top-1.5 peer-autofill:text-[10px] peer-autofill:font-semibold peer-autofill:uppercase peer-autofill:tracking-wider peer-autofill:text-ds-brass'
        )}
      >
        {label}
      </label>

      {/* Right Element (e.g. Password Toggle) */}
      {rightElement && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10',
            isRTL ? 'start-2.5' : 'end-2.5'
          )}
        >
          {rightElement}
        </div>
      )}

      {/* Accessible Validation Indicator */}
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {valid === true && (
            <m.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 pointer-events-none',
                isRTL ? (rightElement ? 'start-11' : 'start-3') : rightElement ? 'end-11' : 'end-3'
              )}
              aria-hidden="true"
            >
              <CheckCircle2 className="w-4 h-4 text-ds-success" />
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