import { useId } from 'react'
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    HelpCircle,
    Loader2,
    RotateCcw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePlayerShell } from './PlayerShellContext'
import { MiniStepper } from './MiniStepper'
import type { PlayerActionIcon, PlayerPrimaryAction, PlayerStatusTone } from './types'

const ICONS: Record<PlayerActionIcon, typeof ArrowRight | null> = {
    next: ArrowRight,
    previous: ArrowLeft,
    quiz: HelpCircle,
    submit: CheckCircle,
    retry: RotateCcw,
    complete: CheckCircle,
    continue: ArrowRight,
    none: null,
}

const TONE_CLASS: Record<PlayerStatusTone, string> = {
    info: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-destructive',
}

interface PlayerActionBarProps {
    /** Used when the active block registers `primary === undefined`. */
    defaultPrimary?: PlayerPrimaryAction | null
    previousDisabled?: boolean
    stepper?: { current: number; total: number }
    isRTL?: boolean
}

export function PlayerActionBar({ defaultPrimary, previousDisabled, stepper, isRTL }: PlayerActionBarProps) {
    const { current, goPrevious, reducedMotion } = usePlayerShell()
    const describedById = useId()

    const primary = current.primary !== undefined ? current.primary : defaultPrimary
    const { secondary, status, hidePrevious, progressBar } = current

    const PrimaryIcon = primary?.icon ? ICONS[primary.icon] : null
    const intentClass = primary?.intent === 'success'
        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
        : primary?.intent === 'destructive'
            ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
            : 'bg-hotel-gold hover:bg-hotel-gold-dark text-white'

    return (
        <footer
            className={cn(
                'z-20 shrink-0 border-t border-border/60 bg-card/95 backdrop-blur-xl',
                'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
            )}
        >
            {progressBar && (
                <div className="px-4 pt-2 sm:px-6">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>{progressBar.label}</span>
                        <span className="tabular-nums">{Math.round(progressBar.value)}%</span>
                    </div>
                    <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={Math.round(progressBar.value)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={progressBar.label}
                    >
                        <div
                            className={cn('h-full rounded-full bg-hotel-gold', !reducedMotion && 'transition-[width] duration-500')}
                            style={{ width: `${Math.min(100, Math.max(0, progressBar.value))}%` }}
                        />
                    </div>
                </div>
            )}

            <div
                className={cn(
                    'flex min-h-[4.5rem] items-center gap-3 px-4 py-3 sm:px-6',
                    isRTL ? 'flex-row-reverse' : 'flex-row',
                )}
            >
                {!hidePrevious && (
                    <Button
                        variant="outline"
                        onClick={goPrevious}
                        disabled={previousDisabled}
                        className="h-11 shrink-0 gap-2"
                    >
                        <ArrowLeft className={cn('h-4 w-4', isRTL && 'rotate-180')} />
                        <span className="hidden sm:inline">Previous</span>
                    </Button>
                )}

                <div className="flex min-w-0 flex-1 flex-col items-center">
                    {stepper && <MiniStepper current={stepper.current} total={stepper.total} />}
                    {status && (
                        <p
                            className={cn(
                                'truncate text-center text-xs font-medium sm:text-sm',
                                TONE_CLASS[status.tone ?? 'info'],
                            )}
                            aria-live={status.live ? 'polite' : undefined}
                        >
                            {status.text}
                        </p>
                    )}
                    {secondary && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={secondary.onPress}
                            disabled={secondary.disabled}
                            className="h-auto p-0 text-xs"
                        >
                            {secondary.label}
                        </Button>
                    )}
                </div>

                {primary && (
                    <div className="flex shrink-0 flex-col items-end">
                        <Button
                            onClick={primary.onPress}
                            disabled={primary.disabled || primary.loading}
                            aria-disabled={primary.disabled || primary.loading || undefined}
                            aria-describedby={primary.disabled && primary.disabledReason ? describedById : undefined}
                            className={cn(
                                'h-11 min-w-[9rem] justify-center gap-2 font-bold sm:min-w-[11rem]',
                                intentClass,
                            )}
                        >
                            {primary.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {PrimaryIcon && primary.icon !== 'next' && primary.icon !== 'continue' && (
                                        <PrimaryIcon className={cn('h-4 w-4', isRTL && (primary.icon === 'previous') && 'rotate-180')} />
                                    )}
                                    <span className="truncate">{primary.label}</span>
                                    {PrimaryIcon && (primary.icon === 'next' || primary.icon === 'continue') && (
                                        <PrimaryIcon className={cn('h-4 w-4', isRTL && 'rotate-180')} />
                                    )}
                                </>
                            )}
                        </Button>
                        {primary.disabled && primary.disabledReason && (
                            <span id={describedById} className="sr-only">
                                {primary.disabledReason}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </footer>
    )
}
