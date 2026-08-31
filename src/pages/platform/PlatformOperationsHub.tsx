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
  RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'

export default function PlatformOperationsHub() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'failed' | 'completed'>('all')

  const { data: operations, isLoading, refetch } = useQuery({
    queryKey: ['platform-operations-full-queue'],
    queryFn: () => platformService.getPlatformOperationsSummary(),
    refetchInterval: 10000,
  })

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => platformService.retryFailedJob(jobId),
    onSuccess: () => {
      toast({ title: 'Job Requeued', description: 'The job has been reset to pending status.' })
      queryClient.invalidateQueries({ queryKey: ['platform-operations-full-queue'] })
    },
    onError: (err: any) => {
      toast({ title: 'Retry Failed', description: err.message, variant: 'destructive' })
    },
  })

  const jobs = operations?.recent_jobs || []
  const filteredJobs = jobs.filter((j) => {
    if (filterTab === 'active') return ['pending', 'processing', 'in_progress', 'queued'].includes(j.status)
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
          <div className="text-2xl font-black mt-1">{operations?.total_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-amber-500/5 border-amber-500/20">
          <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Actively Processing</span>
          <div className="text-2xl font-black mt-1 text-amber-700 dark:text-amber-300">{operations?.active_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-green-500/5 border-green-500/20">
          <span className="text-xs text-green-700 dark:text-green-300 font-semibold">Successfully Completed</span>
          <div className="text-2xl font-black mt-1 text-green-700 dark:text-green-300">{operations?.completed_jobs || 0}</div>
        </Card>
        <Card className="p-4 border shadow-sm bg-rose-500/5 border-rose-500/20">
          <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">Failed Tasks</span>
          <div className="text-2xl font-black mt-1 text-rose-700 dark:text-rose-300">{operations?.failed_jobs || 0}</div>
        </Card>
      </div>

      <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="all" className="text-xs font-semibold">All Tasks ({jobs.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs font-semibold">In Progress ({operations?.active_jobs || 0})</TabsTrigger>
          <TabsTrigger value="failed" className="text-xs font-semibold">Failed ({operations?.failed_jobs || 0})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs font-semibold">Completed ({operations?.completed_jobs || 0})</TabsTrigger>
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
    </div>
  )
}