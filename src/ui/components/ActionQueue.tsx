import { AlertCircle, ArrowRight, CheckCircle2, Clock3, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type ActionQueueTone = 'urgent' | 'attention' | 'standard'

export interface ActionQueueItem {
  id: string
  title: string
  description?: string
  meta?: string
  tone?: ActionQueueTone
  icon?: LucideIcon
  href?: string
  actionLabel: string
  onAction?: () => void
}

interface ActionQueueProps {
  items: ActionQueueItem[]
  emptyTitle: string
  emptyDescription: string
  className?: string
}

const toneStyles: Record<ActionQueueTone, string> = {
  urgent: 'border-destructive/30 bg-destructive/[0.04] text-destructive',
  attention: 'border-warning/30 bg-warning/[0.05] text-warning',
  standard: 'border-border/60 bg-background/60 text-muted-foreground',
}

/** An action-led queue for operational work, keeping the reason and next step together. */
export function ActionQueue({ items, emptyTitle, emptyDescription, className }: ActionQueueProps) {
  if (items.length === 0) {
    return (
      <div className={cn('rounded-xl border border-success/25 bg-success/5 px-5 py-8 text-center', className)}>
        <CheckCircle2 className="mx-auto mb-3 h-6 w-6 text-success" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <ul className={cn('space-y-2.5', className)} role="list">
      {items.map((item) => {
        const Icon = item.icon ?? (item.tone === 'urgent' ? AlertCircle : Clock3)
        const action = item.href ? (
          <Button asChild size="sm" variant={item.tone === 'urgent' ? 'destructive' : 'outline'} className="shrink-0">
            <Link to={item.href}>{item.actionLabel}<ArrowRight className="ms-1" aria-hidden="true" /></Link>
          </Button>
        ) : (
          <Button size="sm" variant={item.tone === 'urgent' ? 'destructive' : 'outline'} className="shrink-0" onClick={item.onAction}>
            {item.actionLabel}<ArrowRight className="ms-1" aria-hidden="true" />
          </Button>
        )

        return (
          <li key={item.id} className={cn('flex items-center gap-3 rounded-xl border p-3', toneStyles[item.tone ?? 'standard'])}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-current shadow-sm">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
              {(item.description || item.meta) && <p className="mt-0.5 truncate text-xs text-muted-foreground">{[item.description, item.meta].filter(Boolean).join(' · ')}</p>}
            </div>
            {action}
          </li>
        )
      })}
    </ul>
  )
}
