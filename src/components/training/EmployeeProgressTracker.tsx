import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { LearningProgress } from '@/hooks/useLearningProgress'
import { cn } from '@/lib/utils'
import { Eye, Loader2, Search } from 'lucide-react'
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
  summary
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
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t('staff', 'Staff')}: {summary.employeeCount}</Badge>
            <Badge variant="outline">{t('modules', 'Modules')}: {metrics.total}</Badge>
            <Badge variant="outline">
              {t('analytics.avgScore', 'Avg Score')}: {summary.averageScore !== null ? `${summary.averageScore}%` : '-'}
            </Badge>
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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-900">
                      {t('trackingSummaryLine', '{{employees}} employees across {{modules}} filtered modules', {
                        employees: summary.employeeCount,
                        modules: metrics.total
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('trackingSummaryLineSecondary', '{{followUp}} employees need attention and the average portfolio holds {{load}} modules.', {
                        followUp: summary.employeesNeedingFollowUp,
                        load: summary.averageModulesPerEmployee
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t('completed')}: {metrics.completed}</Badge>
                    <Badge variant="outline">{t('inProgress')}: {metrics.in_progress}</Badge>
                    <Badge variant="outline">{t('overdue')}: {metrics.overdue}</Badge>
                  </div>
                </div>
              </div>

              <Accordion type="multiple" className="flex flex-col gap-4">
                {groups.map((group) => {
                  const activeRecords = group.records.filter((record) => record.status !== 'completed' && record.status !== 'excused')
                  const completedRecords = group.records.filter((record) => record.status === 'completed')
                  const completedPreview = completedRecords.slice(0, 3)
                  const hiddenCompletedCount = Math.max(0, completedRecords.length - completedPreview.length)

                  return (
                    <AccordionItem key={group.userId} value={group.userId} className="overflow-hidden rounded-2xl border bg-white px-4 shadow-sm">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="grid w-full gap-4 text-left lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                          <div className="flex items-start gap-3">
                            <Avatar className="size-12 border border-white shadow-sm">
                              <AvatarImage src={group.avatarUrl || ''} />
                              <AvatarFallback className="bg-hotel-navy/10 font-semibold text-hotel-navy">{group.userInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-base font-semibold text-slate-900">{group.userName}</span>
                                {group.overdueModules > 0 && (
                                  <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                    {group.overdueModules} {t('overdue')}
                                  </Badge>
                                )}
                                {group.totalModules >= 4 && (
                                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                    {group.totalModules} {t('modules', 'Modules')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>{group.departmentName || t('noDept')}</span>
                                <span>{group.propertyName || '-'}</span>
                                <span>{t('lastAccess')}: {formatDate(group.lastTouchedAt || '')}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{group.completedModules} {t('completed')}</Badge>
                                <Badge variant="outline">{group.inProgressModules} {t('inProgress')}</Badge>
                                <Badge variant="outline">{group.assignedModules} {t('assigned')}</Badge>
                              </div>
                              {group.highlightModule && (
                                <p className="truncate text-sm text-muted-foreground">
                                  {t('focusModule', 'Focus module')}: {group.highlightModule.resolvedModuleTitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border bg-slate-50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('portfolioProgress', 'Portfolio progress')}</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900">{group.averageProgress}%</p>
                              <Progress value={group.averageProgress} className="mt-3 h-2.5 [&>div]:bg-hotel-gold" />
                            </div>
                            <div className="rounded-2xl border bg-slate-50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t('analytics.avgScore', 'Avg Score')}</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900">{group.averageScore !== null ? `${group.averageScore}%` : '-'}</p>
                              <p className="mt-3 text-sm text-muted-foreground">{describeFollowUp(group)}</p>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pt-2">
                        <Separator className="mb-4" />
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_320px]">
                          <div className="flex flex-col gap-4">
                            <div className="rounded-2xl border p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{t('activeModulesQueue', 'Active module queue')}</p>
                                  <p className="text-xs text-muted-foreground">{t('activeModulesQueueDesc', 'Only unfinished modules stay in the main queue so tracking stays clean.')}</p>
                                </div>
                                <Badge variant="outline">{activeRecords.length}</Badge>
                              </div>

                              {activeRecords.length === 0 ? (
                                <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                                  {t('allModulesCompleted', 'All assigned modules are completed.')}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {activeRecords.map((record) => {
                                    const statusMeta = getProgressStatusMeta(record.status)

                                    return (
                                      <div key={record.id} className="rounded-2xl border bg-slate-50/70 p-3">
                                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_140px_minmax(0,180px)_120px_auto] lg:items-center">
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{record.resolvedModuleTitle}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {record.last_block_index !== null && record.last_block_index !== undefined
                                                ? `${t('currentStep', 'Current step')}: ${t('blockTitle', { number: record.last_block_index + 1 })}`
                                                : `${t('lastAccess')}: ${formatDate(record.lastTouchedAt)}`}
                                            </p>
                                          </div>
                                          <Badge variant="outline" className={cn("justify-center", statusMeta.badgeClass)}>{statusMeta.label}</Badge>
                                          <div>
                                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                              <span>{t('progress')}</span>
                                              <span>{record.resolvedProgress}%</span>
                                            </div>
                                            <Progress value={record.resolvedProgress} className={cn('h-2.5', statusMeta.progressClass)} />
                                          </div>
                                          <div className="text-sm">
                                            <p className={cn(
                                              "font-semibold",
                                              record.resolvedScore === null ? "text-muted-foreground" : record.passed ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                              {record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : '-'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{formatDuration(record.time_spent_seconds)}</p>
                                          </div>
                                          <Button type="button" variant="ghost" size="sm" onClick={() => onViewDetails(record.id)}>
                                            <Eye data-icon={isRTL ? "inline-end" : "inline-start"} />
                                            {t('details', 'Details')}
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {completedPreview.length > 0 && (
                              <div className="rounded-2xl border p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{t('completedArchive', 'Completed archive')}</p>
                                    <p className="text-xs text-muted-foreground">{t('completedArchiveDesc', 'Recently completed modules are collapsed into a short archive to reduce noise.')}</p>
                                  </div>
                                  <Badge variant="outline">{group.completedModules}</Badge>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {completedPreview.map((record) => (
                                    <div key={record.id} className="flex flex-col gap-2 rounded-2xl border bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{record.resolvedModuleTitle}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {t('completedAt', 'Completed at')}: {record.completed_at ? formatDate(record.completed_at) : '-'}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                          {t('completed')}
                                        </Badge>
                                        <span className="text-xs font-medium text-slate-600">
                                          {record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : formatDuration(record.time_spent_seconds)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {hiddenCompletedCount > 0 && (
                                  <p className="mt-3 text-xs text-muted-foreground">
                                    {t('moreCompletedModules', '+{{count}} more completed modules', { count: hiddenCompletedCount })}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-4">
                            <div className="rounded-2xl border p-4">
                              <p className="text-sm font-semibold text-slate-900">{t('loadBreakdown', 'Load breakdown')}</p>
                              <div className="mt-3 grid gap-2">
                                <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                  <span>{t('overdue')}</span>
                                  <span className="font-semibold">{group.overdueModules}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700">
                                  <span>{t('inProgress')}</span>
                                  <span className="font-semibold">{group.inProgressModules}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                  <span>{t('assigned')}</span>
                                  <span className="font-semibold">{group.assignedModules}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                  <span>{t('completed')}</span>
                                  <span className="font-semibold">{group.completedModules}</span>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border p-4">
                              <p className="text-sm font-semibold text-slate-900">{t('focusModule', 'Focus module')}</p>
                              <p className="mt-2 text-sm text-slate-700">{group.highlightModule?.resolvedModuleTitle || '-'}</p>
                              <p className="mt-2 text-xs text-muted-foreground">{describeFollowUp(group)}</p>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">{t('trackingDigest', 'Tracking digest')}</CardTitle>
                  <CardDescription>{t('trackingDigestDescription', 'Surface follow-up risk, average load, and completion health without scanning every module row.')}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('requiredAction', 'Required Action')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.employeesNeedingFollowUp}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t('staff', 'Staff')}</p>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('portfolioProgress', 'Portfolio progress')}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.averageProgress}%</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t('completionRate', 'Completion rate')}: {summary.completionRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">{t('followUpQueue', 'Follow-up queue')}</CardTitle>
                  <CardDescription>{t('followUpQueueDescription', 'Prioritize employees carrying overdue or stacked assignments.')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {followUpQueue.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      {t('followUpQueueEmpty', 'No employees currently need immediate follow-up.')}
                    </div>
                  ) : (
                    followUpQueue.map((group) => (
                      <div key={group.userId} className="rounded-2xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{group.userName}</p>
                            <p className="text-xs text-muted-foreground">{group.locationLabel}</p>
                          </div>
                          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">{group.attentionCount}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{describeFollowUp(group)}</p>
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          {t('focusModule', 'Focus module')}: {group.highlightModule?.resolvedModuleTitle || '-'}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-1">
                  <CardTitle className="text-base">{t('moduleLoadLeaderboard', 'Heaviest module load')}</CardTitle>
                  <CardDescription>{t('moduleLoadLeaderboardDescription', 'See who is carrying the largest training portfolio right now.')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {moduleLoadLeaders.map((group) => (
                    <div key={group.userId} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{group.userName}</p>
                          <p className="text-xs text-muted-foreground">{group.locationLabel}</p>
                        </div>
                        <Badge variant="outline">{group.totalModules} {t('modules', 'Modules')}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t('inProgress')}: {group.activeModules}</span>
                        <span>{t('completed')}: {group.completedModules}</span>
                      </div>
                      <Progress value={group.averageProgress} className="mt-3 h-2.5 [&>div]:bg-hotel-gold" />
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
