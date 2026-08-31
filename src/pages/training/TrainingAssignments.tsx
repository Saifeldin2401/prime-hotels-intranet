
import { PageHeader } from '@/components/layout/PageHeader'
import { GroupedDepartmentSelector } from '@/components/shared/GroupedDepartmentSelector'
import { EmployeeProgressTracker } from '@/components/training/EmployeeProgressTracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import type { LearningProgress } from '@/hooks/useLearningProgress'
import { useLearningProgress } from '@/hooks/useLearningProgress'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Filter,
  Grid3X3,
  LayoutList,
  MapPin,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AssignmentCardsGrid } from './components/trainingAssignments/AssignmentCardsGrid'
import { AssignmentCreateDialog, type AssignmentFormState } from './components/trainingAssignments/AssignmentCreateDialog'
import { ManageAssigneesDialog } from './components/trainingAssignments/ManageAssigneesDialog'
import { ProgressDetailDialog } from './components/trainingAssignments/ProgressDetailDialog'
import type { TrainingAssignmentsPanelProps } from './components/trainingAssignments/types'
import { useProgressData } from './components/trainingAssignments/useProgressData'
import { useTrainingAssignmentsData } from './components/trainingAssignments/useTrainingAssignmentsData'
import { useTrainingAssignmentsMutations } from './components/trainingAssignments/useTrainingAssignmentsMutations'

export function TrainingAssignmentsPanel({
  embedded = false,
  initialTab = 'overview',
  defaultModuleId,
  autoOpen = false,
  hideCreateButton = false,
  hideHeaderActions = false
}: TrainingAssignmentsPanelProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('training')
  const { toast } = useToast()
  const isRTL = i18n.dir() === 'rtl'

  const [search, setSearch] = useState('')
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(autoOpen)
  const [prevAutoOpen, setPrevAutoOpen] = useState(autoOpen)
  if (autoOpen !== prevAutoOpen) {
    if (autoOpen) setShowAssignmentDialog(true)
    setPrevAutoOpen(autoOpen)
  }

  const [activeTab, setActiveTab] = useState<'overview' | 'assignments'>(initialTab)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  if (initialTab !== prevInitialTab) {
    if (initialTab) setActiveTab(initialTab)
    setPrevInitialTab(initialTab)
  }

  const { data: progressData, isLoading: isLoadingProgress } = useLearningProgress()

  const [overviewSearch, setOverviewSearch] = useState('')
  const [overviewFilterStatus, setOverviewFilterStatus] = useState<string>('all')
  const [overviewFilterDept, setOverviewFilterDept] = useState<string>('all')
  const [overviewFilterProp, setOverviewFilterProp] = useState<string>('all')
  const [selectedProgressId, setSelectedProgressId] = useState<string | null>(null)

  const [formState, setFormState] = useState<AssignmentFormState>(() => ({
    formModuleId: defaultModuleId || '',
    formTargetType: 'all',
    formTargetIds: [],
    formDeadline: '',
    formValidFrom: format(new Date(), 'yyyy-MM-dd'),
    formExpiresAt: '',
    formPriority: 'normal',
    formInstructions: '',
    requiresAcknowledgement: false,
    sendNotifications: true,
    notifyOnDue: true,
    reminderDaysBefore: [],
    propertyFilters: [],
    targetSearch: '',
  }))

  const [prevDefaultModuleId, setPrevDefaultModuleId] = useState(defaultModuleId)
  if (defaultModuleId !== prevDefaultModuleId) {
    if (defaultModuleId) setFormState(prev => ({ ...prev, formModuleId: defaultModuleId }))
    setPrevDefaultModuleId(defaultModuleId)
  }

  const [manageModuleId, setManageModuleId] = useState<string | null>(null)
  const [manageModuleTitle, setManageModuleTitle] = useState('')

  const [assignmentsViewMode, setAssignmentsViewMode] = useState<'grid' | 'list'>('grid')
  const [assignmentsSortBy, setAssignmentsSortBy] = useState<'date' | 'priority' | 'module' | 'dueDate'>('date')
  const [assignmentsFilterPriority, setAssignmentsFilterPriority] = useState<string>('all')
  const [assignmentsFilterTargetType, setAssignmentsFilterTargetType] = useState<string>('all')
  const [assignmentsFilterDueStatus, setAssignmentsFilterDueStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const {
    assignments,
    departments,
    isLoadingAssignments,
    isLoadingModuleRoster,
    moduleExemptions,
    moduleRoster,
    modules,
    properties,
    refetchAssignableModules,
    userDepartments,
    userProperties,
    users,
  } = useTrainingAssignmentsData(manageModuleId)

  useEffect(() => {
    if (!showAssignmentDialog) return
    void refetchAssignableModules()
  }, [showAssignmentDialog, refetchAssignableModules])

  const resetForm = useCallback(() => {
    setFormState({
      formModuleId: '',
      formTargetType: 'all',
      formTargetIds: [],
      formDeadline: '',
      formValidFrom: format(new Date(), 'yyyy-MM-dd'),
      formExpiresAt: '',
      formPriority: 'normal',
      formInstructions: '',
      requiresAcknowledgement: false,
      sendNotifications: true,
      notifyOnDue: true,
      reminderDaysBefore: [],
      propertyFilters: [],
      targetSearch: '',
    })
  }, [])

  const mutations = useTrainingAssignmentsMutations({
    onCreateSuccess: () => {
      setShowAssignmentDialog(false)
      resetForm()
    },
    onReassignSuccess: () => {},
  })

  const openManageAssignees = useCallback((moduleId: string, moduleTitle?: string) => {
    setManageModuleId(moduleId)
    setManageModuleTitle(moduleTitle || t('unknownModule'))
  }, [t])

  const closeManageAssignees = useCallback(() => {
    setManageModuleId(null)
    setManageModuleTitle('')
  }, [])

  const handleDelete = useCallback((id: string) => {
    if (confirm(t('confirmAssignmentDelete'))) {
      mutations.deleteAssignmentMutation.mutate(id)
    }
  }, [mutations.deleteAssignmentMutation, t])

  const resetOrganizationState = useCallback(() => {
    setAssignmentsSortBy('date')
    setAssignmentsFilterPriority('all')
    setAssignmentsFilterTargetType('all')
    setAssignmentsFilterDueStatus('all')
    setSearch('')
  }, [])

  const getAssignmentStatus = useCallback((assignment: (typeof assignments)[0]) => {
    if (!assignment.due_date) return 'active'
    const now = new Date()
    const deadline = new Date(assignment.due_date)
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 7) return 'due_soon'
    return 'active'
  }, [])

  const getTargetIcon = useCallback((type: string) => {
    switch (type) {
      case 'all': case 'everyone': case 'user': return <Users className="w-4 h-4" />
      case 'department': return <Building className="w-4 h-4" />
      case 'property': return <MapPin className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }, [])

  const getTargetLabel = useCallback((type: string) => {
    switch (type) {
      case 'all': case 'everyone': return t('allUsers')
      case 'user': return t('specificUser')
      case 'department': return t('department')
      case 'property': return t('property')
      default: return t('allUsers')
    }
  }, [t])

  const departmentLookup = useMemo(() => new Map((departments || []).map((dept) => [dept.id, dept])), [departments])
  const propertyLookup = useMemo(() => new Map((properties || []).map((p) => [p.id, p])), [properties])
  const userLookup = useMemo(() => new Map((users || []).map((u) => [u.id, u])), [users])

  const exemptedModuleUserKeys = useMemo(() => (
    new Set(moduleExemptions.map((row) => `${row.content_id}:${row.user_id}`))
  ), [moduleExemptions])

  const exemptionCountByModule = useMemo(() => {
    const counts = new Map<string, number>()
    moduleExemptions.forEach((row) => {
      counts.set(row.content_id, (counts.get(row.content_id) || 0) + 1)
    })
    return counts
  }, [moduleExemptions])

  const getTargetDetails = useCallback((assignment: (typeof assignments)[0]) => {
    switch (assignment.target_type) {
      case 'department': {
        const dept = departmentLookup.get(assignment.target_id ?? '')
        return { label: dept?.rawName || dept?.name || t('department', 'Department'), meta: dept?.propertyName || t('unknownProperty', 'Unknown property') }
      }
      case 'property': {
        const property = propertyLookup.get(assignment.target_id ?? '')
        return { label: property?.name || t('property', 'Property'), meta: undefined }
      }
      case 'user': {
        const user = userLookup.get(assignment.target_id ?? '')
        if (!user) {
          return { label: assignment.target_id ? `${t('unknownUser', 'Unknown')} (${assignment.target_id.slice(0, 8)}...)` : t('unknownUser', 'Unknown User'), meta: undefined }
        }
        const name = user.full_name || user.email || t('unknownUser', 'Unknown User')
        return { label: name, meta: user.email && user.email !== name ? user.email : undefined }
      }
      default:
        return { label: t('allUsers'), meta: undefined }
    }
  }, [departmentLookup, propertyLookup, userLookup, t])

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')
  }, [i18n.language])

  const formatDuration = useCallback((seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '-'
    const totalMinutes = Math.floor(seconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h`
    if (totalMinutes > 0) return `${totalMinutes}m`
    return '< 1m'
  }, [])

  const escapeCsvValue = useCallback((value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined || value === '') return '""'
    return `"${String(value).replace(/"/g, '""')}"`
  }, [])

  const getProgressStatusMeta = useCallback((status: LearningProgress['status']) => {
    switch (status) {
      case 'completed': return { badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: t('completed'), progressClass: '[&>div]:bg-emerald-600' }
      case 'in_progress': return { badgeClass: 'border-sky-200 bg-sky-50 text-sky-700', label: t('inProgress'), progressClass: '[&>div]:bg-sky-600' }
      case 'overdue': return { badgeClass: 'border-rose-200 bg-rose-50 text-rose-700', label: t('overdue'), progressClass: '[&>div]:bg-rose-600' }
      case 'excused': return { badgeClass: 'border-slate-200 bg-slate-100 text-slate-600', label: t('excused', 'Excused'), progressClass: '[&>div]:bg-slate-500' }
      case 'assigned': default: return { badgeClass: 'border-amber-200 bg-amber-50 text-amber-700', label: t('assigned'), progressClass: '[&>div]:bg-amber-500' }
    }
  }, [t])

  const {
    describeFollowUp,
    employeeProgressGroups,
    employeeTrackingSummary,
    enrichedProgress,
    followUpQueue,
    moduleLoadLeaders,
    progressMetrics,
  } = useProgressData({
    progressData,
    overviewSearch,
    overviewFilterStatus,
    overviewFilterDept,
    overviewFilterProp,
    userDepartments,
    userProperties,
    users,
    modules,
    getProgressStatusMeta,
  })

  const filteredAssignments = useMemo(() => {
    return assignments?.filter(assignment => {
      if (assignment.target_type === 'user' && assignment.target_id && exemptedModuleUserKeys.has(`${assignment.content_id}:${assignment.target_id}`)) return false
      const moduleTitle = assignment.training_modules?.title || ''
      const searchValue = search.trim().toLowerCase()
      const targetDetails = getTargetDetails(assignment)
      const matchesSearch = !searchValue
        || moduleTitle.toLowerCase().includes(searchValue)
        || targetDetails.label.toLowerCase().includes(searchValue)
        || (targetDetails.meta?.toLowerCase().includes(searchValue) ?? false)
      const matchesPriority = assignmentsFilterPriority === 'all' || assignment.priority === assignmentsFilterPriority
      const matchesTargetType = assignmentsFilterTargetType === 'all' || assignment.target_type === assignmentsFilterTargetType
      let matchesDueStatus = true
      if (assignmentsFilterDueStatus !== 'all') {
        matchesDueStatus = getAssignmentStatus(assignment) === assignmentsFilterDueStatus
      }
      return matchesSearch && matchesPriority && matchesTargetType && matchesDueStatus
    }) || []
  }, [assignments, exemptedModuleUserKeys, search, assignmentsFilterPriority, assignmentsFilterTargetType, assignmentsFilterDueStatus, getTargetDetails, getAssignmentStatus])

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, { key: string; assignments: typeof assignments; latestCreatedAt: string; moduleTitle: string; priority: string; dueDate: string | null }>()
    filteredAssignments.forEach((assignment) => {
      const key = [assignment.content_id, assignment.target_type, assignment.priority, assignment.due_date ?? '', assignment.valid_from ?? '', assignment.expires_at ?? '', assignment.requires_acknowledgement ? '1' : '0'].join('|')
      if (!groups.has(key)) {
        groups.set(key, { key, assignments: [], latestCreatedAt: assignment.created_at, moduleTitle: assignment.training_modules?.title || '', priority: assignment.priority || 'normal', dueDate: assignment.due_date })
      }
      const group = groups.get(key)!
      group.assignments.push(assignment)
      if (new Date(assignment.created_at) > new Date(group.latestCreatedAt)) group.latestCreatedAt = assignment.created_at
    })
    const sortedGroups = Array.from(groups.values())
    sortedGroups.sort((a, b) => {
      switch (assignmentsSortBy) {
        case 'date': return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
        case 'priority': {
          const p = { compliance: 0, high: 1, normal: 2 }
          return (p[a.priority as keyof typeof p] || 2) - (p[b.priority as keyof typeof p] || 2)
        }
        case 'module': return a.moduleTitle.localeCompare(b.moduleTitle)
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        default: return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
      }
    })
    return sortedGroups
  }, [filteredAssignments, assignmentsSortBy])

  const assignmentStats = useMemo(() => ({
    total: filteredAssignments.length,
    byPriority: {
      compliance: filteredAssignments.filter(a => a.priority === 'compliance').length,
      high: filteredAssignments.filter(a => a.priority === 'high').length,
      normal: filteredAssignments.filter(a => !a.priority || a.priority === 'normal').length
    },
    byTargetType: {
      everyone: filteredAssignments.filter(a => a.target_type === 'everyone').length,
      user: filteredAssignments.filter(a => a.target_type === 'user').length,
      department: filteredAssignments.filter(a => a.target_type === 'department').length,
      property: filteredAssignments.filter(a => a.target_type === 'property').length
    },
    overdue: filteredAssignments.filter(a => getAssignmentStatus(a) === 'overdue').length,
    dueSoon: filteredAssignments.filter(a => getAssignmentStatus(a) === 'due_soon').length,
  }), [filteredAssignments, getAssignmentStatus])

  const handleExport = useCallback(() => {
    if (!enrichedProgress.length) return
    const employeeLookup = new Map(employeeProgressGroups.map((group) => [group.userId, group]))
    const headers = [
      t('employee'), t('email', 'Email'), t('department'), t('property'), t('module'),
      t('status'), t('progress'), t('score'), t('passed', 'Passed'), t('timeSpent', 'Time spent'),
      t('lastAccess'), t('completedAt', 'Completed at'), t('currentStep', 'Current step'),
      t('totalEnrollments'), t('completed', 'Completed') + ` ${t('modules', 'Modules')}`,
      t('inProgress') + ` ${t('modules', 'Modules')}`, t('overdue') + ` ${t('modules', 'Modules')}`,
      t('assigned') + ` ${t('modules', 'Modules')}`, t('employeeCompletionRate', 'Employee completion rate'),
      t('analytics.avgScore', 'Avg Score'), t('followUpFlag', 'Follow-up flag'), t('followUpReason', 'Follow-up reason')
    ]
    const csvRows = employeeProgressGroups.flatMap((group) => group.records.map((record) => {
      const user = users?.find((entry) => entry.id === record.user_id)
      const currentStep = record.last_block_index !== null && record.last_block_index !== undefined ? t('blockTitle', { number: record.last_block_index + 1 }) : '-'
      const completionRate = group.totalModules > 0 ? `${Math.round((group.completedModules / group.totalModules) * 100)}%` : '0%'
      const followUpFlag = group.attentionCount > 0 || group.overdueModules > 0 ? t('requiredAction', 'Required Action') : t('onTime')
      return [
        escapeCsvValue(group.userName), escapeCsvValue(record.profiles?.email || user?.email || '-'),
        escapeCsvValue(group.departmentName || '-'), escapeCsvValue(group.propertyName || '-'),
        escapeCsvValue(record.resolvedModuleTitle), escapeCsvValue(record.statusLabel),
        escapeCsvValue(`${record.resolvedProgress}%`),
        escapeCsvValue(record.resolvedScore !== null ? `${Math.round(record.resolvedScore)}%` : '-'),
        escapeCsvValue(record.passed === undefined || record.passed === null ? '-' : record.passed ? t('yes', 'Yes') : t('no', 'No')),
        escapeCsvValue(formatDuration(record.time_spent_seconds)), escapeCsvValue(formatDate(record.lastTouchedAt)),
        escapeCsvValue(record.completed_at ? formatDate(record.completed_at) : '-'), escapeCsvValue(currentStep),
        escapeCsvValue(group.totalModules), escapeCsvValue(group.completedModules), escapeCsvValue(group.inProgressModules),
        escapeCsvValue(group.overdueModules), escapeCsvValue(group.assignedModules), escapeCsvValue(completionRate),
        escapeCsvValue(group.averageScore !== null ? `${group.averageScore}%` : '-'), escapeCsvValue(followUpFlag),
        escapeCsvValue(describeFollowUp(employeeLookup.get(record.user_id) || group))
      ].join(',')
    }))
    const csvContent = [headers.map(escapeCsvValue).join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `training_progress_tracker_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [describeFollowUp, employeeProgressGroups, enrichedProgress.length, escapeCsvValue, formatDate, formatDuration, t, users])

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {!embedded && (
        <PageHeader
          title={t('trainingCenter')}
          description={t('trainingDescription')}
          actions={hideHeaderActions ? undefined : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/admin/notifications')} className="hidden md:flex">
                <Bell className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('batchStatus')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/training/assignments/rules')} className="hidden md:flex">
                <Settings className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
                {t('autoAssignRules')}
              </Button>
            </div>
          )}
        />
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'assignments')} className="space-y-6">
        <TabsList className="w-full sm:w-auto bg-white p-1 border rounded-lg">
          <TabsTrigger value="overview" className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <BarChart3 className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1 sm:flex-none data-[state=active]:bg-hotel-navy data-[state=active]:text-white">
            <Edit className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
            {t('manageAssignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                  {properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                <Button variant="ghost" onClick={() => { setOverviewSearch(''); setOverviewFilterDept('all'); setOverviewFilterProp('all'); setOverviewFilterStatus('all') }} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
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
            {[
              { border: 'border-s-hotel-gold', bg: 'bg-amber-50', Icon: BookOpen, iconClass: 'text-hotel-gold', value: progressMetrics.uniqueModules, label: t('modules', 'Modules') },
              { border: 'border-s-indigo-500', bg: 'bg-indigo-50', Icon: Users, iconClass: 'text-indigo-600', value: employeeTrackingSummary.employeeCount, label: t('staff', 'Staff') },
              { border: 'border-s-blue-500', bg: 'bg-blue-50', Icon: TrendingUp, iconClass: 'text-blue-600', value: progressMetrics.total, label: t('totalEnrollments', 'Total Enrollments') },
              { border: 'border-s-sky-500', bg: 'bg-sky-50', Icon: Clock, iconClass: 'text-sky-600', value: progressMetrics.in_progress, label: `${t('inProgress')} · ${employeeTrackingSummary.averageProgress}%` },
              { border: 'border-s-rose-500', bg: 'bg-rose-50', Icon: AlertTriangle, iconClass: 'text-rose-600', value: progressMetrics.overdue, label: `${t('overdue')} · ${employeeTrackingSummary.employeesNeedingFollowUp} ${t('followUpFlag', 'follow-up')}` },
              { border: 'border-s-emerald-500', bg: 'bg-emerald-50', Icon: CheckCircle2, iconClass: 'text-emerald-600', value: progressMetrics.completed, label: `${t('completed')} · ${employeeTrackingSummary.completionRate}%` },
            ].map(({ border, bg, Icon, iconClass, value, label }) => (
              <Card key={label} className={`border-s-4 ${border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`size-4 ${iconClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold text-slate-900">{value}</p>
                      <p className="truncate text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            onResetProgress={(userId, moduleId) => mutations.resetProgressMutation.mutate({ userId, moduleId })}
            onRevokeCertificate={(_userId, _moduleId) => {
              toast({ title: t('certificateRevoked', 'Certificate Revoked'), description: t('certificateRevokedDesc', 'The certificate has been revoked successfully.') })
            }}
            onExemptUser={(userId, moduleId) => mutations.exemptUserMutation.mutate({ moduleId, userId })}
            onRestoreUser={(userId, moduleId) => mutations.restoreUserMutation.mutate({ moduleId, userId })}
          />

          <ProgressDetailDialog
            selectedProgressId={selectedProgressId}
            onClose={() => setSelectedProgressId(null)}
            progressData={progressData}
            users={users}
            modules={modules}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="border-slate-200"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{t('totalAssignments', 'Total')}</span><span className="text-lg font-bold text-slate-900">{assignmentStats.total}</span></div></CardContent></Card>
            <Card className="border-rose-200 bg-rose-50/30"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-rose-600">{t('compliancePriority', 'Compliance')}</span><span className="text-lg font-bold text-rose-700">{assignmentStats.byPriority.compliance}</span></div></CardContent></Card>
            <Card className="border-amber-200 bg-amber-50/30"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-amber-600">{t('highPriority', 'High')}</span><span className="text-lg font-bold text-amber-700">{assignmentStats.byPriority.high}</span></div></CardContent></Card>
            <Card className="border-rose-200 bg-rose-50/30"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-rose-600">{t('overdue', 'Overdue')}</span><span className="text-lg font-bold text-rose-700">{assignmentStats.overdue}</span></div></CardContent></Card>
            <Card className="border-blue-200 bg-blue-50/30"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-blue-600">{t('dueSoon', 'Due Soon')}</span><span className="text-lg font-bold text-blue-700">{assignmentStats.dueSoon}</span></div></CardContent></Card>
            <Card className="border-slate-200"><CardContent className="p-3"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{t('everyone', 'Everyone')}</span><span className="text-lg font-bold text-slate-900">{assignmentStats.byTargetType.everyone}</span></div></CardContent></Card>
          </div>

          <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-3", hideCreateButton ? "justify-start" : "justify-between")}>
              <div className="relative flex-1 max-w-none sm:max-w-md">
                <div className={cn("absolute inset-y-0 flex items-center pointer-events-none", isRTL ? "right-0 pr-4" : "left-0 pl-4")}>
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  placeholder={t('searchAssignments')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn("h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-hotel-gold/50 focus:ring-2 focus:ring-hotel-gold/20 transition-all", isRTL ? "pr-11 text-right" : "pl-11")}
                />
                {search && (
                  <button onClick={() => setSearch('')} className={cn("absolute inset-y-0 flex items-center text-slate-400 hover:text-slate-600 transition-colors", isRTL ? "left-0 pl-3" : "right-0 pr-3")}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  {(['grid', 'list'] as const).map((mode) => (
                    <button key={mode} onClick={() => setAssignmentsViewMode(mode)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all", assignmentsViewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                      {mode === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
                      {t(mode, mode.charAt(0).toUpperCase() + mode.slice(1))}
                    </button>
                  ))}
                </div>

                <Select value={assignmentsSortBy} onValueChange={(v) => setAssignmentsSortBy(v as any)}>
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

                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("h-10 px-3 transition-all", showFilters && "bg-slate-100 border-slate-300")}>
                  <Filter className="w-4 h-4 mr-2" />
                  {t('filters', 'Filters')}
                  {(assignmentsFilterPriority !== 'all' || assignmentsFilterTargetType !== 'all' || assignmentsFilterDueStatus !== 'all') && (
                    <span className="ml-1.5 w-2 h-2 rounded-full bg-hotel-gold" />
                  )}
                </Button>

                {!hideCreateButton && (
                  <Button onClick={() => setShowAssignmentDialog(true)} className="bg-hotel-navy hover:bg-hotel-navy/90 text-white h-10 px-4 shadow-sm hover:shadow transition-all">
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
                    <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm"><SelectValue placeholder={t('priority', 'Priority')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allPriorities', 'All Priorities')}</SelectItem>
                      <SelectItem value="compliance"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500" />{t('compliance', 'Compliance')}</span></SelectItem>
                      <SelectItem value="high"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />{t('high', 'High')}</span></SelectItem>
                      <SelectItem value="normal"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" />{t('normal', 'Normal')}</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assignmentsFilterTargetType} onValueChange={setAssignmentsFilterTargetType}>
                    <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm"><SelectValue placeholder={t('targetType', 'Target')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allTargets', 'All Targets')}</SelectItem>
                      <SelectItem value="everyone">{t('everyone', 'Everyone')}</SelectItem>
                      <SelectItem value="user">{t('specificUser', 'Specific User')}</SelectItem>
                      <SelectItem value="department">{t('department', 'Department')}</SelectItem>
                      <SelectItem value="property">{t('property', 'Property')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assignmentsFilterDueStatus} onValueChange={setAssignmentsFilterDueStatus}>
                    <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 text-sm"><SelectValue placeholder={t('dueStatus', 'Due Status')} /></SelectTrigger>
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
                  <Button variant="ghost" size="sm" onClick={resetOrganizationState} className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 ml-auto">
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    {t('clearAll', 'Clear All')}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{t('showing', 'Showing')} <strong className="text-slate-900">{groupedAssignments.length}</strong> {t('assignmentGroups', 'assignment groups')}</span>
            {(assignmentsFilterPriority !== 'all' || assignmentsFilterTargetType !== 'all' || assignmentsFilterDueStatus !== 'all') && (
              <div className="flex items-center gap-2">
                <span>{t('activeFilters', 'Active filters')}:</span>
                {assignmentsFilterPriority !== 'all' && <Badge variant="outline" className="text-xs bg-slate-50">{t('priority')}: {t(assignmentsFilterPriority)}<button onClick={() => setAssignmentsFilterPriority('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>}
                {assignmentsFilterTargetType !== 'all' && <Badge variant="outline" className="text-xs bg-slate-50">{t('target')}: {t(assignmentsFilterTargetType)}<button onClick={() => setAssignmentsFilterTargetType('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>}
                {assignmentsFilterDueStatus !== 'all' && <Badge variant="outline" className="text-xs bg-slate-50">{t('status')}: {t(assignmentsFilterDueStatus)}<button onClick={() => setAssignmentsFilterDueStatus('all')} className="ml-1 hover:text-rose-600"><X className="w-3 h-3" /></button></Badge>}
              </div>
            )}
          </div>

          <div className={cn(assignmentsViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-3")}>
            <AssignmentCardsGrid
              groupedAssignments={groupedAssignments}
              isLoadingAssignments={isLoadingAssignments}
              viewMode={assignmentsViewMode}
              isRTL={isRTL}
              hideCreateButton={hideCreateButton}
              exemptionCountByModule={exemptionCountByModule}
              getTargetDetails={getTargetDetails}
              getTargetIcon={getTargetIcon}
              getTargetLabel={getTargetLabel}
              formatDate={formatDate}
              onDelete={handleDelete}
              onManageAssignees={openManageAssignees}
              onCreateNew={() => setShowAssignmentDialog(true)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ManageAssigneesDialog
        manageModuleId={manageModuleId}
        manageModuleTitle={manageModuleTitle}
        moduleRoster={moduleRoster}
        isLoadingModuleRoster={isLoadingModuleRoster}
        users={users}
        formatDate={formatDate}
        onClose={closeManageAssignees}
        exemptUserMutation={mutations.exemptUserMutation}
        restoreUserMutation={mutations.restoreUserMutation}
        resetProgressMutation={mutations.resetProgressMutation}
        resendNotificationMutation={mutations.resendNotificationMutation}
        saveOverrideMutation={mutations.saveOverrideMutation}
        clearOverrideMutation={mutations.clearOverrideMutation}
        reassignUserMutation={mutations.reassignUserMutation}
      />

      <AssignmentCreateDialog
        open={showAssignmentDialog}
        onOpenChange={(open) => {
          setShowAssignmentDialog(open)
          if (!open) resetForm()
        }}
        formState={formState}
        onFormChange={(patch) => setFormState(prev => ({ ...prev, ...patch }))}
        modules={modules}
        departments={departments}
        properties={properties}
        users={users}
        isRTL={isRTL}
        createAssignmentMutation={mutations.createAssignmentMutation}
      />
    </div>
  )
}

export default function TrainingAssignments() {
  return <TrainingAssignmentsPanel />
}
