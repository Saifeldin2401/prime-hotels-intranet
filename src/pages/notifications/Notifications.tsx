/**
 * Notifications - the member's inbox.
 *
 * Grouped by day, unread first in weight, each item a single line that says
 * what happened and opens where it points. Filters follow what the product
 * actually sends: training, certificates, knowledge and reviews.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNowStrict, isThisWeek, isToday, isYesterday } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { Award, Bell, BookOpen, CheckCheck, ClipboardCheck, FileText, Trash2 } from 'lucide-react'

import { useNotifications } from '@/hooks/useNotifications'
import { usePermissions } from '@/hooks/usePermissions'
import { getNotificationLink } from '@/lib/notificationLinks'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EmptyState, Skeleton, WorkspaceHeader, headerActionClass } from '@/ui'

type Filter = 'all' | 'unread' | 'training' | 'certificates' | 'knowledge' | 'reviews'

const KIND: Record<Exclude<Filter, 'all' | 'unread'>, (n: Notification) => boolean> = {
  training: (n) => n.type === 'training_assigned' || n.type === 'training_deadline',
  certificates: (n) => /certificate/i.test(n.type) || /certificate/i.test(n.entity_type ?? ''),
  knowledge: (n) => n.type === 'document_published' || n.type === 'document_acknowledgment_required',
  reviews: (n) => n.type === 'approval_required' || n.type === 'request_returned' || n.type === 'comment_added',
}

function iconFor(n: Notification) {
  if (KIND.training(n)) return BookOpen
  if (KIND.certificates(n)) return Award
  if (KIND.knowledge(n)) return FileText
  if (KIND.reviews(n)) return ClipboardCheck
  return Bell
}

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotifications()
  const { hasPermission } = usePermissions()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('common')
  const dfLocale = i18n.language?.startsWith('ar') ? ar : enGB
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const list = notifications.filter((n) =>
      filter === 'all' ? true : filter === 'unread' ? !n.is_read : KIND[filter](n))
    const buckets: { key: string; label: string; items: Notification[] }[] = [
      { key: 'today', label: t('inbox.today', 'Today'), items: [] },
      { key: 'yesterday', label: t('inbox.yesterday', 'Yesterday'), items: [] },
      { key: 'week', label: t('inbox.week', 'Earlier this week'), items: [] },
      { key: 'older', label: t('inbox.older', 'Older'), items: [] },
    ]
    for (const n of list) {
      const d = new Date(n.created_at)
      buckets[isToday(d) ? 0 : isYesterday(d) ? 1 : isThisWeek(d) ? 2 : 3].items.push(n)
    }
    return buckets.filter((b) => b.items.length > 0)
  }, [notifications, filter, t])

  const open = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id)
    const link = getNotificationLink(n, { hasPermission })
    if (link) navigate(link)
  }

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'all', label: t('inbox.filter.all', 'Everything') },
    { id: 'unread', label: t('inbox.filter.unread', 'Unread'), count: unreadCount },
    { id: 'training', label: t('inbox.filter.training', 'Training') },
    { id: 'certificates', label: t('inbox.filter.certificates', 'Certificates') },
    { id: 'knowledge', label: t('inbox.filter.knowledge', 'Knowledge') },
    { id: 'reviews', label: t('inbox.filter.reviews', 'Reviews') },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <WorkspaceHeader
        eyebrow={t('inbox.eyebrow', 'Inbox')}
        title={t('inbox.title', 'Notifications')}
        context={unreadCount > 0 ? t('inbox.unread', '{{count}} unread', { count: unreadCount }) : t('inbox.allRead', 'You are all caught up.')}
        actions={unreadCount > 0 ? (
          <button type="button" onClick={() => markAllAsRead.mutate()} className={headerActionClass.secondary}>
            <CheckCheck aria-hidden="true" className="h-4 w-4" />{t('inbox.markAll', 'Mark all as read')}
          </button>
        ) : undefined}
      />

      <div role="group" aria-label={t('inbox.filterLabel', 'Filter notifications')} className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
            className={cn('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
              filter === f.id ? 'border-ds-ink bg-ds-ink text-ds-on-ink' : 'border-ds-border bg-ds-surface text-ds-ink hover:border-ds-border-strong')}>
            {f.label}{!!f.count && <span className="font-mono text-xs tabular-nums opacity-70">{f.count}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="card" className="h-16" />)}</div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" aria-hidden="true" />}
          title={filter === 'all' ? t('inbox.emptyTitle', 'No notifications yet') : t('inbox.emptyFilter', 'Nothing here')}
          description={filter === 'all'
            ? t('inbox.emptyBody', 'Assignments, certificates, required reading and review decisions will appear here.')
            : t('inbox.emptyFilterBody', 'No notifications of this kind. Try another filter.')}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`inbox-${g.key}`} className="space-y-2">
              <h2 id={`inbox-${g.key}`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-muted">{g.label}</h2>
              <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
                {g.items.map((n) => {
                  const Icon = iconFor(n)
                  return (
                    <li key={n.id} className="group relative flex items-start gap-3 px-4 py-3 hover:bg-ds-surface-subtle">
                      {!n.is_read && <span className="absolute inset-y-0 start-0 w-[3px] bg-ds-accent" aria-hidden="true" />}
                      <Icon aria-hidden="true" className={cn('mt-0.5 h-4 w-4 shrink-0', n.is_read ? 'text-ds-muted' : 'text-ds-accent')} />
                      <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent">
                        <span className={cn('block text-sm', n.is_read ? 'text-ds-ink-secondary' : 'font-semibold text-ds-ink')}>
                          {n.title}{!n.is_read && <span className="sr-only"> ({t('inbox.unreadLabel', 'unread')})</span>}
                        </span>
                        {n.message && <span className="mt-0.5 block line-clamp-2 text-sm text-ds-muted">{n.message}</span>}
                        <span className="mt-1 block text-xs text-ds-muted">{formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true, locale: dfLocale })}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNotification.mutate(n.id)}
                        aria-label={t('inbox.remove', 'Remove notification')}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ds-muted opacity-100 hover:bg-ds-surface hover:text-ds-danger focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
