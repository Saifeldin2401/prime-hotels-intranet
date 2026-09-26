import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, Medal, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar, EmptyState, ErrorState, Skeleton } from '@/ui'

import type { LeaderboardPeriod, LeaderboardScope } from '../gamificationApi'
import { useLeaderboard, useTeamLeaderboard } from '../gamificationHooks'

type Board = 'people' | 'teams'

interface LeaderboardPanelProps {
  /** Compact: top 5, no team tab or scope switch (home aside). */
  compact?: boolean
  className?: string
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown aria-hidden="true" className="h-4 w-4 text-ds-brass" />
  if (rank <= 3) return <Medal aria-hidden="true" className={cn('h-4 w-4', rank === 2 ? 'text-ds-muted' : 'text-ds-warning')} />
  return <span className="font-mono text-xs tabular-nums text-ds-muted">{rank}</span>
}

function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-ds-border bg-ds-surface-subtle p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'min-h-[32px] rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
            value === o.id ? 'bg-ds-surface text-ds-ink shadow-sm' : 'text-ds-muted hover:text-ds-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function LeaderboardPanel({ compact = false, className }: LeaderboardPanelProps) {
  const { t, i18n } = useTranslation('training')
  const locale = i18n.language?.startsWith('ar') ? 'ar-SA' : 'en-GB'
  const [board, setBoard] = useState<Board>('people')
  const [period, setPeriod] = useState<LeaderboardPeriod>('month')
  const [scope, setScope] = useState<LeaderboardScope>('organization')

  const people = useLeaderboard(period, scope, compact ? 5 : 10)
  const teams = useTeamLeaderboard(period, board === 'teams')
  const query = board === 'people' ? people : teams
  const fmt = (n: number) => n.toLocaleString(locale)

  const periods: { id: LeaderboardPeriod; label: string }[] = [
    { id: 'week', label: t('game.board.week', 'Week') },
    { id: 'month', label: t('game.board.month', 'Month') },
    { id: 'all', label: t('game.board.all', 'All time') },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {!compact && (
          <Segmented<Board>
            label={t('game.board.boardLabel', 'Leaderboard')}
            value={board}
            onChange={setBoard}
            options={[
              { id: 'people', label: t('game.board.people', 'People') },
              { id: 'teams', label: t('game.board.teams', 'Teams') },
            ]}
          />
        )}
        <Segmented<LeaderboardPeriod> label={t('game.board.periodLabel', 'Period')} value={period} onChange={setPeriod} options={periods} />
        {!compact && board === 'people' && (
          <Segmented<LeaderboardScope>
            label={t('game.board.scopeLabel', 'Who')}
            value={scope}
            onChange={setScope}
            options={[
              { id: 'organization', label: t('game.board.everyone', 'Everyone') },
              { id: 'department', label: t('game.board.myTeam', 'My team') },
            ]}
          />
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
          <Skeleton variant="card" className="h-12" />
        </div>
      ) : query.isError ? (
        <ErrorState message={t('game.board.error', 'The leaderboard could not be loaded.')} onRetry={() => void query.refetch()} />
      ) : board === 'people' ? (
        (people.data ?? []).length === 0 ? (
          <EmptyState
            illustration="team"
            title={t('game.board.emptyPeople', 'No one on the board yet')}
            description={t('game.board.emptyPeopleHint', 'Complete a lesson to put your name up here.')}
          />
        ) : (
          <ol className="divide-y divide-ds-border overflow-hidden rounded-lg border border-ds-border bg-ds-surface">
            {(people.data ?? []).map((row) => (
              <li
                key={row.user_id}
                className={cn('flex min-h-[52px] items-center gap-3 px-3 py-2', row.is_me && 'bg-ds-accent-soft')}
                aria-current={row.is_me ? 'true' : undefined}
              >
                <span className="flex w-6 justify-center"><RankBadge rank={row.rank} /></span>
                <Avatar src={row.avatar_url} alt={row.full_name ?? ''} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ds-ink">
                    {row.full_name ?? t('game.board.member', 'Member')}
                    {row.is_me && <span className="ms-1.5 text-xs font-semibold text-ds-accent">{t('game.board.you', '(you)')}</span>}
                  </span>
                  {!compact && row.department_name && <span className="block truncate text-xs text-ds-muted">{row.department_name}</span>}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-ds-ink">
                  {fmt(row.points)} <span className="text-xs font-normal text-ds-muted">{t('game.pts', 'pts')}</span>
                </span>
              </li>
            ))}
          </ol>
        )
      ) : (teams.data ?? []).length === 0 ? (
        <EmptyState
          illustration="team"
          title={t('game.board.emptyTeams', 'No teams to compare yet')}
          description={t('game.board.emptyTeamsHint', 'Teams appear once members are placed in departments.')}
        />
      ) : (
        <ol className="divide-y divide-ds-border overflow-hidden rounded-lg border border-ds-border bg-ds-surface">
          {(teams.data ?? []).map((row) => (
            <li
              key={row.department_id}
              className={cn('flex min-h-[56px] items-center gap-3 px-3 py-2', row.is_my_team && 'bg-ds-accent-soft')}
              aria-current={row.is_my_team ? 'true' : undefined}
            >
              <span className="flex w-6 justify-center"><RankBadge rank={row.rank} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ds-ink">
                  {row.department_name}
                  {row.is_my_team && <span className="ms-1.5 text-xs font-semibold text-ds-accent">{t('game.board.yourTeam', '(your team)')}</span>}
                </span>
                <span className="block text-xs text-ds-muted">
                  {t('game.board.members', '{{count}} members', { count: row.member_count })}
                  {row.completion_rate !== null && ` · ${t('game.board.completion', '{{pct}}% completion', { pct: row.completion_rate })}`}
                </span>
              </span>
              <span className="text-end">
                <span className="block font-mono text-sm font-semibold tabular-nums text-ds-ink">{fmt(row.points_per_member)}</span>
                <span className="block text-[11px] text-ds-muted">{t('game.board.perMember', 'pts / member')}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
