import { type ReactNode } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useIsDesktop, usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { PlayerShellProvider } from './PlayerShellContext'
import { PlayerContentRegion } from './PlayerContentRegion'

interface PlayerShellProps {
    goNext: () => void
    goPrevious: () => void
    /** `<PlayerTopBar />` */
    topBar: ReactNode
    /** `<PlayerContextRail />` — rendered as a desktop column and inside a mobile Sheet. */
    rail: ReactNode
    railOpen: boolean
    onRailOpenChange: (open: boolean) => void
    /** `<PlayerActionBar />` */
    actionBar: ReactNode
    /** Slim banners between the top bar and content (offline, resume notice). */
    banners?: ReactNode
    /** Drawers / modals / narrator bar mounted at the shell root. */
    overlays?: ReactNode
    children: ReactNode
    contentWide?: boolean
    contentClassName?: string
    contentInnerClassName?: string
    isRTL?: boolean
}

export function PlayerShell({
    goNext,
    goPrevious,
    topBar,
    rail,
    railOpen,
    onRailOpenChange,
    actionBar,
    banners,
    overlays,
    children,
    contentWide,
    contentClassName,
    contentInnerClassName,
    isRTL,
}: PlayerShellProps) {
    const reducedMotion = usePrefersReducedMotion()
    const isDesktop = useIsDesktop()

    return (
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">
            <PlayerShellProvider goNext={goNext} goPrevious={goPrevious} reducedMotion={reducedMotion}>
                <div
                    className={cn(
                        'flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground',
                        isRTL ? 'flex-row-reverse' : '',
                    )}
                    dir={isRTL ? 'rtl' : undefined}
                >
                    {topBar}
                    {banners}

                    <div className={cn('flex min-h-0 flex-1', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                        {/* Desktop rail */}
                        {isDesktop && railOpen && (
                            <div className="w-[320px] shrink-0 border-e border-border/60">
                                {rail}
                            </div>
                        )}

                        {/* Mobile rail */}
                        <Sheet open={!isDesktop && railOpen} onOpenChange={onRailOpenChange}>
                            <SheetContent
                                side={isRTL ? 'right' : 'left'}
                                a11yTitle="Lesson navigation"
                                className="w-[88vw] max-w-[320px] p-0"
                            >
                                {rail}
                            </SheetContent>
                        </Sheet>

                        <PlayerContentRegion
                            wide={contentWide}
                            className={contentClassName}
                            innerClassName={contentInnerClassName}
                        >
                            {children}
                        </PlayerContentRegion>
                    </div>

                    {actionBar}
                </div>
                {overlays}
            </PlayerShellProvider>
          </MotionConfig>
        </LazyMotion>
    )
}
