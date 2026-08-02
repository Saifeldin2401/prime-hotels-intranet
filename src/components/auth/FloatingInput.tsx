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
    <div className="relative group">
      {/* Icon */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300 pointer-events-none',
          isRTL ? 'end-4' : 'start-4',
          isFocused
            ? 'text-amber-600 scale-110'
            : isActive
            ? 'text-slate-700'
            : 'text-slate-400'
        )}
        aria-hidden="true"
      >
        <Icon className="w-4 h-4 transition-transform duration-300" />
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
          'w-full h-13 pt-3.5 pb-1 bg-slate-50/60 border border-slate-200 rounded-2xl outline-none transition-all duration-300 text-slate-900 font-medium text-sm placeholder:text-slate-400',
          isRTL ? 'pe-11 text-right' : 'ps-11 text-left',
          rightElement ? (isRTL ? 'ps-11' : 'pe-11') : '',
          isFocused
            ? 'border-amber-500 bg-white shadow-sm ring-2 ring-amber-500/20'
            : isActive
            ? 'border-slate-300 bg-white'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/60',
          valid === true && 'border-emerald-500 focus:ring-emerald-500/20',
          valid === false && value && 'border-rose-500 focus:ring-rose-500/20',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        placeholder=" "
      />

      {/* Floating Label */}
      <label
        htmlFor={id}
        className={cn(
          'absolute pointer-events-none transition-all duration-300 tracking-wide',
          isRTL ? 'end-11' : 'start-11',
          isActive
            ? 'top-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600'
            : 'top-1/2 -translate-y-1/2 text-xs text-slate-400 font-normal'
        )}
      >
        {label}
      </label>

      {/* Right Element */}
      {rightElement && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10',
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
                'absolute top-1/2 -translate-y-1/2 z-10',
                isRTL ? 'start-3' : 'end-10'
              )}
              aria-hidden="true"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-sm" />
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
