import { Icons } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useApprovePIIAccess, useDeletePIIAccessLog, useExportPIIAccessLogs, usePIIAccessLogs, usePIIAccessSummary } from '@/hooks/usePIIAudit'
import type { PIIAccessLog } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Search } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { ErrorState, WorkspaceHeader, headerActionClass } from '@/ui'

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
  const { user } = useAuth()

  const { data: logs, isLoading, error } = usePIIAccessLogs({
    ...filters,
    date_from: dateRange?.from?.toISOString(),
    date_to: dateRange?.to?.toISOString()
  })

  const { data: summary } = usePIIAccessSummary(
    dateRange?.from && dateRange?.to ? {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString()
    } : undefined
  )

  const approveMutation = useApprovePIIAccess()
  const deleteMutation = useDeletePIIAccessLog()
  const exportMutation = useExportPIIAccessLogs()

  const handleApprove = () => {
    if (!selectedLog || !user) return

    approveMutation.mutate({
      logId: selectedLog.id,
      approvedBy: user.id,
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
      date_from: dateRange?.from?.toISOString(),
      date_to: dateRange?.to?.toISOString()
    })
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <ErrorState title={t('pii_audit.error_loading')} />
      </div>
    )
  }

  const unreviewed = (logs ?? []).filter((l) => !l.approved_by).length
  const hasFilters = !!(filters.user_id || filters.resource_type || filters.access_type || dateRange?.from)
  const selectClass = 'min-h-[40px] w-full sm:w-44'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <WorkspaceHeader
        eyebrow={t('admin:piiLog.eyebrow', 'Organization')}
        title={t('admin:piiLog.title', 'Personal data access')}
        context={t('admin:piiLog.context', 'Every time someone opened, changed or exported personal data. Review anything unexpected.')}
        actions={
          <button type="button" onClick={handleExport} disabled={exportMutation.isPending} className={headerActionClass.secondary}>
            <Icons.Download aria-hidden="true" className="h-4 w-4" />{t('admin:piiLog.export', 'Export CSV')}
          </button>
        }
      />

      {summary && (
        <p className="text-sm text-ds-ink-secondary">
          {t('admin:piiLog.summary', '{{accesses}} accesses by {{people}} people', { accesses: summary.total_accesses, people: summary.unique_users })}
          {summary.high_risk_accesses.length > 0 && (
            <> · <span className="font-medium text-ds-danger">{t('admin:piiLog.highRisk', '{{count}} high-risk', { count: summary.high_risk_accesses.length })}</span></>
          )}
          {unreviewed > 0 && <> · {t('admin:piiLog.unreviewed', '{{count}} not yet reviewed', { count: unreviewed })}</>}
        </p>
      )}

      <div role="group" aria-label={t('pii_audit.filters')} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-64">
          <Label htmlFor="user-filter" className="sr-only">{t('roles.user')}</Label>
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-muted" />
          <Input
            id="user-filter"
            className="min-h-[40px] ps-9"
            placeholder={t('pii_audit.filter_user')}
            value={filters.user_id}
            onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
          />
        </div>
        <Select value={filters.resource_type || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, resource_type: value === 'all' ? '' : value }))}>
          <SelectTrigger className={selectClass} aria-label={t('pii_audit.resource_type')}>
            <SelectValue placeholder={t('pii_audit.all_types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin:piiLog.anyRecord', 'Any record')}</SelectItem>
            <SelectItem value="profile">{t('pii_audit.resource_types.profile')}</SelectItem>
            <SelectItem value="document">{t('pii_audit.resource_types.document')}</SelectItem>
            <SelectItem value="training_record">{t('pii_audit.resource_types.training_record')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.access_type || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, access_type: value === 'all' ? '' : value }))}>
          <SelectTrigger className={selectClass} aria-label={t('pii_audit.access_type')}>
            <SelectValue placeholder={t('pii_audit.all_types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin:piiLog.anyAction', 'Any action')}</SelectItem>
            <SelectItem value="view">{t('pii_audit.access_types.view')}</SelectItem>
            <SelectItem value="edit">{t('pii_audit.access_types.edit')}</SelectItem>
            <SelectItem value="download">{t('pii_audit.access_types.download')}</SelectItem>
            <SelectItem value="export">{t('pii_audit.access_types.export')}</SelectItem>
            <SelectItem value="delete">{t('pii_audit.access_types.delete')}</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-h-[40px] justify-start font-normal sm:w-60">
              <Icons.Calendar aria-hidden="true" className="me-2 h-4 w-4" />
              {dateRange?.from
                ? (dateRange.to ? <>{formatDate(dateRange.from)} – {formatDate(dateRange.to)}</> : formatDate(dateRange.from))
                : <span className="text-ds-muted">{t('pii_audit.pick_date')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
          </PopoverContent>
        </Popover>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setFilters({ user_id: '', resource_type: '', access_type: '', date_from: '', date_to: '' })
              setDateRange(undefined)
            }}
            className="min-h-[40px] px-2 text-sm text-ds-muted underline-offset-4 hover:text-ds-ink hover:underline"
          >
            {t('pii_audit.clear')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-[6px] bg-ds-surface-subtle" />)}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-ds-border px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-ds-ink">{t('admin:piiLog.emptyTitle', 'No access recorded')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ds-muted">
            {hasFilters ? t('admin:piiLog.emptyFiltered', 'Nothing matches these filters.') : t('admin:piiLog.emptyBody', 'When someone opens personal data it will be listed here.')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ds-border overflow-hidden rounded-[6px] border border-ds-border bg-ds-surface">
          {logs.map((log) => {
            const fields = Array.isArray(log.pii_fields) ? log.pii_fields : []
            return (
              <li key={log.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ds-ink">
                    <span className="font-medium">{log.accessed_by_profile?.full_name || t('pii_audit.unknown')}</span>{' '}
                    <span className="text-ds-ink-secondary">
                      {t(`pii_audit.access_types.${log.access_type}`, { defaultValue: log.access_type })}
                      {' · '}
                      {t(`pii_audit.resource_types.${log.resource_type}`, { defaultValue: log.resource_type.replace('_', ' ') })}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ds-muted">
                    {fields.length > 0 && <>{fields.slice(0, 4).join(', ')}{fields.length > 4 ? ` +${fields.length - 4}` : ''} · </>}
                    <time dateTime={log.created_at} title={formatDate(log.created_at)}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</time>
                  </p>
                </div>
                <span className={log.approved_by
                  ? 'shrink-0 text-xs text-ds-muted'
                  : 'shrink-0 rounded-[3px] bg-ds-warning-soft px-1.5 py-0.5 text-xs font-medium text-ds-warning'}>
                  {log.approved_by ? t('admin:piiLog.reviewed', 'Reviewed') : t('admin:piiLog.needsReview', 'Needs review')}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" className="min-h-[40px]" onClick={() => setSelectedLog(log)}>
                    {t('admin:piiLog.details', 'Details')}
                  </Button>
                  {!log.approved_by && (
                    <Button variant="outline" size="sm" className="min-h-[40px]" onClick={() => { setSelectedLog(log); setShowApprovalDialog(true) }}>
                      {t('admin:piiLog.markReviewed', 'Mark reviewed')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[40px] text-ds-muted hover:text-ds-danger"
                    aria-label={t('admin:piiLog.remove', 'Remove entry')}
                    onClick={() => { setSelectedLog(log); setShowDeleteDialog(true) }}
                  >
                    <Icons.Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

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
                  {(selectedLog.pii_fields || []).map((field) => (
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
