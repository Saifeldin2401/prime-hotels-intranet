import type { ReactNode } from 'react'

export type PlayerActionIcon =
    | 'next'
    | 'previous'
    | 'quiz'
    | 'submit'
    | 'retry'
    | 'complete'
    | 'continue'
    | 'none'

export interface PlayerPrimaryAction {
    /** Stable id for the action (used for analytics + React keys). */
    id: string
    label: string
    onPress: () => void
    disabled?: boolean
    /** Rendered as a visually-hidden node + wired via aria-describedby when disabled. */
    disabledReason?: string
    /** Shows a spinner inside the bar; the button keeps its geometry (no reflow). */
    loading?: boolean
    intent?: 'default' | 'success' | 'destructive'
    icon?: PlayerActionIcon
}

export interface PlayerSecondaryAction {
    label: string
    onPress: () => void
    disabled?: boolean
    icon?: PlayerActionIcon
}

export type PlayerStatusTone = 'info' | 'success' | 'warning' | 'danger'

export interface PlayerStatus {
    text: string
    tone?: PlayerStatusTone
    /** When true the status text is announced via aria-live="polite". */
    live?: boolean
}

export interface PlayerActionRegistration {
    /** `null` => hide the primary; `undefined` => the shell computes its default action. */
    primary?: PlayerPrimaryAction | null
    secondary?: PlayerSecondaryAction | null
    status?: PlayerStatus | null
    hidePrevious?: boolean
    /** A slim sticky progress bar shown above the action row (e.g. quiz completion %). */
    progressBar?: { value: number; label: string } | null
}

export type LessonRailItemState =
    | 'current'
    | 'completed'
    | 'available'
    | 'locked'
    | 'failed'
    | 'retry'
    | 'pending-review'
    | 'exempted'
    | 'skipped'

export interface LessonRailItem {
    id: string
    index: number
    title: string
    subtitle?: string
    icon?: ReactNode
    state: LessonRailItemState
}

export type PlayerSaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
