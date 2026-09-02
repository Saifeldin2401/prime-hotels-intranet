import { cn } from '@/lib/utils'

interface MiniStepperProps {
    current: number
    total: number
    /** 0-based indices that are completed. */
    completed?: Set<string> | number[]
    className?: string
}

/**
 * The single in-flow "x of y" indicator, shown in the action bar. Deliberately
 * the only place a numeric step count appears (the top bar owns the % bar, the
 * rail owns per-lesson checks).
 */
export function MiniStepper({ current, total, className }: MiniStepperProps) {
    if (total <= 1) return null

    return (
        <div className={cn('hidden flex-col items-center gap-1 md:flex', className)}>
            <div className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: Math.min(total, 24) }).map((_, i) => (
                    <span
                        key={i}
                        className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === current
                                ? 'w-6 bg-hotel-gold'
                                : i < current
                                    ? 'w-1.5 bg-emerald-500'
                                    : 'w-1.5 bg-border',
                        )}
                    />
                ))}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
                {current + 1} / {total}
            </span>
        </div>
    )
}
