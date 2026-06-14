import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useCreateReportDefinition,
    useCreateReportRun,
    useDeleteReportDefinition,
    useReportDefinitions,
    useReportRuns,
    useUpdateReportDefinition
} from '@/hooks/useReports'
import { openUrlInNewTab, resolveReportRunUrl } from '@/lib/secureFileAccess'
import { supabase } from '@/lib/supabase'
import { Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const REPORT_TYPES = [
  { value: 'operations', labelKey: 'report_builder.types.operations' },
  { value: 'hr', labelKey: 'report_builder.types.hr' },
  { value: 'training', labelKey: 'report_builder.types.training' },
  { value: 'audits', labelKey: 'report_builder.types.audits' }
] as const

const SCOPE_TYPES = [
  { value: 'global', labelKey: 'report_builder.scopes.global' },
  { value: 'property', labelKey: 'report_builder.scopes.property' },
  { value: 'department', labelKey: 'report_builder.scopes.department' }
] as const

const SCHEDULE_OPTIONS = [
  { value: 'none', labelKey: 'report_builder.schedule.none' },
  { value: 'hourly', labelKey: 'report_builder.schedule.hourly' },
  { value: 'daily', labelKey: 'report_builder.schedule.daily' },
  { value: 'weekly', labelKey: 'report_builder.schedule.weekly' },
  { value: 'monthly', labelKey: 'report_builder.schedule.monthly' }
] as const

function toCsv(rows) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  ]
  return csvRows.join('\n')
}

async function fetchReportData(reportType: string, dateFrom?: string, dateTo?: string) {
  const createdAtRange = (query, column: string) => {
    let scoped = query
    if (dateFrom) scoped = scoped.gte(column, dateFrom)
    if (dateTo) scoped = scoped.lte(column, dateTo)
    return scoped
  }
  switch (reportType) {
    case 'operations': {
      const [tasks, maintenance] = await Promise.all([
        createdAtRange(supabase.from('tasks').select('id,title,status,priority,created_at'), 'created_at').limit(500),
        createdAtRange(supabase.from('maintenance_tickets').select('id,title,status,priority,created_at'), 'created_at').limit(500)
      ])
      return {
        tasks: tasks.data || [],
        maintenance: maintenance.data || []
      }
    }
    case 'hr': {
      const [profiles, leave] = await Promise.all([
        createdAtRange(supabase.from('profiles').select('id,full_name,job_title,is_active,created_at'), 'created_at').limit(500),
        createdAtRange(supabase.from('leave_requests').select('id,type,status,start_date,end_date,created_at'), 'created_at').limit(500)
      ])
      return {
        profiles: profiles.data || [],
        leave_requests: leave.data || []
      }
    }
    case 'training': {
      const [assignments, progress] = await Promise.all([
        createdAtRange(supabase.from('training_assignment_rules').select('id,status,due_date,created_at'), 'created_at').limit(500),
        createdAtRange(supabase.from('training_progress').select('id,status,completion_percentage,updated_at'), 'updated_at').limit(500)
      ])
      return {
        learning_assignments: assignments.data || [],
        learning_progress: progress.data || []
      }
    }
    case 'audits': {
      const [runs, findings] = await Promise.all([
        createdAtRange(supabase.from('audit_runs').select('id,status,created_at'), 'created_at').limit(500),
        createdAtRange(supabase.from('audit_findings').select('id,status,notes,created_at'), 'created_at').limit(500)
      ])
      return {
        audit_runs: runs.data || [],
        audit_findings: findings.data || []
      }
    }
    default:
      return {}
  }
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ReportsControlCenter() {
  const { t } = useTranslation('admin')
  const { data: reports = [] } = useReportDefinitions()
  const { data: runs = [] } = useReportRuns()
  const createReport = useCreateReportDefinition()
  const updateReport = useUpdateReportDefinition()
  const deleteReport = useDeleteReportDefinition()
  const createRun = useCreateReportRun()

  const [editingReportId, setEditingReportId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState('operations')
  const [scopeType, setScopeType] = useState('property')
  const [scheduleFrequency, setScheduleFrequency] = useState('none')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isDateRangeInvalid = useMemo(() => {
    if (!dateFrom || !dateTo) return false
    return new Date(dateFrom) > new Date(dateTo)
  }, [dateFrom, dateTo])

  const editingReport = useMemo(
    () => reports.find((r) => r.id === editingReportId) || null,
    [reports, editingReportId]
  )

  useEffect(() => {
    if (!editingReport) return
    setName(editingReport.name || '')
    setDescription(editingReport.description || '')
    setReportType(editingReport.report_type || 'operations')
    setScopeType(editingReport.scope_type || 'property')
    setScheduleFrequency(editingReport.schedule_frequency || 'none')

    const df = (editingReport.filters as any)?.date_from
    const dt = (editingReport.filters as any)?.date_to
    setDateFrom(df || '')
    setDateTo(dt || '')
  }, [editingReport])

  const resetForm = () => {
    setEditingReportId(null)
    setName('')
    setDescription('')
    setReportType('operations')
    setScopeType('property')
    setScheduleFrequency('none')
    setDateFrom('')
    setDateTo('')
  }

  const handleSave = async () => {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      description,
      report_type: reportType,
      scope_type: scopeType as any,
      filters: {
        date_from: dateFrom || null,
        date_to: dateTo || null
      },
      schedule_frequency: scheduleFrequency === 'none' ? null : (scheduleFrequency as any)
    }

    if (editingReportId) {
      await updateReport.mutateAsync({ id: editingReportId, ...payload })
      resetForm()
    } else {
      await createReport.mutateAsync(payload as any)
      setName('')
      setDescription('')
    }
  }

  const handleRun = async (reportId: string, reportTypeValue: string) => {
    try {
      const dataMap = await fetchReportData(reportTypeValue, dateFrom || undefined, dateTo || undefined)
      const csvChunks = Object.entries(dataMap).map(([key, rows]) => {
        const header = `# ${key}`
        const csv = toCsv(rows as any[])
        return [header, csv].filter(Boolean).join('\n')
      })
      const csv = csvChunks.join('\n\n')
      downloadCsv(`report-${reportTypeValue}-${new Date().toISOString().split('T')[0]}.csv`, csv)
      await createRun.mutateAsync({
        report_id: reportId,
        status: 'success',
        triggered_via: 'manual_download',
        row_count: Object.values(dataMap).reduce((sum, rows) => sum + (rows?.length || 0), 0)
      })
    } catch (_error) {
      await createRun.mutateAsync({ report_id: reportId, status: 'failed' })
    }
  }

  const handleOpenRunOutput = async (runId: string, outputUrl?: string | null) => {
    const secureUrl = await resolveReportRunUrl(runId, outputUrl)
    openUrlInNewTab(secureUrl)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('report_builder.title', { defaultValue: 'Report Builder' })}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <Input placeholder={t('report_builder.placeholders.name', { defaultValue: 'Report name' })} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={t('report_builder.placeholders.description', { defaultValue: 'Description' })} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder={t('report_builder.placeholders.type', { defaultValue: 'Type' })} />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {t(type.labelKey, { defaultValue: type.value })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scopeType} onValueChange={setScopeType}>
            <SelectTrigger>
              <SelectValue placeholder={t('report_builder.placeholders.scope', { defaultValue: 'Scope' })} />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_TYPES.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>
                  {t(scope.labelKey, { defaultValue: scope.value })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
            <SelectTrigger>
              <SelectValue placeholder={t('report_builder.placeholders.schedule', { defaultValue: 'Schedule' })} />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey, { defaultValue: opt.value })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-col gap-2 lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="End date"
              />
            </div>
            {isDateRangeInvalid && (
              <p className="text-xs text-red-600">
                End date must be after start date.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={!name.trim() || isDateRangeInvalid}>
              {editingReportId
                ? t('report_builder.actions.save', { defaultValue: 'Save Changes' })
                : t('report_builder.actions.create', { defaultValue: 'Create Report' })}
            </Button>
            {editingReportId && (
              <Button type="button" variant="outline" onClick={resetForm} title={t('common:action.cancel', { defaultValue: 'Cancel' })}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Reports are capped at 500 rows per dataset for performance. Use date filters to narrow results.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Card key={report.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold">{report.name}</p>
                <p className="text-xs text-muted-foreground">
                  {report.description || t('report_builder.no_description', { defaultValue: 'No description' })}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{report.report_type}</Badge>
                  <Badge variant="outline">{report.scope_type}</Badge>
                  {report.schedule_frequency && <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{report.schedule_frequency}</Badge>}
                  {!report.is_active && (
                    <Badge variant="destructive">
                      {t('report_builder.inactive', { defaultValue: 'Inactive' })}
                    </Badge>
                  )}
                </div>
                {report.next_run_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('report_builder.next_run', { defaultValue: 'Next run:' })} {new Date(report.next_run_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => handleRun(report.id, report.report_type)}>
                  {t('report_builder.actions.run', { defaultValue: 'Run' })}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingReportId(report.id)}
                  disabled={updateReport.isPending}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    {t('report_builder.actions.edit', { defaultValue: 'Edit' })}
                  </span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateReport.mutate({ id: report.id, is_active: !report.is_active })}>
                  {report.is_active
                    ? t('report_builder.actions.disable', { defaultValue: 'Disable' })
                    : t('report_builder.actions.enable', { defaultValue: 'Enable' })}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteReport.mutate(report.id)}>
                  {t('report_builder.actions.delete', { defaultValue: 'Delete' })}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('report_builder.recent_runs', { defaultValue: 'Recent Runs' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('report_builder.no_runs', { defaultValue: 'No report runs yet.' })}</p>
          ) : runs.slice(0, 6).map((run) => (
            <div key={run.id} className="flex items-center justify-between text-sm border rounded-md p-2">
              <div>
                <p className="font-medium">
                  {t('report_builder.run_label', { defaultValue: 'Run {{id}}', id: run.id.slice(0, 6) })}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
                {typeof run.row_count === 'number' && (
                  <p className="text-xs text-muted-foreground">Rows: {run.row_count}</p>
                )}
                {run.error_message && (
                  <p className="text-xs text-red-600">{run.error_message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                  {run.status}
                </Badge>
                {run.status === 'success' && (run.output_path || run.output_url) && (
                  <Button size="sm" variant="outline" onClick={() => handleOpenRunOutput(run.id, run.output_url)}>
                    Open
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
