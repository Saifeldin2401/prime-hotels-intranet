import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { LearningProgress } from '@/hooks/useLearningProgress'
import { cn } from '@/lib/utils'
import { AlertTriangle, BookOpen, CheckCircle2, Clock, Eye, Filter, Loader2, MoreVertical, RotateCcw, Search, Shield, TrendingUp, UserX } from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface TrackerStatusMeta {
  badgeClass: string
  label: string
  progressClass: string
}

interface TrackerRecord {
  id: string
  lastTouchedAt: string
  passed?: boolean
  completed_at?: string
  last_block_index?: number | null
  resolvedModuleTitle: string
  resolvedProgress: number
  resolvedScore: number | null
  status: LearningProgress['status']
  time_spent_seconds?: number | null
}

interface TrackerGroup {
  activeModules: number
  assignedModules: number
  attentionCount: number
  averageProgress: number
  averageScore: number | null
  completedModules: number
  departmentName: string
  highlightModule: TrackerRecord | null
  inProgressModules: number
  lastTouchedAt: string | null
  locationLabel: string
  overdueModules: number
  propertyName: string
  records: TrackerRecord[]
  totalModules: number
  userId: string
  userInitials: string
  userName: string
  avatarUrl?: string
}

interface TrackerMetrics {
  completed: number
  in_progress: number
  overdue: number
  total: number
  uniqueModules: number
}

interface TrackerSummary {
  averageModulesPerEmployee: number
  averageProgress: number
  averageScore: number | null
  completionRate: number
  employeeCount: number
  employeesNeedingFollowUp: number
}

interface EmployeeProgressTrackerProps {
  describeFollowUp: (group: TrackerGroup) => string
  followUpQueue: TrackerGroup[]
  formatDate: (value: string) => string
  formatDuration: (seconds?: number | null) => string
  getProgressStatusMeta: (status: LearningProgress['status']) => TrackerStatusMeta
  groups: TrackerGroup[]
  isLoading: boolean
  isRTL: boolean
  metrics: TrackerMetrics
  moduleLoadLeaders: TrackerGroup[]
  onViewDetails: (id: string) => void
  summary: TrackerSummary
  // Admin action controls
  onResetProgress?: (userId: string, moduleId: string) => void
  onRevokeCertificate?: (userId: string, moduleId: string) => void
  onExemptUser?: (userId: string, moduleId: string) => void
  onRestoreUser?: (userId: string, moduleId: string) => void
  isAdmin?: boolean
}

/* ─── Small circular progress ring ─── */
function ProgressRing({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-slate-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-hotel-gold transition-all duration-500"
      />
    </svg>
  )
}

/* ─── Status filter tabs for module list ─── */
type ModuleFilterTab = 'all' | 'active' | 'completed'

/* ─── Unified module list with filter tabs and admin actions ─── */
function ModuleListPanel({
  records,
  getProgressStatusMeta,
  onViewDetails,
  formatDate,
  formatDuration,
  t,
  userId,
  onResetProgress,
  onRevokeCertificate,
  onExemptUser,
  isAdmin
}: {
  records: TrackerRecord[]
  getProgressStatusMeta: (status: LearningProgress['status']) => TrackerStatusMeta
  onViewDetails: (id: string) => void
  formatDate: (value: string) => string
  formatDuration: (seconds?: number | null) => string
  t: any
  userId: string
  onResetProgress?: (userId: string, moduleId: string) => void
  onRevokeCertificate?: (userId: string, moduleId: string) => void
  onExemptUser?: (userId: string, moduleId: string) => void
  isAdmin?: boolean
}) {
  const [moduleFilter, setModuleFilter] = useState<ModuleFilterTab>('all')

  const activeRecords = useMemo(() =>
    records.filter((r) => r.status !== 'completed' && r.status !== 'excused'),
    [records]
  )
  const completedRecords = useMemo(() =>
    records.filter((r) => r.status === 'completed'),
    [records]
  )

  const displayedRecords = useMemo(() => {
    switch (moduleFilter) {
      case 'active': return activeRecords
      case 'completed': return completedRecords
      default: return records
    }
  }, [moduleFilter, records, activeRecords, completedRecords])

  const filterTabs: { key: ModuleFilterTab; label: string; count: number; color: string }[] = [
    { key: 'all', label: t('allModules', 'All modules'), count: records.length, color: 'text-slate-600 bg-slate-100' },
    { key: 'active', label: t('active', 'Active'), count: activeRecords.length, color: 'text-sky-700 bg-sky-50' },
    { key: 'completed', label: t('completed'), count: completedRecords.length, color: 'text-emerald-700 bg-emerald-50' }
  ]

  return (
    <div className="rounded-xl border p-4">
      {/* Filter tabs header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Filter className="size-3.5 text-muted-foreground" />
          <div className="flex gap-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setModuleFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                  moduleFilter === tab.key
                    ? `${tab.color} ring-1 ring-inset ring-current/20`
                    : "text-muted-foreground hover:bg-slate-50"
                )}
              >
                {tab.label}
                <span className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  moduleFilter === tab.key ? "bg-white/70" : "bg-slate-100"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Module records */}
      {displayedRecords.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-slate-50/50 p-4 text-center text-sm text-muted-foreground">
          {moduleFilter === 'active' && t('noActiveModules', 'No active modules in the queue.')}
          {moduleFilter === 'completed' && t('noCompletedModules', 'No completed modules yet.')}
          {moduleFilter === 'all' && t('noModulesAssigned', 'No modules assigned.')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayedRecords.map((record) => {
            const statusMeta = getProgressStatusMeta(record.status)
            const isCompleted = record.status === 'completed'
            return (
              <div
                key={record.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isCompleted ? "bg-emerald-50/40" : "bg-slate-50/60"
                )}
              >
                {/* Row 1: Title + Status + Details button */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {record.resolvedModuleTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isCompleted && record.completed_at
                        ? `${t('completedAt', 'Completed')}: ${formatDate(record.completed_at)}`
                        : record.last_block_index !== null && record.last_block_index !== undefined
                          ? t('currentStepWithNumber', 'Current step: Part {{number}}', { number: (record.last_block_index || 0) + 1 })
                          : `${t('lastAccess')}: ${formatDate(record.lastTouchedAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className={cn("text-[11px]", statusMeta.badgeClass)}>
                      {statusMeta.label}
                    </Badge>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-slate-200/60"
                            title={t('actions', 'Actions')}
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>{t('adminActions', 'Admin Actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {onResetProgress && (
                            <DropdownMenuItem
                              onClick={() => onResetProgress(userId, record.id)}
                              className="text-amber-600"
                            >
                              <RotateCcw className="size-4 mr-2" />
                              {t('resetProgress', 'Reset Progress')}
                            </DropdownMenuItem>
                          )}
                          {isCompleted && onRevokeCertificate && (
                            <DropdownMenuItem
                              onClick={() => onRevokeCertificate(userId, record.id)}
                              className="text-rose-600"
                            >
                              <Shield className="size-4 mr-2" />
                              {t('revokeCertificate', 'Revoke Certificate')}
                            </DropdownMenuItem>
                          )}
                          {onExemptUser && (
                            <DropdownMenuItem
                              onClick={() => onExemptUser(userId, record.id)}
                              className="text-slate-600"
                            >
                              <UserX className="size-4 mr-2" />
                              {t('exemptUser', 'Exempt User')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:bg-slate-200/60"
                      title={t('viewDetails', 'View details')}
                      onClick={() => onViewDetails(record.id)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Row 2: Progress bar + Score + Time */}
                <div className="mt-2.5 flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={record.resolvedProgress} className={cn('h-2', statusMeta.progressClass)} />
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-600">
                    {record.resolvedProgress}%
                  </span>
                  <span className={cn(
                    "shrink-0 text-xs font-semibold",
                    record.resolvedScore === null
                      ? "text-muted-foreground"
                      : record.passed ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : '—'}
                  </span>
                  {record.time_spent_seconds != null && record.time_spent_seconds > 0 && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDuration(record.time_spent_seconds)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function EmployeeProgressTracker({
  describeFollowUp,
  followUpQueue,
  formatDate,
  formatDuration,
  getProgressStatusMeta,
  groups,
  isLoading,
  isRTL,
  metrics,
  moduleLoadLeaders,
  onViewDetails,
  summary,
  onResetProgress,
  onRevokeCertificate,
  onExemptUser,
  onRestoreUser,
  isAdmin
}: EmployeeProgressTrackerProps) {
  const { t } = useTranslation('training')

  return (
    <Card className="border-t-4 border-t-hotel-navy shadow-md">
      <CardHeader className="gap-3 border-b bg-slate-50/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-heading text-hotel-navy">{t('employeeProgress')}</CardTitle>
            <CardDescription>
              {t(
                'employeeTrackerDescription',
                'Track each employee as a portfolio of modules so multiple assignments stay readable and actionable.'
              )}
            </CardDescription>
          </div>
          {/* Header summary badges with colored dots */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-indigo-500" />
              {summary.employeeCount} {t('staff', 'Staff')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-slate-400" />
              {metrics.uniqueModules} {t('modules', 'Modules')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-blue-400" />
              {metrics.total} {t('totalEnrollments', 'Enrollments')}
            </span>
            {summary.averageScore !== null && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-full bg-hotel-gold" />
                {t('analytics.avgScore', 'Avg Score')}: {summary.averageScore}%
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-10 animate-spin text-hotel-gold" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Search className="size-12" />}
            title={t('noProgressFound')}
            description={t('adjustFilters', 'Try adjusting the current filters to uncover matching training progress.')}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_340px]">
            {/* ══════════════════════ LEFT PANEL: Employee Accordion List ══════════════════════ */}
            <div className="flex flex-col gap-4">
              {/* Top summary strip */}
              <div className="rounded-xl border bg-slate-50/70 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{summary.employeeCount}</span>
                    {' '}{t('trackingSummaryEmployees', 'employees')} · {' '}
                    <span className="font-semibold text-slate-900">{metrics.uniqueModules}</span>
                    {' '}{t('modules', 'modules')} · {' '}
                    <span className="font-semibold text-slate-900">{metrics.total}</span>
                    {' '}{t('totalEnrollments', 'enrollments')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                      {metrics.completed} {t('completed')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block size-1.5 rounded-full bg-sky-500" />
                      {metrics.in_progress} {t('inProgress')}
                    </span>
                    {metrics.overdue > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block size-1.5 rounded-full bg-rose-500" />
                        {metrics.overdue} {t('overdue')}
                      </span>
                    )}
                  </div>
                </div>
                {summary.employeesNeedingFollowUp > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('trackingSummaryLineSecondary', '{{followUp}} employees need attention and the average portfolio holds {{load}} modules.', {
                      followUp: summary.employeesNeedingFollowUp,
                      load: summary.averageModulesPerEmployee
                    })}
                  </p>
                )}
              </div>

              {/* Employee Accordion */}
              <Accordion type="multiple" className="flex flex-col gap-3">
                {groups.map((group) => {
                  const needsAttention = group.overdueModules > 0 || group.attentionCount > 0

                  return (
                    <AccordionItem
                      key={group.userId}
                      value={group.userId}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md",
                        needsAttention && "border-rose-200/60"
                      )}
                    >
                      <AccordionTrigger className="px-4 py-3.5 hover:no-underline [&[data-state=open]]:bg-slate-50/50">
                        <div className="flex w-full items-center gap-4 text-left">
                          {/* ── Avatar ── */}
                          <Avatar className="size-10 shrink-0 border border-slate-200 shadow-sm">
                            <AvatarImage src={group.avatarUrl || ''} />
                            <AvatarFallback className="bg-hotel-navy/10 text-sm font-semibold text-hotel-navy">
                              {group.userInitials}
                            </AvatarFallback>
                          </Avatar>

                          {/* ── Identity + metadata ── */}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-900">
                                {group.userName}
                              </span>
                              {group.overdueModules > 0 && (
                                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[11px] px-1.5 py-0">
                                  {group.overdueModules} {t('overdue')}
                                </Badge>
                              )}
                              {group.totalModules >= 4 && (
                                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[11px] px-1.5 py-0">
                                  {group.totalModules} {t('modules', 'Modules')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              <span>{group.departmentName || t('noDept')}</span>
                              <span className="text-slate-300">·</span>
                              <span>{group.propertyName || '-'}</span>
                            </div>
                            {/* Compact stat chips — only non-zero */}
                            <div className="mt-0.5 flex flex-wrap gap-1.5">
                              {group.completedModules > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                  <CheckCircle2 className="size-3" /> {group.completedModules}
                                </span>
                              )}
                              {group.inProgressModules > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                                  <Clock className="size-3" /> {group.inProgressModules}
                                </span>
                              )}
                              {group.assignedModules > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  <BookOpen className="size-3" /> {group.assignedModules}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ── Right stats: progress ring + score ── */}
                          <div className="hidden shrink-0 items-center gap-4 sm:flex">
                            <div className="relative flex items-center justify-center">
                              <ProgressRing value={group.averageProgress} />
                              <span className="absolute text-xs font-bold text-slate-800">
                                {group.averageProgress}%
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 text-right">
                              <span className="text-xs text-muted-foreground">{t('analytics.avgScore', 'Avg Score')}</span>
                              <span className="text-lg font-bold text-slate-800">
                                {group.averageScore !== null ? `${group.averageScore}%` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pt-1 pb-4">
                        <Separator className="mb-4" />

                        {/* Mobile-only stats row */}
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:hidden">
                          <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
                            <ProgressRing value={group.averageProgress} size={36} stroke={3} />
                            <div>
                              <p className="text-xs text-muted-foreground">{t('progress')}</p>
                              <p className="text-sm font-bold text-slate-900">{group.averageProgress}%</p>
                            </div>
                          </div>
                          <div className="rounded-lg border bg-slate-50 p-3">
                            <p className="text-xs text-muted-foreground">{t('analytics.avgScore', 'Avg Score')}</p>
                            <p className="text-sm font-bold text-slate-900">
                              {group.averageScore !== null ? `${group.averageScore}%` : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_280px]">
                          {/* ── Main content: Unified module list with filter tabs ── */}
                          <div className="flex flex-col gap-4">
                            <ModuleListPanel
                              records={group.records}
                              getProgressStatusMeta={getProgressStatusMeta}
                              onViewDetails={onViewDetails}
                              formatDate={formatDate}
                              formatDuration={formatDuration}
                              t={t}
                              userId={group.userId}
                              onResetProgress={onResetProgress}
                              onRevokeCertificate={onRevokeCertificate}
                              onExemptUser={onExemptUser}
                              isAdmin={isAdmin}
                            />
                          </div>

                          {/* ── Sidebar column ── */}
                          <div className="flex flex-col gap-3">
                            {/* Load breakdown */}
                            <div className="rounded-xl border p-4">
                              <p className="mb-3 text-sm font-semibold text-slate-900">{t('loadBreakdown', 'Load breakdown')}</p>
                              <div className="grid gap-1.5">
                                {group.overdueModules > 0 && (
                                  <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                    <span className="flex items-center gap-2">
                                      <AlertTriangle className="size-3.5" /> {t('overdue')}
                                    </span>
                                    <span className="font-semibold">{group.overdueModules}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
                                  <span className="flex items-center gap-2">
                                    <Clock className="size-3.5" /> {t('inProgress')}
                                  </span>
                                  <span className="font-semibold">{group.inProgressModules}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                  <span className="flex items-center gap-2">
                                    <BookOpen className="size-3.5" /> {t('assigned')}
                                  </span>
                                  <span className="font-semibold">{group.assignedModules}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                  <span className="flex items-center gap-2">
                                    <CheckCircle2 className="size-3.5" /> {t('completed')}
                                  </span>
                                  <span className="font-semibold">{group.completedModules}</span>
                                </div>
                              </div>
                            </div>

                            {/* Focus module */}
                            {group.highlightModule && (
                              <div className="rounded-xl border bg-blue-50/40 p-4">
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-600">{t('focusModule', 'Focus module')}</p>
                                <p className="text-sm font-medium text-slate-900">{group.highlightModule.resolvedModuleTitle}</p>
                                <p className="mt-1.5 text-xs text-muted-foreground">{describeFollowUp(group)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>

            {/* ══════════════════════ RIGHT PANEL: Digest, Follow-up, Leaderboard ══════════════════════ */}
            <div className="flex flex-col gap-4">
              {/* Tracking Digest */}
              <Card className="border-slate-200">
                <CardHeader className="gap-1 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="size-4 text-hotel-navy" />
                    {t('trackingDigest', 'Tracking digest')}
                  </CardTitle>
                  <CardDescription>{t('trackingDigestDescription', 'Surface follow-up risk, average load, and completion health without scanning every module row.')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border bg-gradient-to-br from-rose-50 to-white p-4">
                    <p className="text-xs font-medium text-rose-600">{t('requiredAction', 'Required Action')}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{summary.employeesNeedingFollowUp}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('staff', 'Staff')}</p>
                  </div>
                  <div className="rounded-xl border bg-gradient-to-br from-hotel-gold/10 to-white p-4">
                    <p className="text-xs font-medium text-hotel-navy">{t('portfolioProgress', 'Portfolio progress')}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{summary.averageProgress}%</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('completionRate', 'Completion rate')}: {summary.completionRate}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-up Queue */}
              <Card className="border-slate-200">
                <CardHeader className="gap-1 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-rose-500" />
                    {t('followUpQueue', 'Follow-up queue')}
                  </CardTitle>
                  <CardDescription>{t('followUpQueueDescription', 'Prioritize employees carrying overdue or stacked assignments.')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {followUpQueue.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-emerald-50/50 p-4 text-center text-sm text-emerald-700">
                      {t('followUpQueueEmpty', 'No employees currently need immediate follow-up.')}
                    </div>
                  ) : (
                    followUpQueue.map((group) => (
                      <div key={group.userId} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 line-clamp-1">{group.userName}</p>
                            <p className="text-[11px] text-muted-foreground">{group.locationLabel}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 border-rose-200 bg-rose-50 text-rose-700 text-[11px]">
                            {group.attentionCount}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{describeFollowUp(group)}</p>
                        {group.highlightModule && (
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                            → {group.highlightModule.resolvedModuleTitle}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Module Load Leaders */}
              <Card className="border-slate-200">
                <CardHeader className="gap-1 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="size-4 text-amber-600" />
                    {t('moduleLoadLeaderboard', 'Heaviest module load')}
                  </CardTitle>
                  <CardDescription>{t('moduleLoadLeaderboardDescription', 'See who is carrying the largest training portfolio right now.')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {moduleLoadLeaders.map((group) => (
                    <div key={group.userId} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">{group.userName}</p>
                          <p className="text-[11px] text-muted-foreground">{group.locationLabel}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[11px]">
                          {group.totalModules} {t('modules', 'Modules')}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('inProgress')}: {group.activeModules}</span>
                        <span>{t('completed')}: {group.completedModules}</span>
                      </div>
                      <Progress value={group.averageProgress} className="mt-2 h-1.5 [&>div]:bg-hotel-gold" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
