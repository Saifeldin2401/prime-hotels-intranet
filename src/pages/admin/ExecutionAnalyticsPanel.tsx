/**
 * Fully Wired Execution Analytics Panel
 * 
 * REAL database integration for execution history and analytics
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ActionExecution {
  id: string
  action_type: string
  triggered_by: string
  trigger_type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  target_type: string | null
  target_id: string | null
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  execution_time_ms: number | null
  created_at: string
}

interface RuleExecution {
  id: string
  rule_id: string
  trigger_event: string
  trigger_data: Record<string, unknown>
  conditions_matched: boolean
  condition_results: Record<string, unknown>[]
  actions_executed: Record<string, unknown>[]
  status: 'matched' | 'not_matched' | 'error' | 'skipped'
  entity_type: string | null
  entity_id: string | null
  error_message: string | null
  queued_at: string
  started_at: string | null
  completed_at: string | null
  execution_time_ms: number | null
  created_at: string
}

export function ExecutionAnalyticsPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('24h')
  const [activeTab, setActiveTab] = useState('actions')

  // Calculate date range
  const getSinceDate = () => {
    const now = new Date()
    switch (dateRange) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }
  }

  // REAL database query - action executions
  const { data: actionExecutions, isLoading: actionsLoading } = useQuery({
    queryKey: ['action-executions', dateRange],
    queryFn: async () => {
      const since = getSinceDate()
      let query = supabase
        .from('action_executions')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      
      if (error) {
        toast.error('Failed to load executions: ' + error.message)
        throw error
      }
      return data as ActionExecution[]
    }
  })

  // REAL database query - rule executions
  const { data: ruleExecutions, isLoading: rulesLoading } = useQuery({
    queryKey: ['rule-executions', dateRange],
    queryFn: async () => {
      const since = getSinceDate()
      let query = supabase
        .from('rule_executions')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      
      if (error) {
        toast.error('Failed to load rule executions: ' + error.message)
        throw error
      }
      return data as RuleExecution[]
    }
  })

  const filteredActionExecutions = actionExecutions?.filter(exec => {
    const matchesSearch = !searchTerm || 
      exec.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.status.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredRuleExecutions = ruleExecutions?.filter(exec => {
    const matchesSearch = !searchTerm || 
      exec.trigger_event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.status.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const actionStats = {
    total: actionExecutions?.length || 0,
    completed: actionExecutions?.filter(e => e.status === 'completed').length || 0,
    failed: actionExecutions?.filter(e => e.status === 'failed').length || 0,
    running: actionExecutions?.filter(e => e.status === 'running').length || 0,
    avgTime: actionExecutions?.length 
      ? Math.round(actionExecutions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / actionExecutions.length)
      : 0
  }

  const ruleStats = {
    total: ruleExecutions?.length || 0,
    matched: ruleExecutions?.filter(e => e.status === 'matched').length || 0,
    notMatched: ruleExecutions?.filter(e => e.status === 'not_matched').length || 0,
    errors: ruleExecutions?.filter(e => e.status === 'error').length || 0
  }

  if (actionsLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search executions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-80"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="w-4 h-4" />
            Action Executions
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Activity className="w-4 h-4" />
            Rule Evaluations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          {/* Action Stats */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{actionStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{actionStats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{actionStats.failed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Running</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{actionStats.running}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{actionStats.avgTime}ms</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Executions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Action Execution History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActionExecutions?.map(execution => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {execution.action_type}
                      </TableCell>
                      <TableCell>
                        <ExecutionStatusBadge status={execution.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{execution.trigger_type}</Badge>
                      </TableCell>
                      <TableCell>{execution.target_type || '-'}</TableCell>
                      <TableCell>
                        {new Date(execution.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {execution.execution_time_ms ? `${execution.execution_time_ms}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {!filteredActionExecutions?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No executions found for the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {/* Rule Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ruleStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Matched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{ruleStats.matched}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Not Matched</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{ruleStats.notMatched}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{ruleStats.errors}</div>
              </CardContent>
            </Card>
          </div>

          {/* Rule Executions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Rule Evaluation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trigger Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conditions Matched</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRuleExecutions?.map(execution => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {execution.trigger_event}
                      </TableCell>
                      <TableCell>
                        <RuleStatusBadge status={execution.status} />
                      </TableCell>
                      <TableCell>
                        {execution.conditions_matched ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {execution.actions_executed?.length || 0} actions
                      </TableCell>
                      <TableCell>{execution.entity_type || '-'}</TableCell>
                      <TableCell>
                        {new Date(execution.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {!filteredRuleExecutions?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No rule evaluations found for the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Need to import Zap for the icon
import { Zap } from 'lucide-react'

function ExecutionStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
    running: { color: 'bg-blue-100 text-blue-800', icon: <Activity className="w-3 h-3" /> },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="w-3 h-3" /> }
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge className={`${config.color} gap-1`}>
      {config.icon}
      {status}
    </Badge>
  )
}

function RuleStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string }> = {
    matched: { color: 'bg-green-100 text-green-800' },
    not_matched: { color: 'bg-gray-100 text-gray-800' },
    error: { color: 'bg-red-100 text-red-800' },
    skipped: { color: 'bg-yellow-100 text-yellow-800' }
  }

  const config = statusConfig[status] || statusConfig.not_matched

  return (
    <Badge className={config.color}>
      {status}
    </Badge>
  )
}
