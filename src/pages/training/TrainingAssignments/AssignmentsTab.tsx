import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
    BookOpen,
    CheckCircle2,
    Filter,
    Grid3X3,
    LayoutList,
    Loader2,
    MapPin,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
    X,
    Building
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrainingAssignmentsContext } from '../contexts/TrainingAssignmentsContext'

export function AssignmentsTab() {
  const {
    isRTL,
    isLoadingAssignments,
    hideCreateButton,
    search,
    setSearch,
    assignmentsViewMode,
    setAssignmentsViewMode,
    assignmentsSortBy,
    setAssignmentsSortBy,
    showFilters,
    setShowFilters,
    assignmentsFilterPriority,
    setAssignmentsFilterPriority,
    assignmentsFilterTargetType,
    setAssignmentsFilterTargetType,
    assignmentsFilterDueStatus,
    setAssignmentsFilterDueStatus,
    resetOrganizationState,
    assignmentStats,
    groupedAssignments,
    exemptionCountByModule,
    getTargetDetails,
    formatDate,
    handleDelete,
    openManageAssignees,
    setShowAssignmentDialog,
  } = useTrainingAssignmentsContext()

  const { t } = useTranslation('training')

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return <Users className="w-4 h-4" />
      case 'user': return <Users className="w-4 h-4" />
      case 'department': return <Building className="w-4 h-4" />
      case 'property': return <MapPin className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getTargetLabel = (type: string) => {
    switch (type) {
      case 'all':
      case 'everyone': return t('allUsers')
      case 'user': return t('specificUser')
      case 'department': return t('department')
      case 'property': return t('property')
      default: return t('allUsers')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{t('totalAssignments', 'Total')}</span>
              <span className="text-lg font-bold text-slate-900">{assignmentStats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-600">{t('compliancePriority', 'Compliance')}</span>
              <span className="text-lg font-bold text-rose-700">{assignmentStats.byPriority.compliance}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-600">{t('highPriority', 'High')}</span>
              <span className="text-lg font-bold text-amber-700">{assignmentStats.byPriority.high}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-600">{t('overdue', 'Overdue')}</span>
              <span className="text-lg font-bold text-rose-700">{assignmentStats.overdue}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">{t('dueSoon', 'Due Soon')}</span>
              <span className="text-lg font-bold text-blue-700">{assignmentStats.dueSoon}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{t('everyone', 'Everyone')}</span>
              <span className="text-lg font-bold text-slate-900">{assignmentStats.byTargetType.everyone}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className={cn(
          "flex flex-col sm:flex-row items-stretch sm:items-center gap-3",
          hideCreateButton ? "justify-start" : "justify-between"
        )}>
          <div className="relative flex-1 max-w-none sm:max-w-md">
            <div className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none",
              isRTL ? "right-0 pr-4" : "left-0 pl-4"
            )}>
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <Input
              placeholder={t('searchAssignments')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-hotel-gold/50 focus:ring-2 focus:ring-hotel-gold/20 transition-all",
                isRTL ? "pr-11 text-right" : "pl-11"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={cn(
                  "absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors",
                  isRTL ? "left-0 pl-3" : "right-0 pr-3"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setAssignmentsViewMode('grid')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  assignmentsViewMode === 'grid'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
                {t('grid', 'Grid')}
              </button>
              <button
                onClick={() => setAssignmentsViewMode('list')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  assignmentsViewMode === 'list'
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutList className="w-4 h-4" />
                {t('list', 'List')}
              </button>
            </div>

            <Select value={assignmentsSortBy} onValueChange={(v) => setAssignmentsSortBy(v as 'date' | 'priority' | 'module' | 'dueDate')}>
              <SelectTrigger className="w-[140px] h-10 bg-slate-50 border-slate-200">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('sortBy', 'Sort by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('dateCreated', 'Date Created')}</SelectItem>
                <SelectItem value="priority">{t('priority', 'Priority')}</SelectItem>
                <SelectItem value="module">{t('moduleName', 'Module Name')}</SelectItem>
                <SelectItem value="dueDate">{t('dueDate', 'Due Date')}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-10 px-3 transition-all",
                showFilters && "bg-slate-100 border-slate-300"
              )}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('filters', 'Filters')}
              {(assignmentsFilterPriority !== 'all' || assignmentsFilterTargetType !== 'all' || assignmentsFilterDueStatus !== 'all') && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-hotel-gold" />
              )}
            </Button>

            {!hideCreateButton && (
              <Button
                onClick={() => setShowAssignmentDialog(true)}
                className="bg-hotel-navy hover:bg-hotel-navy/90 text-white h-10 px-4 shadow-sm hover:shadow transition-all"
              >
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('create')}
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500 font-medium">{t('filterBy', 'Filter by')}:</span>

              <Select value={assignmentsFilterPriority} onValueChange={setAssignmentsFilterPriority}>
                <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm">
                  <SelectValue placeholder={t('priority', 'Priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allPriorities', 'All Priorities')}</SelectItem>
                  <SelectItem value="compliance">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      {t('compliance', 'Compliance')}
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {t('high', 'High')}
                    </span>
                  </SelectItem>
                  <SelectItem value="normal">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      {t('normal', 'Normal')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignmentsFilterTargetType} onValueChange={setAssignmentsFilterTargetType}>
                <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm">
                  <SelectValue placeholder={t('targetType', 'Target')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTargets', 'All Targets')}</SelectItem>
                  <SelectItem value="everyone">{t('everyone', 'Everyone')}</SelectItem>
                  <SelectItem value="user">{t('specificUser', 'Specific User')}</SelectItem>
                  <SelectItem value="department">{t('department', 'Department')}</SelectItem>
                  <SelectItem value="property">{t('property', 'Property')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignmentsFilterDueStatus} onValueChange={setAssignmentsFilterDueStatus}>
                <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm">
                  <SelectValue placeholder={t('dueStatus', 'Due Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('active', 'Active')}</SelectItem>
                  <SelectItem value="due_soon">{t('dueSoon', 'Due Soon')}</SelectItem>
                  <SelectItem value="overdue">{t('overdue', 'Overdue')}</SelectItem>
                  <SelectItem value="completed">{t('completed', 'Completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(assignmentsFilterPriority !== 'all' || assignmentsFilterTargetType !== 'all' || assignmentsFilterDueStatus !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetOrganizationState}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 ml-auto"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                {t('clearAll', 'Clear All')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {t('showing', 'Showing')} <strong className="text-slate-900">{groupedAssignments.length}</strong> {t('assignmentGroups', 'assignment groups')}
        </span>
        {(assignmentsFilterPriority !== 'all' || assignmentsFilterTargetType !== 'all' || assignmentsFilterDueStatus !== 'all') && (
          <div className="flex items-center gap-2">
            <span>{t('activeFilters', 'Active filters')}:</span>
            {assignmentsFilterPriority !== 'all' && (
              <Badge variant="outline" className="text-xs bg-slate-50">
                {t('priority')}: {t(assignmentsFilterPriority)}
                <button onClick={() => setAssignmentsFilterPriority('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {assignmentsFilterTargetType !== 'all' && (
              <Badge variant="outline" className="text-xs bg-slate-50">
                {t('target')}: {t(assignmentsFilterTargetType)}
                <button onClick={() => setAssignmentsFilterTargetType('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {assignmentsFilterDueStatus !== 'all' && (
              <Badge variant="outline" className="text-xs bg-slate-50">
                {t('status')}: {t(assignmentsFilterDueStatus)}
                <button onClick={() => setAssignmentsFilterDueStatus('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className={cn(
        assignmentsViewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          : "flex flex-col gap-3"
      )}>
        {isLoadingAssignments ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-10 h-10 animate-spin text-hotel-gold" />
              <div className="absolute inset-0 w-10 h-10 animate-ping rounded-full bg-hotel-gold/20" />
            </div>
            <p className="mt-4 text-sm text-slate-500">{t('loadingAssignments', 'Loading assignments...')}</p>
          </div>
        ) : groupedAssignments.length > 0 ? (
          groupedAssignments.map((group) => {
            const primaryAssignment = group.assignments[0]
            const targetType = primaryAssignment.target_type
            const targetTypeLabel = getTargetLabel(targetType)
            const exemptedCount = exemptionCountByModule.get(primaryAssignment.content_id) || 0
            const targets = group.assignments.map((assignment) => ({
              assignmentId: assignment.id,
              ...getTargetDetails(assignment)
            }))

            return (
              <Card key={group.key} className="group overflow-hidden border-0 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                <div className={cn(
                  "h-1.5 w-full",
                  primaryAssignment.priority === 'compliance' && "bg-gradient-to-r from-rose-500 to-rose-600",
                  primaryAssignment.priority === 'high' && "bg-gradient-to-r from-amber-500 to-orange-500",
                  (!primaryAssignment.priority || primaryAssignment.priority === 'normal') && "bg-gradient-to-r from-blue-500 to-indigo-500"
                )} />

                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-blue-200 bg-blue-50/80 text-blue-700 font-medium text-[11px] px-2 py-0.5">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {t('module')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium text-[11px] px-2 py-0.5",
                          primaryAssignment.priority === 'compliance' && "border-rose-200 bg-rose-50 text-rose-700",
                          primaryAssignment.priority === 'high' && "border-amber-200 bg-amber-50 text-amber-700",
                          (!primaryAssignment.priority || primaryAssignment.priority === 'normal') && "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                      >
                        {t(primaryAssignment.priority || 'normal', primaryAssignment.priority || 'normal')}
                      </Badge>
                      {primaryAssignment.requires_acknowledgement && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-100/50 text-amber-800 font-medium text-[11px] px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t('ackRequired', 'Ack required')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {targets.length > 1 && (
                        <Badge variant="outline" className="bg-hotel-gold/10 text-hotel-navy border-hotel-gold/30 font-medium text-[11px]">
                          <Users className="w-3 h-3 mr-1" />
                          {targets.length} {t('targets', 'targets')}
                        </Badge>
                      )}
                      {exemptedCount > 0 && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-[11px]">
                          <X className="w-3 h-3 mr-1" />
                          {exemptedCount} {t('exempted', 'exempted')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg font-semibold mt-3 line-clamp-2 leading-snug text-slate-900" title={primaryAssignment.training_modules?.title}>
                    {primaryAssignment.training_modules?.title || t('unknownModule')}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      {targets.length === 1 ? (
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {targets[0].label}
                            </div>
                            {targets[0].meta && targets[0].meta !== targets[0].label && (
                              <div className="text-xs text-slate-500 truncate">
                                {targets[0].meta}
                              </div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 -mr-2"
                            onClick={() => handleDelete(targets[0].assignmentId)}
                            aria-label={t('accessibility.deleteAssignment', 'Delete assignment')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">{getTargetIcon(targetType)}</span>
                            <span className="text-slate-600">{targetTypeLabel}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-slate-50">
                              {targets.length}
                            </Badge>
                          </div>
                          <div className="pl-6 space-y-1">
                            {targets.slice(0, 3).map((target) => (
                              <div key={target.assignmentId} className="flex items-start justify-between gap-2">
                                <div className="text-sm text-slate-900 truncate min-w-0 flex-1">
                                  {target.label}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 shrink-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 -mr-1"
                                  onClick={() => handleDelete(target.assignmentId)}
                                  aria-label={t('accessibility.deleteAssignment', 'Delete assignment')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                            {targets.length > 3 && (
                              <div className="text-xs text-slate-500">
                                +{targets.length - 3} {t('more', 'more')}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>{formatDate(primaryAssignment.created_at)}</span>
                      {primaryAssignment.due_date && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full",
                            new Date(primaryAssignment.due_date) < new Date()
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          )}>
                            {t('due')}: {formatDate(primaryAssignment.due_date)}
                          </span>
                        </>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium h-9"
                      onClick={() => openManageAssignees(primaryAssignment.content_id, primaryAssignment.training_modules?.title)}
                    >
                      <Users className={cn("h-4 w-4 text-slate-500", isRTL ? "ml-2" : "mr-2")} />
                      {t('manageAssignees', 'Manage assignees')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
                <BookOpen className="w-12 h-12 text-slate-300" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm">
                <Plus className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 text-center">{t('noAssignments')}</h3>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-md">{t('startAssigning', 'Get started by creating your first training assignment. Assign modules to individuals, departments, or entire properties.')}</p>
            {!hideCreateButton && (
              <Button
                onClick={() => setShowAssignmentDialog(true)}
                className="mt-6 bg-hotel-navy hover:bg-hotel-navy/90 text-white px-6 shadow-sm hover:shadow transition-all"
              >
                <Plus className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('createAssignment')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
