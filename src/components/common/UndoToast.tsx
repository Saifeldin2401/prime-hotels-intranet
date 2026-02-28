import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UndoToastProps {
  /** Message to display in the toast */
  message: string;
  /** Current countdown progress (0 to delay) */
  timeRemaining: number;
  /** Total delay in milliseconds */
  delay: number;
  /** Callback when undo is clicked */
  onUndo: () => void;
  /** Optional additional actions */
  actions?: React.ReactNode;
}

/**
 * A toast component with [Undo] button and countdown progress bar.
 * 
 * Shows a message like "Action will happen in 5s..." with a visual progress bar.
 * Clicking Undo cancels the action.
 * 
 * @example
 * <UndoToast
 *   message="Task marked complete"
 *   timeRemaining={3000}
 *   delay={5000}
 *   onUndo={() => console.log('Undone!')}
 * />
 */
export function UndoToast({
  message,
  timeRemaining,
  delay,
  onUndo,
  actions,
}: UndoToastProps) {
  const { t, i18n } = useTranslation('common');
  const isRTL = i18n.dir() === 'rtl';
  
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    const percentage = Math.max(0, Math.min(100, (timeRemaining / delay) * 100));
    setProgress(percentage);
  }, [timeRemaining, delay]);
  
  const secondsRemaining = Math.ceil(timeRemaining / 1000);
  
  return (
    <div className={cn(
      "flex flex-col gap-2 min-w-[300px] max-w-[400px]",
      isRTL && "rtl"
    )}>
      {/* Message and countdown */}
      <div className={cn(
        "flex items-center justify-between gap-4",
        isRTL && "flex-row-reverse"
      )}>
        <span className="text-sm font-medium text-foreground">
          {message}
        </span>
        <span className={cn(
          "text-xs text-muted-foreground tabular-nums",
          secondsRemaining <= 2 && "text-amber-600 font-medium"
        )}>
          {t('undo.seconds_remaining', '{{count}}s', { count: secondsRemaining })}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 transition-all duration-100 ease-linear rounded-full",
            progress > 60 ? "bg-primary" : progress > 30 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{
            width: `${progress}%`,
            left: isRTL ? 'auto' : 0,
            right: isRTL ? 0 : 'auto',
          }}
        />
      </div>
      
      {/* Actions */}
      <div className={cn(
        "flex items-center gap-2 mt-1",
        isRTL && "flex-row-reverse"
      )}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onUndo}
          className={cn(
            "h-7 px-2 text-xs font-medium gap-1.5",
            "bg-primary/10 hover:bg-primary/20 text-primary",
            "border border-primary/20",
            "transition-all duration-200"
          )}
        >
          <Undo2 className={cn("w-3.5 h-3.5", isRTL && "scale-x-[-1]")} />
          {t('undo.undo_button', 'Undo')}
        </Button>
        
        {actions}
      </div>
    </div>
  );
}

export default UndoToast;
