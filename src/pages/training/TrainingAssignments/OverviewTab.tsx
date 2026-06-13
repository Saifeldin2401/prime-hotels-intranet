import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { EmployeeProgressTracker } from '@/components/training/EmployeeProgressTracker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    Clock,
    Download,
    Search,
    TrendingUp,
    Users,
    X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrainingAssignmentsContext } from '../contexts/TrainingAssignmentsContext'

export function OverviewTab() {
  const {
    isRTL,
    overviewSearch,
    setOverviewSearch,
    overviewFilterDept,
    setOverviewFilterDept,
    overviewFilterProp,
    setOverviewFilterProp,
    overviewFilterStatus,
    setOverviewFilterStatus,
    departments,
    properties,
    progressMetrics,
    employeeTrackingSummary,
    employeeProgressGroups,
    followUpQueue,
    moduleLoadLeaders,
    isLoadingProgress,
    setSelectedProgressId,
    handleExport,
    submitResetProgress,
    submitExemptUser,
    submitRestoreUser,
    formatDate,
    formatDuration,
    getProgressStatusMeta,
    describeFollowUp,
    toast,
    t: tCtx,
  } = useTrainingAssignmentsContext()

  const { t } = useTranslation('training')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="relative w-full md:w-64 min-w-0">
            <Search className={cn("absolute top-2.5 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              placeholder={t('searchEmployeeOrModule')}
              value={overviewSearch}
              onChange={(e) => setOverviewSearch(e.target.value)}
              className={cn(isRTL ? "pr-9" : "pl-9", "bg-slate-50/50 border-slate-200")}
            />
          </div>
          <GroupedDepartmentSelector
            departments={departments}
            properties={properties}
            value={overviewFilterDept}
            onValueChange={setOverviewFilterDept}
            placeholder={t('filterByDept')}
            generalLabel={t('allDepartments')}
            generalValue="all"
            className="w-full sm:w-[180px] bg-slate-50/50 border-slate-200"
          />
          <Select value={overviewFilterProp} onValueChange={setOverviewFilterProp}>
            <SelectTrigger className="w-full sm:w-[180px] bg-slate-50/50 border-slate-200">
              <SelectValue placeholder={t('filterByProp')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allProperties')}</SelectItem>
              {properties?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={overviewFilterStatus} onValueChange={setOverviewFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px] bg-slate-50/50 border-slate-200">
              <SelectValue placeholder={t('filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="completed">{t('completed')}</SelectItem>
              <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
              <SelectItem value="overdue">{t('overdue')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          {(overviewSearch || overviewFilterDept !== 'all' || overviewFilterProp !== 'all' || overviewFilterStatus !== 'all') && (
            <Button
              variant="ghost"
              onClick={() => {
                setOverviewSearch('')
                setOverviewFilterDept('all')
                setOverviewFilterProp('all')
                setOverviewFilterStatus('all')
              }}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              {t('clearFilters')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('export')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Card className="border-s-4 border-s-hotel-gold">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <BookOpen className="size-4 text-hotel-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{progressMetrics.uniqueModules}</p>
                <p className="truncate text-xs text-muted-foreground">{t('modules', 'Modules')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <Users className="size-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{employeeTrackingSummary.employeeCount}</p>
                <p className="truncate text-xs text-muted-foreground">{t('staff', 'Staff')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="size-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{progressMetrics.total}</p>
                <p className="truncate text-xs text-muted-foreground">{t('totalEnrollments', 'Total Enrollments')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50">
                <Clock className="size-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{progressMetrics.in_progress}</p>
                <p className="truncate text-xs text-muted-foreground">{t('inProgress')} · {employeeTrackingSummary.averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                <AlertTriangle className="size-4 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{progressMetrics.overdue}</p>
                <p className="truncate text-xs text-muted-foreground">{t('overdue')} · {employeeTrackingSummary.employeesNeedingFollowUp} {t('followUpFlag', 'follow-up')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-s-4 border-s-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-900">{progressMetrics.completed}</p>
                <p className="truncate text-xs text-muted-foreground">{t('completed')} · {employeeTrackingSummary.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeeProgressTracker
        describeFollowUp={describeFollowUp}
        followUpQueue={followUpQueue}
        formatDate={formatDate}
        formatDuration={formatDuration}
        getProgressStatusMeta={getProgressStatusMeta}
        groups={employeeProgressGroups}
        isLoading={isLoadingProgress}
        isRTL={isRTL}
        metrics={progressMetrics}
        moduleLoadLeaders={moduleLoadLeaders}
        onViewDetails={setSelectedProgressId}
        summary={employeeTrackingSummary}
        isAdmin={true}
        onResetProgress={(userId, moduleId) => submitResetProgress(moduleId, userId)}
        onRevokeCertificate={(userId, moduleId) => {
          toast({
            title: tCtx('certificateRevoked', 'Certificate Revoked'),
            description: tCtx('certificateRevokedDesc', 'The certificate has been revoked successfully.')
          })
        }}
        onExemptUser={(userId, moduleId) => submitExemptUser(moduleId, userId)}
        onRestoreUser={(userId, moduleId) => submitRestoreUser(moduleId, userId)}
      />
    </div>
  )
}
