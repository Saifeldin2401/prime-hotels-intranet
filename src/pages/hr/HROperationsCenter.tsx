import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Loader2, Search, Filter, CalendarIcon, Bell, CheckCircle, XCircle, AlertCircle, Mail, MessageSquare, FileText, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { useNotifications } from '@/hooks/useNotifications'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ar, enUS } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'



export default function HROperationsCenter() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const { t, i18n } = useTranslation('hr')
  const isRTL = i18n.dir() === 'rtl'
  const locale = i18n.language === 'ar' ? ar : enUS

  const notificationTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    approval_required: { label: t('operations_center.types.approval_required', 'Approval Required'), color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> },
    request_approved: { label: t('operations_center.types.request_approved', 'Request Approved'), color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
    request_rejected: { label: t('operations_center.types.request_rejected', 'Request Rejected'), color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
    request_submitted: { label: t('operations_center.types.request_submitted', 'Request Submitted'), color: 'bg-blue-100 text-blue-800', icon: <FileText className="w-4 h-4" /> },
    comment_added: { label: t('operations_center.types.comment_added', 'Comment Added'), color: 'bg-purple-100 text-purple-800', icon: <MessageSquare className="w-4 h-4" /> },
    request_returned: { label: t('operations_center.types.request_returned', 'Request Returned'), color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="w-4 h-4" /> },
    request_closed: { label: t('operations_center.types.request_closed', 'Request Closed'), color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-4 h-4" /> },
    training_assigned: { label: t('operations_center.types.training_assigned', 'Training Assigned'), color: 'bg-indigo-100 text-indigo-800', icon: <FileText className="w-4 h-4" /> },
    training_deadline: { label: t('operations_center.types.training_deadline', 'Training Deadline'), color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
    document_published: { label: t('operations_center.types.document_published', 'Document Published'), color: 'bg-blue-100 text-blue-800', icon: <FileText className="w-4 h-4" /> },
    document_acknowledgment_required: { label: t('operations_center.types.document_acknowledgment_required', 'Document Acknowledgment'), color: 'bg-orange-100 text-orange-800', icon: <FileText className="w-4 h-4" /> },
    announcement_new: { label: t('operations_center.types.announcement_new', 'New Announcement'), color: 'bg-purple-100 text-purple-800', icon: <Bell className="w-4 h-4" /> },
    escalation_alert: { label: t('operations_center.types.escalation_alert', 'Escalation Alert'), color: 'bg-red-100 text-red-800', icon: <AlertCircle className="w-4 h-4" /> },
    referral_status_update: { label: t('operations_center.types.referral_status_update', 'Referral Update'), color: 'bg-blue-100 text-blue-800', icon: <Mail className="w-4 h-4" /> },
    maintenance_assigned: { label: t('operations_center.types.maintenance_assigned', 'Maintenance Assigned'), color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="w-4 h-4" /> },
    maintenance_resolved: { label: t('operations_center.types.maintenance_resolved', 'Maintenance Resolved'), color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  }

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'created_at' | 'read_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter notifications
  const filteredNotifications = notifications
    .filter(notification => {
      // Search filter
      if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(notification.type)) {
        return false
      }

      // Read status filter
      if (readStatus === 'read' && !notification.is_read) return false
      if (readStatus === 'unread' && notification.is_read) return false

      // Date range filter
      if (dateRange) {
        const notificationDate = new Date(notification.created_at)
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999) // End of day

        if (notificationDate < startDate || notificationDate > endDate) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type])
    } else {
      setSelectedTypes(selectedTypes.filter(t => t !== type))
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
    setSelectedTypes([])
    setReadStatus('all')
    setDateRange(null)
  }

  const getTypeBadge = (type: string) => {
    const config = notificationTypeConfig[type] || {
      label: type.replace('_', ' ').toUpperCase(),
      color: 'bg-gray-100 text-gray-800',
      icon: <Bell className="w-4 h-4" />
    }
    return (
      <Badge className={cn(config.color, "rounded-md")}>
        {config.icon}
        <span className={cn("ml-1", isRTL && "mr-1 ml-0")}>{config.label}</span>
      </Badge>
    )
  }

  // Calculate statistics
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    byType: notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 border rounded-lg bg-red-50">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800">{t('operations_center.access_denied', 'Access Denied')}</h3>
          <p className="text-red-600">{t('operations_center.access_denied_desc', 'You must be logged in to access this page')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('operations_center.title')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('operations_center.description')}</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={unreadCount === 0 || markAllAsRead.isPending}
            className="flex-1 sm:flex-none h-11"
          >
            {markAllAsRead.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {t('operations_center.mark_all_read')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-[10px] xs:text-xs md:text-sm font-medium">{t('operations_center.total_notifications')}</CardTitle>
            <Bell className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-[10px] xs:text-xs md:text-sm font-medium">{t('operations_center.unread')}</CardTitle>
            <AlertCircle className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-[10px] xs:text-xs md:text-sm font-medium">{t('operations_center.approval_required')}</CardTitle>
            <Settings className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{stats.byType.approval_required || 0}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-[10px] xs:text-xs md:text-sm font-medium">{t('operations_center.escalations')}</CardTitle>
            <AlertCircle className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-red-600">{stats.byType.escalation_alert || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('operations_center.search_notifications', 'Search notifications...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 w-full bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 w-full xs:w-auto">
                <Select value={sortBy} onValueChange={(value: 'created_at' | 'read_at') => setSortBy(value)}>
                  <SelectTrigger className="flex-1 xs:w-32 h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">{t('operations_center.sort.created', 'Created')}</SelectItem>
                    <SelectItem value="read_at">{t('operations_center.sort.read', 'Read')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="flex-1 xs:w-32 h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">{t('operations_center.sort.newest', 'Newest')}</SelectItem>
                    <SelectItem value="asc">{t('operations_center.sort.oldest', 'Oldest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 w-full xs:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn("flex-1 xs:flex-none items-center gap-2 h-11 bg-white", showFilters && "bg-slate-50 border-hotel-gold")}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden xs:inline">{t('operations_center.filters')}</span>
                  {(selectedTypes.length > 0 || readStatus !== 'all' || dateRange) && (
                    <Badge variant="secondary" className="ml-1 bg-hotel-navy text-white">
                      {selectedTypes.length + (readStatus !== 'all' ? 1 : 0) + (dateRange ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
                {(selectedTypes.length > 0 || readStatus !== 'all' || dateRange) && (
                  <Button variant="ghost" onClick={clearFilters} className="flex-1 xs:flex-none h-11">
                    {t('operations_center.filters_clear', 'Clear')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            {/* Type Filters */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('operations_center.filter_type', 'Notification Type')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(notificationTypeConfig).map(([type, config]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                    />
                    <Label htmlFor={type} className="text-sm cursor-pointer">
                      {config.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Read Status */}
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('operations_center.filter_status', 'Read Status')}</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read-all"
                    checked={readStatus === 'all'}
                    onCheckedChange={() => setReadStatus('all')}
                  />
                  <Label htmlFor="read-all" className="text-sm cursor-pointer">{t('operations_center.status.all', 'All')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read-unread"
                    checked={readStatus === 'unread'}
                    onCheckedChange={() => setReadStatus('unread')}
                  />
                  <Label htmlFor="read-unread" className="text-sm cursor-pointer">{t('operations_center.status.unread', 'Unread')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="read-read"
                    checked={readStatus === 'read'}
                    onCheckedChange={() => setReadStatus('read')}
                  />
                  <Label htmlFor="read-read" className="text-sm cursor-pointer">{t('operations_center.status.read', 'Read')}</Label>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('operations_center.filter_start_date', 'Start Date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.start ? format(new Date(dateRange.start), 'PPP', { locale }) : t('operations_center.pick_date', 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange?.start ? new Date(dateRange.start) : undefined}
                      onSelect={(date) => handleDateRangeSelect(date, 'start')}
                      initialFocus
                      locale={locale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('operations_center.filter_end_date', 'End Date')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.end ? format(new Date(dateRange.end), 'PPP', { locale }) : t('operations_center.pick_date', 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange?.end ? new Date(dateRange.end) : undefined}
                      onSelect={(date) => handleDateRangeSelect(date, 'end')}
                      initialFocus
                      locale={locale}
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
          {t('operations_center.notifications_found', { count: filteredNotifications.length })}
        </h2>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{t('operations_center.no_notifications')}</h3>
          <p className="text-gray-600">{t('operations_center.no_notifications_desc', 'Try adjusting your filters or search terms')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredNotifications.map((notification) => (
            <Card key={notification.id} className={cn("hover:shadow-md transition-shadow", !notification.is_read && "border-l-4 border-l-blue-500")}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(notification.type)}
                      {!notification.is_read && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          {t('operations_center.unread')}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-medium mb-1">{notification.title}</h3>
                    <p className="text-gray-600 mb-2">{notification.message}</p>

                    <div className="text-sm text-gray-500">
                      {t('operations_center.created_at', 'Created')}: {format(new Date(notification.created_at), 'PPP p', { locale })}
                      {notification.read_at && (
                        <span className="ml-4">
                          {t('operations_center.read_at', 'Read')}: {format(new Date(notification.read_at), 'PPP p', { locale })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead.mutate(notification.id)}
                        disabled={markAsRead.isPending}
                      >
                        {markAsRead.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {t('operations_center.mark_read')}
                      </Button>
                    )}
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
