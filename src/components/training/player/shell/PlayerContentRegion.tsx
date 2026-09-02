import { forwardRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { usePlayerShell } from './PlayerShellContext'

interface PlayerContentRegionProps {
    children: ReactNode
    /** Widen the readable column for media-heavy blocks. */
    wide?: boolean
    className?: string
    /** Applied to the inner max-width wrapper (e.g. font-size modifier, zen mode). */
    innerClassName?: string
}

/**
 * The single vertical scroll container for the player. Everything else in the
 * shell (top bar, rail, action bar) is a fixed flex sibling and never scrolls.
 */
export const PlayerContentRegion = forwardRef<HTMLDivElement, PlayerContentRegionProps>(
    function PlayerContentRegion({ children, wide, className, innerClassName }, forwardedRef) {
        const { contentRef } = usePlayerShell()

        const setRefs = (node: HTMLDivElement | null) => {
            contentRef.current = node
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
        }

        return (
            <div
                ref={setRefs}
                className={cn(
                    'min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-pt-6',
                    className,
                )}
            >
                <div
                    className={cn(
                        'mx-auto w-full px-4 py-6 sm:px-6 md:px-8 lg:py-10',
                        wide ? 'max-w-4xl' : 'max-w-3xl',
                        innerClassName,
                    )}
                >
                    {children}
                </div>
            </div>
        )
    },
)
