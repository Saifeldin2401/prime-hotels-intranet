import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { platformService } from '@/services/platformService'
import {
  Activity,
  Cpu,
  RefreshCw,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play
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
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Platform Operations & Background Task Queue</h1>
            <p className="text-xs text-muted-foreground">
              Monitor AI course generation, document vector ingestion, and sync pipelines across all tenants.
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          Refresh Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-sm">
          <span className="text-xs text-muted-foreground font-semibold">Total Pipeline Tasks</span>
          <div className="text-2xl font-black mt-1">{summary.total_jobs}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-amber-500/5 border-amber-500/20">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Actively Processing</span>
          <div className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">{summary.processing_jobs}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-green-500/5 border-green-500/20">
          <span className="text-xs text-green-700 dark:text-green-300 font-semibold">Successfully Completed</span>
          <div className="text-2xl font-black mt-1 text-green-700 dark:text-green-300">{summary.completed_jobs}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-rose-500/5 border-rose-500/20">
          <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Failed Tasks</span>
          <div className="text-2xl font-black mt-1 text-rose-700 dark:text-rose-300">{summary.failed_jobs}</div>
        </Card>
      </div>

      <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="all" className="text-xs font-semibold">All Tasks ({jobs.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs font-semibold">In Progress ({summary.processing_jobs})</TabsTrigger>
          <TabsTrigger value="failed" className="text-xs font-semibold">Failed ({summary.failed_jobs})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-semibold">Completed ({summary.completed_jobs})</TabsTrigger>
        </TabsList>

        <Card className="border shadow-sm overflow-hidden">
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
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
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
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-sm truncate font-mono">
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
                            ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
                            : j.status === 'failed' || j.status === 'error'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
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
                          className="h-7 text-[11px] text-rose-600 border-rose-300 hover:bg-rose-50"
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
              <Clock className="h-4 w-4 text-blue-600" />
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
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${lastRun.status === 'succeeded' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
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