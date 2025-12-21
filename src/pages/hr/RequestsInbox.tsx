import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Loader2, Search, Filter, CalendarIcon, User, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useRequestsInbox, type RequestStatus, type RequestRow } from '@/hooks/useRequests'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ar, enUS } from 'date-fns/locale'

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
}

export default function RequestsInbox() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('requests')
  const isRTL = i18n.dir() === 'rtl'
  const locale = i18n.language === 'ar' ? ar : enUS

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<RequestStatus[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Build filters object
  const filters = {
    search: searchTerm || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    employee: selectedEmployee || undefined,
    dateRange: dateRange || undefined,
  }

  const { data: requests = [], isLoading, error } = useRequestsInbox(filters)

  const handleStatusChange = (status: RequestStatus, checked: boolean) => {
    if (checked) {
      setSelectedStatuses([...selectedStatuses, status])
    } else {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status))
    }
  }

  const handleDateRangeSelect = (date: Date | undefined, type: 'start' | 'end') => {
    if (!date) return
    const newRange = dateRange || { start: '', end: '' }
    newRange[type] = date.toISOString().split('T')[0]
    setDateRange(newRange)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedStatuses([])
    setSelectedEmployee('')
    setDateRange(null)
  }

  const getStatusBadge = (status: RequestStatus) => {
    const config = statusConfig[status]
    return (
      <Badge className={cn(config.color, "rounded-md")}>
        {config.icon}
        <span className={cn("ml-1", isRTL && "mr-1 ml-0")}>{t(config.label)}</span>
      </Badge>
    )
  }

  const getEntityBadge = (entityType: string) => {
    const config = entityConfig[entityType] || { label: entityType, icon: <FileText className="w-4 h-4" /> }
    return (
      <Badge variant="outline" className="rounded-md">
        {config.icon}
        <span className={cn("ml-1", isRTL && "mr-1 ml-0")}>{t(config.label)}</span>
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder={t('search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {t('filters')}
              {selectedStatuses.length > 0 || selectedEmployee || dateRange && (
                <Badge variant="secondary" className="ml-1">
                  {selectedStatuses.length + (selectedEmployee ? 1 : 0) + (dateRange ? 1 : 0)}
                </Badge>
              )}
            </Button>
            {(selectedStatuses.length > 0 || selectedEmployee || dateRange) && (
              <Button variant="ghost" onClick={clearFilters}>
                {t('clear_all')}
              </Button>
            )}
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

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('start_date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                      <CalendarIcon className="mr-2 h-4 w-4" />
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

      {/* Results */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          {requests.length === 1 ? t('one_request_found') : t('requests_found', { count: requests.length })}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{t('no_requests')}</h3>
          <p className="text-gray-600">{t('no_requests_desc')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">{t('request_no', { no: request.request_no })}</span>
                      {getEntityBadge(request.entity_type)}
                      {getStatusBadge(request.status)}
                    </div>

                    <h3 className="text-lg font-medium mb-1">
                      {request.requester?.full_name || 'Unknown Employee'}
                    </h3>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div>{t('submitted', { date: format(new Date(request.created_at), 'MMM d, yyyy') })}</div>
                      {request.current_assignee && (
                        <div>
                          {t('current_assignee', { name: request.current_assignee.full_name })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/hr/request/${request.id}`)}
                    >
                      {t('view_details')}
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
