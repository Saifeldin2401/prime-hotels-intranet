import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Icons } from '@/components/icons'
import { formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { usePIIAccessLogs, usePIIAccessSummary, useApprovePIIAccess, useDeletePIIAccessLog, useExportPIIAccessLogs } from '@/hooks/usePIIAudit'
import type { PIIAccessLog } from '@/lib/types'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

export function PIIAuditViewer() {
  const { t } = useTranslation(['admin', 'common'])
  const [filters, setFilters] = useState({
    user_id: '',
    resource_type: '',
    access_type: '',
    date_from: '',
    date_to: ''
  })
  const [selectedLog, setSelectedLog] = useState<PIIAccessLog | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [approvalJustification, setApprovalJustification] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const { data: logs, isLoading, error } = usePIIAccessLogs({
    ...filters,
    date_from: dateRange?.from?.toISOString() || '',
    date_to: dateRange?.to?.toISOString() || ''
  })

  const { data: summary } = usePIIAccessSummary({
    from: dateRange?.from?.toISOString() || '',
    to: dateRange?.to?.toISOString() || ''
  })

  const approveMutation = useApprovePIIAccess()
  const deleteMutation = useDeletePIIAccessLog()
  const exportMutation = useExportPIIAccessLogs()

  const handleApprove = () => {
    if (!selectedLog) return

    approveMutation.mutate({
      logId: selectedLog.id,
      approvedBy: 'current-user-id', // Replace with actual user ID
      justification: approvalJustification
    }, {
      onSuccess: () => {
        setShowApprovalDialog(false)
        setSelectedLog(null)
        setApprovalJustification('')
      }
    })
  }

  const handleDelete = () => {
    if (!selectedLog) return

    deleteMutation.mutate(selectedLog.id, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        setSelectedLog(null)
      }
    })
  }

  const handleExport = () => {
    exportMutation.mutate({
      ...filters,
      date_from: dateRange?.from?.toISOString() || '',
      date_to: dateRange?.to?.toISOString() || ''
    })
  }

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'view': return <Icons.Eye className="h-4 w-4" />
      case 'edit': return <Icons.Edit className="h-4 w-4" />
      case 'download': return <Icons.Download className="h-4 w-4" />
      case 'export': return <Icons.FileText className="h-4 w-4" />
      case 'delete': return <Icons.Trash2 className="h-4 w-4" />
      default: return <Icons.FileText className="h-4 w-4" />
    }
  }

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'view': return 'bg-blue-100 text-blue-800'
      case 'edit': return 'bg-yellow-100 text-yellow-800'
      case 'download': return 'bg-green-100 text-green-800'
      case 'export': return 'bg-purple-100 text-purple-800'
      case 'delete': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'profile': return 'bg-indigo-100 text-indigo-800'
      case 'document': return 'bg-blue-100 text-blue-800'
      case 'leave_request': return 'bg-green-100 text-green-800'
      case 'training_record': return 'bg-purple-100 text-purple-800'
      case 'maintenance_ticket': return 'bg-orange-100 text-orange-800'
      case 'message': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">{t('pii_audit.error_loading')}</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pii_audit.title')}</h1>
          <p className="text-gray-600">
            {t('pii_audit.description')}
          </p>
        </div>
        <Button onClick={handleExport} disabled={exportMutation.isPending}>
          <Icons.Download className="h-4 w-4 me-2" />
          {t('pii_audit.export_logs')}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pii_audit.total_accesses')}</CardTitle>
              <Icons.FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_accesses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pii_audit.unique_users')}</CardTitle>
              <Icons.Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unique_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pii_audit.sensitive_fields')}</CardTitle>
              <Icons.Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.sensitive_fields_accessed.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pii_audit.high_risk')}</CardTitle>
              <Icons.AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.high_risk_accesses.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pii_audit.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="user-filter">{t('roles.user')}</Label>
              <Input
                id="user-filter"
                placeholder={t('pii_audit.filter_user')}
                value={filters.user_id}
                onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="resource-type">{t('pii_audit.resource_type')}</Label>
              <Select value={filters.resource_type || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, resource_type: value === 'all' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('pii_audit.all_types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pii_audit.all_types')}</SelectItem>
                  <SelectItem value="profile">{t('pii_audit.resource_types.profile')}</SelectItem>
                  <SelectItem value="document">{t('pii_audit.resource_types.document')}</SelectItem>
                  <SelectItem value="leave_request">{t('pii_audit.resource_types.leave_request')}</SelectItem>
                  <SelectItem value="training_record">{t('pii_audit.resource_types.training_record')}</SelectItem>
                  <SelectItem value="maintenance_ticket">{t('pii_audit.resource_types.maintenance_ticket')}</SelectItem>
                  <SelectItem value="message">{t('pii_audit.resource_types.message')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="access-type">{t('pii_audit.access_type')}</Label>
              <Select value={filters.access_type || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, access_type: value === 'all' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('pii_audit.all_types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pii_audit.all_types')}</SelectItem>
                  <SelectItem value="view">{t('pii_audit.access_types.view')}</SelectItem>
                  <SelectItem value="edit">{t('pii_audit.access_types.edit')}</SelectItem>
                  <SelectItem value="download">{t('pii_audit.access_types.download')}</SelectItem>
                  <SelectItem value="export">{t('pii_audit.access_types.export')}</SelectItem>
                  <SelectItem value="delete">{t('pii_audit.access_types.delete')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('audit_logs.date_range')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-start font-normal">
                    <Icons.Calendar className="me-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                        </>
                      ) : (
                        formatDate(dateRange.from)
                      )
                    ) : (
                      <span>{t('pii_audit.pick_date')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setFilters({ user_id: '', resource_type: '', access_type: '', date_from: '', date_to: '' })
                setDateRange(undefined)
              }}>
                <Icons.X className="h-4 w-4 me-2" />
                {t('pii_audit.clear')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pii_audit.access_logs')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pii_audit.timestamp')}</TableHead>
                  <TableHead>{t('roles.user')}</TableHead>
                  <TableHead>{t('pii_audit.resource')}</TableHead>
                  <TableHead>{t('pii_audit.access_type')}</TableHead>
                  <TableHead>{t('pii_audit.pii_fields')}</TableHead>
                  <TableHead>{t('pii_audit.ip_address')}</TableHead>
                  <TableHead>{t('pii_audit.status')}</TableHead>
                  <TableHead>{t('pii_audit.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatDate(log.created_at)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at))} {t('common:social.ago')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.accessed_by_profile?.full_name || t('pii_audit.unknown')}</div>
                        <div className="text-sm text-muted-foreground">{log.accessed_by_profile?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getResourceTypeColor(log.resource_type)}>
                          {t(`pii_audit.resource_types.${log.resource_type}`, { defaultValue: log.resource_type.replace('_', ' ') })}
                        </Badge>
                        <span className="text-sm text-muted-foreground">ID: {log.resource_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAccessTypeIcon(log.access_type)}
                        <Badge className={getAccessTypeColor(log.access_type)}>
                          {t(`pii_audit.access_types.${log.access_type}`, { defaultValue: log.access_type })}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {log.pii_fields.slice(0, 3).map((field) => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                          {log.pii_fields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{log.pii_fields.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {log.ip_address}
                      </code>
                    </TableCell>
                    <TableCell>
                      {log.approved_by ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Icons.CheckCircle className="h-3 w-3 me-1" />
                          {t('pii_audit.approved')}
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Icons.Clock className="h-3 w-3 me-1" />
                          {t('pii_audit.pending')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Icons.Eye className="h-4 w-4" />
                        </Button>
                        {!log.approved_by && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLog(log)
                              setShowApprovalDialog(true)
                            }}
                          >
                            <Icons.CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Icons.Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog && !showApprovalDialog && !showDeleteDialog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('pii_audit.log_details')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('pii_audit.timestamp')}</Label>
                  <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <Label>{t('pii_audit.session_id')}</Label>
                  <p className="text-sm font-mono">{selectedLog.session_id}</p>
                </div>
                <div>
                  <Label>{t('pii_audit.user_agent')}</Label>
                  <p className="text-sm">{selectedLog.user_agent}</p>
                </div>
                <div>
                  <Label>{t('pii_audit.justification')}</Label>
                  <p className="text-sm">{selectedLog.justification || t('pii_audit.no_justification')}</p>
                </div>
              </div>
              <div>
                <Label>{t('pii_audit.pii_fields')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedLog.pii_fields.map((field) => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              {t('common:action.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pii_audit.approve_access')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="justification">{t('pii_audit.justification')}</Label>
              <Textarea
                id="justification"
                placeholder={t('pii_audit.enter_justification')}
                value={approvalJustification}
                onChange={(e) => setApprovalJustification(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              {t('roles.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending || !approvalJustification}>
              {t('pii_audit.approve_access')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pii_audit.delete_log')}</DialogTitle>
            <DialogDescription>
              {t('pii_audit.delete_confirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('roles.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {t('pii_audit.delete_log')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
