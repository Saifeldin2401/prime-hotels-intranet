import { AlertCircle, CheckCircle2, Circle, Clock, Lock } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { LessonRailItem, LessonRailItemState } from './types'

interface PlayerContextRailProps {
    moduleTitle: string
    items: LessonRailItem[]
    activeIndex: number
    onSelect: (index: number) => void
    /** 0-100. */
    progress: number
    className?: string
}

const STATE_META: Record<LessonRailItemState, { className: string }> = {
    current: { className: 'text-hotel-gold' },
    completed: { className: 'text-emerald-500' },
    available: { className: 'text-muted-foreground' },
    locked: { className: 'text-muted-foreground/50' },
    failed: { className: 'text-amber-500' },
    retry: { className: 'text-amber-500' },
    'pending-review': { className: 'text-blue-500' },
    exempted: { className: 'text-emerald-500/70' },
    skipped: { className: 'text-muted-foreground/60' },
}

function StateIcon({ state }: { state: LessonRailItemState }) {
    switch (state) {
        case 'completed':
        case 'exempted':
            return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        case 'locked':
            return <Lock className="h-4 w-4 text-muted-foreground/50" />
        case 'failed':
        case 'retry':
            return <AlertCircle className="h-4 w-4 text-amber-500" />
        case 'pending-review':
            return <Clock className="h-4 w-4 text-blue-500" />
        default:
            return <Circle className="h-4 w-4 text-muted-foreground/40" />
    }
}

export function PlayerContextRail({
    moduleTitle,
    items,
    activeIndex,
    onSelect,
    progress,
    className,
}: PlayerContextRailProps) {
    const rounded = Math.round(Math.min(100, Math.max(0, progress)))

    return (
        <nav
            aria-label="Lesson navigation"
            className={cn('flex h-full w-full flex-col bg-hotel-navy-dark text-white', className)}
        >
            <div className="border-b border-white/10 p-5">
                <h2 className="mb-3 line-clamp-2 font-serif text-base font-bold leading-tight">{moduleTitle}</h2>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-widest text-white/60">Progress</span>
                    <span className="font-bold text-hotel-gold">{rounded}%</span>
                </div>
                <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={rounded}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall progress"
                >
                    <div className="h-full rounded-full bg-hotel-gold transition-[width] duration-700" style={{ width: `${rounded}%` }} />
                </div>
            </div>

            <ol className="flex-1 space-y-1 overflow-y-auto p-3">
                {items.map((item) => {
                    const isActive = item.index === activeIndex
                    const isLocked = item.state === 'locked'
                    return (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(item.index)}
                                aria-current={isActive ? 'step' : undefined}
                                aria-disabled={isLocked || undefined}
                                className={cn(
                                    'group flex w-full items-start gap-3 rounded-xl p-3 text-start text-sm transition-colors',
                                    isActive
                                        ? 'bg-hotel-gold/20 ring-1 ring-hotel-gold/40'
                                        : 'hover:bg-white/5',
                                )}
                            >
                                <span className="mt-0.5 flex shrink-0 items-center gap-2">
                                    <span
                                        className={cn(
                                            'w-5 text-center font-mono text-xs font-bold',
                                            isActive ? 'text-hotel-gold' : item.state === 'completed' ? 'text-emerald-400' : 'text-white/40',
                                        )}
                                    >
                                        {String(item.index + 1).padStart(2, '0')}
                                    </span>
                                    <StateIcon state={item.state} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={cn(
                                            'line-clamp-2 block font-medium leading-snug',
                                            isActive ? 'text-white' : isLocked ? 'text-white/40' : 'text-white/90',
                                        )}
                                    >
                                        {item.title}
                                    </span>
                                    {item.subtitle && (
                                        <span className={cn('mt-0.5 block font-mono text-[10px] uppercase tracking-wider', STATE_META[item.state].className, 'opacity-90')}>
                                            {item.subtitle}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
