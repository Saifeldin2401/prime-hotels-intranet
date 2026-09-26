import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { platformService } from '@/services/platformService'
import { Link } from 'react-router-dom'
import { WorkspaceHeader, headerActionClass } from '@/ui'
import {
  RefreshCw,
  RotateCcw,
  Clock,
  Bot
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformOperationsHub() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'failed' | 'completed'>('all')

  const { data: operations, isLoading, refetch } = useQuery({
    queryKey: ['platform-ai-operations'],
    queryFn: () => platformService.getPlatformAiOperations(),
    refetchInterval: 10000,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => platformService.retryCourseGenerationJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job Requeued', description: 'The task has been reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-ai-operations'] })
    },
    onError: (err: any) => {
      toast({ title: 'Retry Failed', description: err.message, variant: 'destructive' })
    },
  })

  const summary = operations?.summary || { total_jobs: 0, failed_jobs: 0, processing_jobs: 0, completed_jobs: 0 }
  const jobs = operations?.recent_jobs || []
  const cronJobs = operations?.cron_jobs || []
  const cronRuns = operations?.recent_cron_runs || []

  const filteredJobs = jobs.filter((j) => {
    if (filterTab === 'active') return ['pending', 'processing', 'in_progress', 'queued', 'generating', 'running'].includes(j.status)
    if (filterTab === 'failed') return ['failed', 'error'].includes(j.status)
    if (filterTab === 'completed') return ['completed', 'success'].includes(j.status)
    return true
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <WorkspaceHeader
        eyebrow="Platform"
        title="Operations"
        context={`Background jobs across all organizations: AI course generation, ingestion and scheduled tasks. ${summary.processing_jobs} running now.`}
        actions={
          <>
            <button type="button" onClick={() => refetch()} className={headerActionClass.secondary} aria-label="Refresh">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
            </button>
            <Link to="/platform/ai-settings" className={headerActionClass.secondary}>
              <Bot aria-hidden="true" className="h-4 w-4" />AI settings
            </Link>
          </>
        }
      />

      {summary.failed_jobs > 0 && (
        <div className="flex flex-col gap-2 rounded-[6px] border border-ds-danger/30 bg-ds-danger-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ds-ink">{summary.failed_jobs} job{summary.failed_jobs === 1 ? '' : 's'} failed. Retry them or check the error before the author tries again.</p>
          <button type="button" onClick={() => setFilterTab('failed')} className="text-sm font-semibold text-ds-ink underline-offset-4 hover:underline">Show failed</button>
        </div>
      )}

      <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="space-y-4">
        <TabsList data-tour="platform-health-deck" className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-ds-border bg-transparent p-0">
          <TabsTrigger value="all" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">All <span className="ms-1.5 font-mono text-xs tabular-nums">{jobs.length}</span></TabsTrigger>
          <TabsTrigger value="active" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">Running <span className="ms-1.5 font-mono text-xs tabular-nums">{summary.processing_jobs}</span></TabsTrigger>
          <TabsTrigger value="failed" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">Failed <span className="ms-1.5 font-mono text-xs tabular-nums">{summary.failed_jobs}</span></TabsTrigger>
          <TabsTrigger value="completed" className="min-h-[40px] rounded-none border-b-2 border-transparent px-3 text-sm text-ds-muted data-[state=active]:border-ds-ink data-[state=active]:bg-transparent data-[state=active]:text-ds-ink data-[state=active]:shadow-none">Completed <span className="ms-1.5 font-mono text-xs tabular-nums">{summary.completed_jobs}</span></TabsTrigger>
        </TabsList>

        <Card className="overflow-hidden rounded-[6px] border border-ds-border shadow-none">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Task Mode & ID</TableHead>
                <TableHead className="text-xs font-bold">Models & Providers</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Duration</TableHead>
                <TableHead className="text-xs font-bold">Dispatched</TableHead>
                <TableHead className="text-xs font-bold text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-ds-accent" />
                    Loading operations queue...
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No jobs matching selected filter tab.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((j) => (
                  <TableRow key={j.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-xs capitalize">{j.mode || 'AI Course Generation'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{j.id}</div>
                      {j.error_message && (
                        <div className="text-[10px] text-ds-danger mt-1 max-w-sm truncate font-mono">
                          {j.error_message}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {j.models_used && j.models_used.length > 0 ? (
                          j.models_used.map((m, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] font-mono">
                              {m}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Automated Cascade</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${
 j.status === 'completed' || j.status === 'success'
 ? 'bg-ds-success-soft text-ds-success border-ds-success/30'
 : j.status === 'failed' || j.status === 'error'
 ? 'bg-ds-danger-soft text-ds-danger border-ds-danger/30'
 : 'bg-ds-warning-soft text-ds-warning border-ds-warning/30'
 }`}
                      >
                        {j.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-mono">
                      {j.duration_ms ? `${(j.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </TableCell>

                    <TableCell className="text-[11px] text-muted-foreground">
                      {format(new Date(j.created_at), 'dd MMM HH:mm:ss')}
                    </TableCell>

                    <TableCell className="text-end">
                      {(j.status === 'failed' || j.status === 'error') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryMutation.mutate(j.id)}
                          disabled={retryMutation.isPending}
                          className="h-7 text-[11px] text-ds-danger border-ds-danger/30 hover:bg-ds-danger-soft"
                        >
                          <RotateCcw className="h-3 w-3 me-1" />
                          Retry
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      {/* pg_cron Scheduled Jobs Telemetry */}
      {cronJobs.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-ds-accent" />
              Scheduled Platform Cron Jobs ({cronJobs.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Automated maintenance, report delivery, and notification dispatch daemons managed via pg_cron.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cronJobs.map((c) => {
                const lastRun = cronRuns.find((r) => r.jobid === c.jobid)
                return (
                  <div key={c.jobid} className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-foreground">{c.jobname || `Job #${c.jobid}`}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">Schedule: {c.schedule}</div>
                      </div>
                      <Badge variant={c.active ? 'default' : 'secondary'} className="text-[9px]">
                        {c.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {lastRun && (
                      <div className="text-[10px] pt-1 border-t flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${lastRun.status === 'succeeded' ? 'bg-ds-success' : 'bg-ds-danger'}`} />
                          {lastRun.status}
                        </span>
                        <span>{lastRun.start_time ? format(new Date(lastRun.start_time), 'HH:mm:ss') : '—'}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}