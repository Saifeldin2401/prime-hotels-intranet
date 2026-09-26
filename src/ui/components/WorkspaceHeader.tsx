import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface WorkspaceHeaderProps {
  /** Workspace name, shown small above the title (e.g. "Organization"). */
  eyebrow: string
  title: string
  /** Where this applies, e.g. "Grand Hotels › Cairo". */
  context?: string | null
  actions?: ReactNode
  /** Use the editorial display face - reserve for learner and reading surfaces. */
  editorial?: boolean
}

/** The top of every workspace home: what this is, where it applies, what to do. */
export function WorkspaceHeader({ eyebrow, title, context, actions, editorial = false }: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-ds-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-accent">{eyebrow}</p>
        <h1
          className={cn(
            'text-ds-ink',
            editorial
              ? 'font-editorial text-[34px] font-semibold leading-tight sm:text-[42px]'
              : 'text-2xl font-semibold tracking-tight sm:text-[28px]'
          )}
        >
          {title}
        </h1>
        {context && <p className="max-w-3xl text-sm text-ds-muted">{context}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

const actionBase =
  'inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent'

/** Class names for header actions rendered as links. */
export const headerActionClass = {
  primary: `${actionBase} bg-ds-ink font-semibold text-ds-on-ink hover:bg-ds-ink/90 focus-visible:ring-offset-2`,
  secondary: `${actionBase} border border-ds-border bg-ds-surface font-medium text-ds-ink hover:border-ds-border-strong`,
}
