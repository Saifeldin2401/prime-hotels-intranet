import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ExceptionTone = 'danger' | 'warning' | 'info' | 'neutral'

export interface ExceptionItem {
  id: string
  title: string
  meta?: string
  href: string
  actionLabel: string
}

export interface ExceptionGroupProps {
  title: string
  description?: string
  tone: ExceptionTone
  items: ExceptionItem[]
  /** Rows shown before "Show all". */
  initialLimit?: number
  showAllLabel: (count: number) => string
  showLessLabel: string
}

const TONE: Record<ExceptionTone, { stripe: string; count: string }> = {
  danger: { stripe: 'bg-ds-danger', count: 'bg-ds-danger-soft text-ds-danger' },
  warning: { stripe: 'bg-ds-warning', count: 'bg-ds-warning-soft text-ds-warning' },
  info: { stripe: 'bg-ds-info', count: 'bg-ds-info-soft text-ds-info' },
  neutral: { stripe: 'bg-ds-border-strong', count: 'bg-ds-surface-subtle text-ds-ink-secondary' },
}

/**
 * One kind of exception (for example "Departments without a manager") with
 * its count, why it matters, and a row per affected thing with the action
 * that resolves it. Long lists collapse so the page stays scannable.
 */
export function ExceptionGroup({
  title, description, tone, items, initialLimit = 5, showAllLabel, showLessLabel,
}: ExceptionGroupProps) {
  const headingId = useId()
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const visible = expanded ? items : items.slice(0, initialLimit)

  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
      <div className="relative flex items-start gap-3 px-4 pb-3 pt-4">
        <span className={cn('absolute inset-y-0 start-0 w-[3px]', TONE[tone].stripe)} aria-hidden="true" />
        <span className={cn('mt-0.5 inline-flex min-w-8 justify-center rounded-[4px] px-1.5 py-0.5 font-mono text-sm font-medium tabular-nums', TONE[tone].count)}>
          {items.length}
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-[15px] font-semibold text-ds-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ds-muted">{description}</p>}
        </div>
      </div>
      <ul className="divide-y divide-ds-border border-t border-ds-border">
        {visible.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className="group flex min-h-[52px] items-center gap-3 px-4 py-2.5 hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ds-ink">{item.title}</span>
                {item.meta && <span className="block truncate text-xs text-ds-muted">{item.meta}</span>}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ds-accent">
                {item.actionLabel}
                <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > initialLimit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full border-t border-ds-border px-4 py-2.5 text-start text-sm font-semibold text-ds-accent hover:bg-ds-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-accent"
        >
          {expanded ? showLessLabel : showAllLabel(items.length)}
        </button>
      )}
    </section>
  )
}
