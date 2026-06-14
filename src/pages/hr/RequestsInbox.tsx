import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { useRequestsInbox, type RequestStatus } from '@/hooks/useRequests'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, CalendarIcon, CheckCircle, ClipboardList, Clock, FileText, Filter, Flame, Inbox, Loader2, Search, ShieldAlert, TimerReset, User, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const statusConfig: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'status.draft', color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-4 h-4" /> },
  pending_supervisor_approval: { label: 'status.pending_supervisor', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
  pending_hr_review: { label: 'status.pending_hr', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" /> },
  approved: { label: 'status.approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'status.rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
  returned_for_correction: { label: 'status.returned', color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-4 h-4" /> },
  closed: { label: 'status.closed', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-4 h-4" /> },
}

const entityConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  leave_request: { label: 'leave_request', icon: <CalendarIcon className="w-4 h-4" /> },
  document: { label: 'document', icon: <FileText className="w-4 h-4" /> },
  transfer: { label: 'transfer', icon: <User className="w-4 h-4" /> },
  expense_claim: { label: 'expense_claim', icon: <FileText className="w-4 h-4" /> },
}

const priorityConfig: Record<'low' | 'normal' | 'high' | 'urgent', { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: 'priority.low', color: 'bg-gray-100 text-gray-700', icon: <ArrowDown className="w-3.5 h-3.5" /> },
  normal: { label: 'priority.normal', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3.5 h-3.5" /> },
  high: { label: 'priority.high', color: 'bg-orange-100 text-orange-800', icon: <ArrowUp className="w-3.5 h-3.5" /> },
  urgent: { label: 'priority.urgent', color: 'bg-red-100 text-red-800', icon: <Flame className="w-3.5 h-3.5" /> },
}

export default function RequestsInbox() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, i18n } = useTranslation('requests')
  const isRTL = i18n.dir() === 'rtl'
  const locale = i18n.language === 'ar' ? ar : enUS

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<RequestStatus[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<Array<'low' | 'normal' | 'high' | 'urgent'>>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [quickView, setQuickView] = useState<'all' | 'mine' | 'overdue' | 'urgent' | 'pending_hr' | 'pending_supervisor'>('all')

  // ⚡ Bolt: Debounce the search term to prevent excessive API calls
  // Reduces network requests by waiting for the user to stop typing
  const debouncedSearch = useDebounce(searchTerm, 300)
  const isNumericSearch = /^\d+$/.test(searchTerm.trim())

  // Build filters object
  const filters = {
    search: debouncedSearch || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    employee: selectedEmployee || undefined,
    dateRange: dateRange || undefined,
  }

  const { data: requests = [], isLoading, error } = useRequestsInbox(filters)

  const queueSummary = useMemo(() => {
    const actionableStatuses: RequestStatus[] = ['pending_supervisor_approval', 'pending_hr_review', 'returned_for_correction']
    const actionable = requests.filter((request) => actionableStatuses.includes(request.status))
    const mine = actionable.filter((request) => request.current_assignee_id === user?.id)
    const overdue = actionable.filter((request) =>
      request.due_at &&
      new Date(request.due_at) < new Date() &&
      !['approved', 'rejected', 'closed'].includes(request.status)
    )
    const urgent = actionable.filter((request) => request.priority === 'urgent' || request.priority === 'high')

    return {
      actionableCount: actionable.length,
      myQueueCount: mine.length,
      overdueCount: overdue.length,
      urgentCount: urgent.length,
      pendingHrCount: actionable.filter((request) => request.status === 'pending_hr_review').length,
      pendingSupervisorCount: actionable.filter((request) => request.status === 'pending_supervisor_approval').length,
    }
  }, [requests, user?.id])

  const visibleRequests = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase()

    const quickFiltered = requests.filter((request) => {
      if (quickView === 'mine') return request.current_assignee_id === user?.id
      if (quickView === 'overdue') {
        return !!request.due_at &&
          new Date(request.due_at) < new Date() &&
          !['approved', 'rejected', 'closed'].includes(request.status)
      }
      if (quickView === 'urgent') return request.priority === 'urgent' || request.priority === 'high'
      if (quickView === 'pending_hr') return request.status === 'pending_hr_review'
      if (quickView === 'pending_supervisor') return request.status === 'pending_supervisor_approval'
      return true
    })

    const searched = normalizedSearch.length === 0
      ? quickFiltered
      : quickFiltered.filter((request) => {
        const haystack = [
          request.request_no?.toString(),
          request.requester?.full_name,
          request.current_assignee?.full_name,
          request.supervisor?.full_name,
          request.property?.name,
          request.entity_type,
          request.status,
          request.priority,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })

    return [...searched].sort((left, right) => {
      const leftAssigned = left.current_assignee_id === user?.id ? 1 : 0
      const rightAssigned = right.current_assignee_id === user?.id ? 1 : 0
      if (leftAssigned !== rightAssigned) return rightAssigned - leftAssigned

      const leftOverdue = left.due_at && new Date(left.due_at) < new Date() && !['approved', 'rejected', 'closed'].includes(left.status) ? 1 : 0
      const rightOverdue = right.due_at && new Date(right.due_at) < new Date() && !['approved', 'rejected', 'closed'].includes(right.status) ? 1 : 0
      if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue

      const priorityWeight = { urgent: 3, high: 2, normal: 1, low: 0 }
      const leftPriority = priorityWeight[left.priority ?? 'normal']
      const rightPriority = priorityWeight[right.priority ?? 'normal']
      if (leftPriority !== rightPriority) return rightPriority - leftPriority

      const leftDate = new Date(left.created_at).getTime()
      const rightDate = new Date(right.created_at).getTime()
      return rightDate - leftDate
    })
  }, [debouncedSearch, quickView, requests, user?.id])

  const quickViews = [
    { key: 'all' as const, label: t('quick_views.all', { defaultValue: 'All actionable' }), count: queueSummary.actionableCount },
    { key: 'mine' as const, label: t('quick_views.mine', { defaultValue: 'Assigned to me' }), count: queueSummary.myQueueCount },
    { key: 'overdue' as const, label: t('quick_views.overdue', { defaultValue: 'Overdue' }), count: queueSummary.overdueCount },
    { key: 'urgent' as const, label: t('quick_views.urgent', { defaultValue: 'Urgent' }), count: queueSummary.urgentCount },
    { key: 'pending_hr' as const, label: t('quick_views.pending_hr', { defaultValue: 'Pending HR' }), count: queueSummary.pendingHrCount },
    { key: 'pending_supervisor' as const, label: t('quick_views.pending_supervisor', { defaultValue: 'Pending supervisor' }), count: queueSummary.pendingSupervisorCount },
  ]

  const handleStatusChange = (status: RequestStatus, checked: boolean) => {
    if (checked) {
      setSelectedStatuses([...selectedStatuses, status])
    } else {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status))
    }
  }

  const handleDateRangeSelect = (date: Date | undefined, type: 'start' | 'end') => {
    if (!date) return
    const dateValue = date.toISOString().split('T')[0]
    setDateRange((prev) => {
      const base = prev ?? { start: '', end: '' }
      return { ...base, [type]: dateValue }
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedStatuses([])
    setSelectedPriorities([])
    setSelectedEmployee('')
    setDateRange(null)
  }

  const getStatusBadge = (status: RequestStatus) => {
    const config = statusConfig[status]
    return (
      <Badge className={cn(config.color, "rounded-md")}>
        {config.icon}
        <span className={cn("ms-1", isRTL && "me-1 ms-0")}>{t(config.label)}</span>
      </Badge>
    )
  }

  const getEntityBadge = (entityType: string) => {
    const config = entityConfig[entityType] || { label: entityType, icon: <FileText className="w-4 h-4" /> }
    return (
      <Badge variant="outline" className="rounded-md">
        {config.icon}
        <span className={cn("ms-1", isRTL && "me-1 ms-0")}>{t(config.label)}</span>
      </Badge>
    )
  }

  const getPriorityBadge = (priority: 'low' | 'normal' | 'high' | 'urgent') => {
    const config = priorityConfig[priority]
    return (
      <Badge className={cn(config.color, "rounded-md")}>
        {config.icon}
        <span className={cn("ms-1", isRTL && "me-1 ms-0")}>
          {t(config.label, { defaultValue: priority })}
        </span>
      </Badge>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 border rounded-lg bg-red-50">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800">{t('error_loading')}</h3>
          <p className="text-red-600">{t('error_loading_desc')}</p>
        </div>
      </div>
    )
  }

  return (
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-3">
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                {t('quick_views.inbox_label', { defaultValue: 'Approval Queue' })}
              </Badge>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {t('hero_title', { defaultValue: 'Use this inbox to process employee requests that need action' })}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                  {t('hero_description', { defaultValue: 'This queue collects leave requests, expense claims, transfers, and other HR approvals. Start with overdue or assigned items, then open details to approve, reject, return, or forward.' })}
                </p>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <Inbox className="h-4 w-4" />
                    {t('summary.actionable', { defaultValue: 'Actionable now' })}
                  </div>
                  <div className="mt-2 text-3xl font-semibold">{queueSummary.actionableCount}</div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <ClipboardList className="h-4 w-4" />
                    {t('summary.mine', { defaultValue: 'Assigned to me' })}
                  </div>
                  <div className="mt-2 text-3xl font-semibold">{queueSummary.myQueueCount}</div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <TimerReset className="h-4 w-4" />
                    {t('summary.overdue', { defaultValue: 'Overdue' })}
                  </div>
                  <div className="mt-2 text-3xl font-semibold">{queueSummary.overdueCount}</div>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <ShieldAlert className="h-4 w-4" />
                    {t('summary.urgent', { defaultValue: 'High priority' })}
                  </div>
                  <div className="mt-2 text-3xl font-semibold">{queueSummary.urgentCount}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <div className="flex flex-col">
                <Input
                  placeholder={t('search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-80"
                />
                {searchTerm.trim().length > 0 && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {isNumericSearch
                      ? t('search_hint_numeric', { defaultValue: 'Matching request number and visible request details.' })
                      : t('search_hint', { defaultValue: 'Search by employee, assignee, property, request type, or request number.' })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {t('filters')}
                {selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedEmployee || dateRange ? (
                  <Badge variant="secondary" className="ms-1">
                    {selectedStatuses.length + selectedPriorities.length + (selectedEmployee ? 1 : 0) + (dateRange ? 1 : 0)}
                  </Badge>
                ) : null}
              </Button>
              {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedEmployee || dateRange) && (
                <Button variant="ghost" onClick={clearFilters}>
                  {t('clear_all')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            {/* Status Filters */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('status_label')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(statusConfig).map(([status, config]) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={selectedStatuses.includes(status as RequestStatus)}
                      onCheckedChange={(checked) => handleStatusChange(status as RequestStatus, checked as boolean)}
                    />
                    <Label htmlFor={status} className="text-sm cursor-pointer">
                      {t(config.label)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('priority_label', { defaultValue: 'Priority' })}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(priorityConfig).map(([priority, config]) => (
                  <div key={priority} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${priority}`}
                      checked={selectedPriorities.includes(priority as 'low' | 'normal' | 'high' | 'urgent')}
                      onCheckedChange={(checked) => {
                        const value = priority as 'low' | 'normal' | 'high' | 'urgent'
                        setSelectedPriorities(prev =>
                          checked ? [...prev, value] : prev.filter(p => p !== value)
                        )
                      }}
                    />
                    <Label htmlFor={`priority-${priority}`} className="text-sm cursor-pointer">
                      {t(config.label, { defaultValue: priority })}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('start_date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {dateRange?.start ? format(new Date(dateRange.start), 'PPP', { locale }) : t('pick_date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange?.start ? new Date(dateRange.start) : undefined}
                      onSelect={(date) => handleDateRangeSelect(date, 'start')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('end_date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {dateRange?.end ? format(new Date(dateRange.end), 'PPP', { locale }) : t('pick_date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange?.end ? new Date(dateRange.end) : undefined}
                      onSelect={(date) => handleDateRangeSelect(date, 'end')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {quickViews.map((view) => (
          <Button
            key={view.key}
            type="button"
            variant={quickView === view.key ? 'default' : 'outline'}
            className="h-auto min-h-10 rounded-full px-4 py-2"
            onClick={() => setQuickView(view.key)}
          >
            <span>{view.label}</span>
            <Badge variant="secondary" className="ms-1 bg-white/80 text-slate-700">
              {view.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {visibleRequests.length === 1 ? t('one_request_found') : t('requests_found', { count: visibleRequests.length })}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{t('no_requests')}</h3>
          <p className="text-gray-600">{t('no_requests_desc')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-500">{t('request_no', { no: request.request_no })}</span>
                      {getEntityBadge(request.entity_type)}
                      {getStatusBadge(request.status)}
                      {request.priority ? getPriorityBadge(request.priority) : null}
                      {request.current_assignee_id === user?.id ? (
                        <Badge className="bg-indigo-100 text-indigo-800 rounded-md">
                          {t('assigned_to_me', { defaultValue: 'Assigned to me' })}
                        </Badge>
                      ) : null}
                    </div>

                    <h3 className="text-lg font-medium mb-1">
                      {request.requester?.full_name || 'Unknown Employee'}
                    </h3>

                    <div className="grid gap-1 text-sm text-gray-600 md:grid-cols-2">
                      <div>{t('submitted', { date: format(new Date(request.created_at), 'MMM d, yyyy') })}</div>
                      {request.current_assignee && (
                        <div>
                          {t('current_assignee', { name: request.current_assignee.full_name })}
                        </div>
                      )}
                      {request.property?.name && (
                        <div>
                          {t('property_label', { defaultValue: 'Property' })}: {request.property.name}
                        </div>
                      )}
                      {request.requester?.job_title && (
                        <div>
                          {t('job_title_label', { defaultValue: 'Job title' })}: {request.requester.job_title}
                        </div>
                      )}
                      {request.due_at && (
                        <div className={new Date(request.due_at) < new Date() && !['approved', 'rejected', 'closed'].includes(request.status) ? 'text-red-600 font-medium' : ''}>
                          {t('due_date', { defaultValue: 'Due' })}: {format(new Date(request.due_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate(`/hr/request/${request.id}`)}
                    >
                      {t('view_details')}
                      <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
