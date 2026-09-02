import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react'

import type { PlayerActionRegistration } from './types'

const EMPTY_REGISTRATION: PlayerActionRegistration = {}

export interface PlayerShellContextValue {
    register: (id: string, reg: PlayerActionRegistration) => void
    unregister: (id: string) => void
    /** The active registration (last registrant wins). */
    current: PlayerActionRegistration
    /** Ref to the single scroll container (the content region). */
    contentRef: RefObject<HTMLDivElement | null>
    scrollToTop: (opts?: { smooth?: boolean }) => void
    /** Moves focus to the active block heading (element with `data-player-heading`). */
    focusHeading: () => void
    goNext: () => void
    goPrevious: () => void
    reducedMotion: boolean
    /** False when a component renders outside a PlayerShell (e.g. standalone quiz). */
    hasShell: boolean
}

const noop = () => {}

const DEFAULT_VALUE: PlayerShellContextValue = {
    register: noop,
    unregister: noop,
    current: EMPTY_REGISTRATION,
    contentRef: { current: null },
    scrollToTop: noop,
    focusHeading: noop,
    goNext: noop,
    goPrevious: noop,
    reducedMotion: false,
    hasShell: false,
}

const PlayerShellContext = createContext<PlayerShellContextValue>(DEFAULT_VALUE)

/** Safe to call outside a provider — returns inert no-ops with `hasShell: false`. */
export function usePlayerShell(): PlayerShellContextValue {
    return useContext(PlayerShellContext)
}

interface ProviderProps {
    goNext: () => void
    goPrevious: () => void
    reducedMotion: boolean
    children: ReactNode
}

export function PlayerShellProvider({ goNext, goPrevious, reducedMotion, children }: ProviderProps) {
    const contentRef = useRef<HTMLDivElement | null>(null)
    const [registrations, setRegistrations] = useState<Array<{ id: string; reg: PlayerActionRegistration }>>([])

    const register = useCallback((id: string, reg: PlayerActionRegistration) => {
        setRegistrations((prev) => [...prev.filter((r) => r.id !== id), { id, reg }])
    }, [])

    const unregister = useCallback((id: string) => {
        setRegistrations((prev) => prev.filter((r) => r.id !== id))
    }, [])

    const current = registrations.length > 0
        ? registrations[registrations.length - 1].reg
        : EMPTY_REGISTRATION

    const scrollToTop = useCallback((opts?: { smooth?: boolean }) => {
        contentRef.current?.scrollTo({
            top: 0,
            behavior: opts?.smooth && !reducedMotion ? 'smooth' : 'auto',
        })
    }, [reducedMotion])

    const focusHeading = useCallback(() => {
        // Defer a frame so the incoming block's heading has mounted.
        requestAnimationFrame(() => {
            const el = contentRef.current?.querySelector<HTMLElement>('[data-player-heading]')
            el?.focus()
        })
    }, [])

    const value = useMemo<PlayerShellContextValue>(() => ({
        register,
        unregister,
        current,
        contentRef,
        scrollToTop,
        focusHeading,
        goNext,
        goPrevious,
        reducedMotion,
        hasShell: true,
    }), [register, unregister, current, scrollToTop, focusHeading, goNext, goPrevious, reducedMotion])

    return <PlayerShellContext.Provider value={value}>{children}</PlayerShellContext.Provider>
}

/**
 * Register a contextual action into the shell's persistent action bar.
 * Pass a memoised `reg` object; pass `null` to register nothing (e.g. when a
 * shared component is rendered on a surface without a shell).
 */
export function useRegisterPlayerAction(reg: PlayerActionRegistration | null) {
    const { register, unregister } = usePlayerShell()
    const id = useId()

    useEffect(() => {
        if (reg == null) {
            unregister(id)
            return
        }
        register(id, reg)
        return () => unregister(id)
    }, [id, reg, register, unregister])
}
