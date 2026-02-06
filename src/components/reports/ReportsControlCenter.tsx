import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  useCreateReportDefinition,
  useCreateReportRun,
  useDeleteReportDefinition,
  useReportDefinitions,
  useReportRuns,
  useUpdateReportDefinition
} from '@/hooks/useReports'
import { EnhancedCard } from '@/components/ui/enhanced-card'

const REPORT_TYPES = [
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR' },
  { value: 'training', label: 'Training' },
  { value: 'audits', label: 'Audits' }
]

const SCOPE_TYPES = [
  { value: 'global', label: 'Global' },
  { value: 'property', label: 'Property' },
  { value: 'department', label: 'Department' }
]

const SCHEDULE_OPTIONS = [
  { value: 'none', label: 'No schedule' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

function toCsv(rows: any[]) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  ]
  return csvRows.join('\n')
}

async function fetchReportData(reportType: string) {
  switch (reportType) {
    case 'operations': {
      const [tasks, maintenance] = await Promise.all([
        supabase.from('tasks').select('id,title,status,priority,created_at').limit(500),
        supabase.from('maintenance_tickets').select('id,title,status,priority,created_at').limit(500)
      ])
      return {
        tasks: tasks.data || [],
        maintenance: maintenance.data || []
      }
    }
    case 'hr': {
      const [profiles, leave] = await Promise.all([
        supabase.from('profiles').select('id,full_name,job_title,is_active,created_at').limit(500),
        supabase.from('leave_requests').select('id,type,status,start_date,end_date,created_at').limit(500)
      ])
      return {
        profiles: profiles.data || [],
        leave_requests: leave.data || []
      }
    }
    case 'training': {
      const [assignments, progress] = await Promise.all([
        supabase.from('learning_assignments').select('id,status,due_date,created_at').limit(500),
        supabase.from('learning_progress').select('id,status,completion_percentage,updated_at').limit(500)
      ])
      return {
        learning_assignments: assignments.data || [],
        learning_progress: progress.data || []
      }
    }
    case 'audits': {
      const [runs, findings] = await Promise.all([
        supabase.from('audit_runs').select('id,status,created_at').limit(500),
        supabase.from('audit_findings').select('id,status,notes,created_at').limit(500)
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
  const { data: reports = [] } = useReportDefinitions()
  const { data: runs = [] } = useReportRuns()
  const createReport = useCreateReportDefinition()
  const updateReport = useUpdateReportDefinition()
  const deleteReport = useDeleteReportDefinition()
  const createRun = useCreateReportRun()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState('operations')
  const [scopeType, setScopeType] = useState('property')
  const [scheduleFrequency, setScheduleFrequency] = useState('none')

  const handleCreate = async () => {
    if (!name.trim()) return
    await createReport.mutateAsync({
      name: name.trim(),
      description,
      report_type: reportType,
      scope_type: scopeType as any,
      filters: {},
      schedule_frequency: scheduleFrequency === 'none' ? null : (scheduleFrequency as any)
    })
    setName('')
    setDescription('')
  }

  const handleRun = async (reportId: string, reportTypeValue: string) => {
    try {
      const dataMap = await fetchReportData(reportTypeValue)
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
        row_count: Object.values(dataMap).reduce((sum, rows: any) => sum + (rows?.length || 0), 0)
      })
    } catch (_error) {
      await createRun.mutateAsync({ report_id: reportId, status: 'failed' })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <Input placeholder="Report name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scopeType} onValueChange={setScopeType}>
            <SelectTrigger>
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_TYPES.map((scope) => (
                <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
            <SelectTrigger>
              <SelectValue placeholder="Schedule" />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Report
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reports.map((report) => (
          <EnhancedCard key={report.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold">{report.name}</p>
                <p className="text-xs text-muted-foreground">{report.description || 'No description'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{report.report_type}</Badge>
                  <Badge variant="outline">{report.scope_type}</Badge>
                  {report.schedule_frequency && <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{report.schedule_frequency}</Badge>}
                  {!report.is_active && <Badge variant="destructive">Inactive</Badge>}
                </div>
                {report.next_run_at && (
                  <p className="text-xs text-muted-foreground mt-1">Next run: {new Date(report.next_run_at).toLocaleString()}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={() => handleRun(report.id, report.report_type)}>Run</Button>
                <Button size="sm" variant="outline" onClick={() => updateReport.mutate({ id: report.id, is_active: !report.is_active })}>
                  {report.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteReport.mutate(report.id)}>Delete</Button>
              </div>
            </div>
          </EnhancedCard>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No report runs yet.</p>
          ) : runs.slice(0, 6).map((run) => (
            <div key={run.id} className="flex items-center justify-between text-sm border rounded-md p-2">
              <div>
                <p className="font-medium">Run {run.id.slice(0, 6)}</p>
                <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={run.status === 'success' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                {run.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
