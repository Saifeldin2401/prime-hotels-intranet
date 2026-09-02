import { type ReactNode } from 'react'
import { Bot, Check, CloudOff, Loader2, PanelLeft, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PlayerSaveState } from './types'

interface PlayerTopBarProps {
    title: string
    /** e.g. "Lesson 3 of 12 · Quiz". */
    contextLabel?: string
    /** 0-100. */
    progress: number
    saveState?: PlayerSaveState
    onExit: () => void
    onToggleRail: () => void
    railOpen?: boolean
    tools?: ReactNode
    tutor?: { active: boolean; onToggle: () => void }
    isRTL?: boolean
}

function SaveChip({ state }: { state: PlayerSaveState }) {
    if (state === 'idle') return null
    const map: Record<Exclude<PlayerSaveState, 'idle'>, { icon: ReactNode; label: string; className: string }> = {
        saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Saving', className: 'text-muted-foreground' },
        saved: { icon: <Check className="h-3 w-3" />, label: 'Saved', className: 'text-emerald-600 dark:text-emerald-400' },
        error: { icon: <CloudOff className="h-3 w-3" />, label: 'Save failed', className: 'text-destructive' },
        offline: { icon: <CloudOff className="h-3 w-3" />, label: 'Saved on device', className: 'text-amber-700 dark:text-amber-400' },
    }
    const entry = map[state]
    return (
        <span
            className={cn('hidden items-center gap-1 text-[11px] font-medium sm:inline-flex', entry.className)}
            aria-live="polite"
        >
            {entry.icon}
            {entry.label}
        </span>
    )
}

export function PlayerTopBar({
    title,
    contextLabel,
    progress,
    saveState = 'idle',
    onExit,
    onToggleRail,
    railOpen,
    tools,
    tutor,
    isRTL,
}: PlayerTopBarProps) {
    const rounded = Math.round(Math.min(100, Math.max(0, progress)))

    return (
        <header className="z-30 shrink-0 border-b border-border/60 bg-card/95 backdrop-blur-xl">
            <div className={cn('flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5', isRTL && 'flex-row-reverse')}>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggleRail}
                    aria-label="Toggle lesson list"
                    aria-pressed={railOpen}
                    className="shrink-0"
                >
                    <PanelLeft className="h-4 w-4" />
                </Button>

                <div className={cn('flex min-w-0 flex-1 flex-col', isRTL && 'items-end')}>
                    <h1 className="w-full truncate text-sm font-bold text-foreground">{title}</h1>
                    {contextLabel && (
                        <p className="w-full truncate text-[11px] text-muted-foreground">{contextLabel}</p>
                    )}
                </div>

                <SaveChip state={saveState} />

                <div
                    className="hidden items-center gap-2 md:flex"
                    role="progressbar"
                    aria-valuenow={rounded}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall progress"
                >
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-hotel-gold transition-[width] duration-500" style={{ width: `${rounded}%` }} />
                    </div>
                    <span className="font-mono text-xs font-bold text-foreground tabular-nums">{rounded}%</span>
                </div>

                {tutor && (
                    <Button
                        variant={tutor.active ? 'default' : 'outline'}
                        size="sm"
                        onClick={tutor.onToggle}
                        className={cn('h-9 shrink-0 gap-1.5', tutor.active && 'bg-hotel-navy text-white hover:bg-hotel-navy-light')}
                    >
                        <Bot className="h-4 w-4 text-hotel-gold" />
                        <span className="hidden lg:inline text-xs">AI Tutor</span>
                    </Button>
                )}

                {tools}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExit}
                    className="h-9 shrink-0 gap-1.5 font-medium text-foreground"
                    aria-label="Exit training"
                >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Exit</span>
                </Button>
            </div>

            {/* Mobile progress line */}
            <div className="h-1 w-full bg-muted md:hidden">
                <div className="h-full bg-hotel-gold transition-[width] duration-500" style={{ width: `${rounded}%` }} />
            </div>
        </header>
    )
}
