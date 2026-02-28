import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'

type PropertyRollup = {
  property_id: string
  property_name: string
  revenue_30d: number
  avg_revpar_30d: number
  avg_guest_satisfaction_30d: number
  risk_alert_count_30d: number
}

type PortfolioRollup = {
  portfolio_id: string
  portfolio_code: string
  portfolio_name: string
  property_count: number
  portfolio_revenue_30d: number
  portfolio_avg_revpar_30d: number
  portfolio_guest_satisfaction_30d: number
  risk_alert_count_30d: number
}

type DepartmentGap = {
  department_id: string
  property_id: string | null
  department_name: string
  missing_department_head: boolean
  missing_budget_owner: boolean
  missing_kpi_targets: boolean
  missing_accountable_raci: boolean
}

type KpiRaciGap = {
  kpi_id: string
  kpi_code: string
  kpi_name: string
  scope_type: string
}

type OverrideEvent = {
  id: string
  created_at: string
  action_type: string
  entity_type: string
  property_id: string | null
  department_id: string | null
  actor_id: string | null
  actor_role_code: string | null
  amount: number | null
  currency: string
  override_reason: string | null
}

type ActiveDelegation = {
  id: string
  delegator_id: string
  delegate_id: string
  governance_role_code: string
  scope_type: string
  scope_id: string | null
  starts_at: string
  ends_at: string
  acting_assignment: boolean
  emergency_delegation: boolean
  max_financial_limit: number | null
}

type MetricCatalog = {
  metric_code: string
  metric_name: string
  scope_type: 'department' | 'property' | 'portfolio' | 'corporate'
  category: 'financial' | 'operational' | 'guest' | 'people' | 'risk'
  default_unit: string | null
  is_required: boolean
}

type PortfolioLite = { id: string; portfolio_name: string }
type PropertyLite = { id: string; name: string }
type DepartmentLite = { id: string; name: string }

const formatAmount = (value: number | null | undefined, currency = 'USD') => {
  if (value === null || value === undefined) return '-'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}

export default function GovernanceExecutiveDashboard() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [metricForm, setMetricForm] = useState({
    metric_code: '',
    metric_date: new Date().toISOString().slice(0, 10),
    scope_type: 'property' as 'department' | 'property' | 'portfolio' | 'corporate',
    property_id: 'none',
    department_id: 'none',
    portfolio_id: 'none',
    metric_value: '',
    source_system: '',
    dimension_payload: '{}',
  })

  const propertyRollupQuery = useQuery({
    queryKey: ['gov-exec-property-rollup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_property_executive_rollup')
        .select('*')
        .order('revenue_30d', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as PropertyRollup[]
    }
  })

  const portfolioRollupQuery = useQuery({
    queryKey: ['gov-exec-portfolio-rollup'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_portfolio_executive_rollup')
        .select('*')
        .order('portfolio_revenue_30d', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as PortfolioRollup[]
    }
  })

  const deptGapQuery = useQuery({
    queryKey: ['gov-exec-department-gaps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_department_accountability_gaps')
        .select('*')
        .limit(1000)
      if (error) throw error
      return (data ?? []) as DepartmentGap[]
    }
  })

  const raciGapQuery = useQuery({
    queryKey: ['gov-exec-raci-gaps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_kpi_raci_gaps')
        .select('*')
        .limit(1000)
      if (error) throw error
      return (data ?? []) as KpiRaciGap[]
    }
  })

  const overrideEventsQuery = useQuery({
    queryKey: ['gov-exec-override-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_financial_override_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as OverrideEvent[]
    }
  })

  const activeDelegationsQuery = useQuery({
    queryKey: ['gov-exec-active-delegations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_active_delegations')
        .select('*')
        .order('starts_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as ActiveDelegation[]
    }
  })

  const metricCatalogQuery = useQuery({
    queryKey: ['gov-exec-metric-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_exec_metric_catalog')
        .select('metric_code, metric_name, scope_type, category, default_unit, is_required')
        .order('metric_code', { ascending: true })
      if (error) throw error
      return (data ?? []) as MetricCatalog[]
    }
  })

  const portfoliosQuery = useQuery({
    queryKey: ['gov-exec-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_portfolios')
        .select('id, portfolio_name')
        .eq('is_active', true)
        .order('portfolio_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as PortfolioLite[]
    }
  })

  const propertiesQuery = useQuery({
    queryKey: ['gov-exec-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as PropertyLite[]
    }
  })

  const departmentsQuery = useQuery({
    queryKey: ['gov-exec-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as DepartmentLite[]
    }
  })

  const propertyRollup = propertyRollupQuery.data ?? []
  const portfolioRollup = portfolioRollupQuery.data ?? []
  const deptGaps = deptGapQuery.data ?? []
  const raciGaps = raciGapQuery.data ?? []
  const overrideEvents = overrideEventsQuery.data ?? []
  const activeDelegations = activeDelegationsQuery.data ?? []
  const metricCatalog = metricCatalogQuery.data ?? []
  const portfolios = portfoliosQuery.data ?? []
  const properties = propertiesQuery.data ?? []
  const departments = departmentsQuery.data ?? []

  const totals = useMemo(() => {
    const totalRevenue = propertyRollup.reduce((sum, row) => sum + Number(row.revenue_30d || 0), 0)
    const totalRiskAlerts = propertyRollup.reduce((sum, row) => sum + Number(row.risk_alert_count_30d || 0), 0)
    const highGapDepartments = deptGaps.filter((gap) =>
      gap.missing_department_head || gap.missing_budget_owner || gap.missing_kpi_targets || gap.missing_accountable_raci
    ).length
    return {
      totalRevenue,
      totalRiskAlerts,
      highGapDepartments,
      overrides: overrideEvents.length,
    }
  }, [propertyRollup, deptGaps, overrideEvents.length])

  const createMetricFactMutation = useMutation({
    mutationFn: async () => {
      if (!metricForm.metric_code || !metricForm.metric_date || !metricForm.metric_value.trim()) {
        throw new Error('Metric code, date, and value are required.')
      }

      const metricValue = Number(metricForm.metric_value)
      if (!Number.isFinite(metricValue)) {
        throw new Error('Metric value must be numeric.')
      }

      let dimensionPayload: unknown = {}
      try {
        dimensionPayload = JSON.parse(metricForm.dimension_payload || '{}')
      } catch {
        throw new Error('Dimension payload must be valid JSON.')
      }

      const payload = {
        metric_code: metricForm.metric_code,
        metric_date: metricForm.metric_date,
        property_id: metricForm.scope_type === 'property' ? (metricForm.property_id === 'none' ? null : metricForm.property_id) : null,
        department_id: metricForm.scope_type === 'department' ? (metricForm.department_id === 'none' ? null : metricForm.department_id) : null,
        portfolio_id: metricForm.scope_type === 'portfolio' ? (metricForm.portfolio_id === 'none' ? null : metricForm.portfolio_id) : null,
        metric_value: metricValue,
        dimension_payload: dimensionPayload,
        source_system: metricForm.source_system.trim() || null,
      }

      if (metricForm.scope_type !== 'corporate' && !payload.property_id && !payload.department_id && !payload.portfolio_id) {
        throw new Error('Scope entity id is required for selected scope.')
      }

      const { error } = await supabase
        .from('gov_exec_metric_facts')
        .insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gov-exec-property-rollup'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-exec-portfolio-rollup'] }),
      ])
      setMetricForm({
        metric_code: '',
        metric_date: new Date().toISOString().slice(0, 10),
        scope_type: 'property',
        property_id: 'none',
        department_id: 'none',
        portfolio_id: 'none',
        metric_value: '',
        source_system: '',
        dimension_payload: '{}',
      })
      toast({ title: 'Executive metric fact recorded' })
    },
    onError: (error) => {
      toast({ title: 'Failed to record metric fact', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const hasLoadError = [
    propertyRollupQuery.error,
    portfolioRollupQuery.error,
    deptGapQuery.error,
    raciGapQuery.error,
    overrideEventsQuery.error,
    activeDelegationsQuery.error,
    metricCatalogQuery.error,
    portfoliosQuery.error,
    propertiesQuery.error,
    departmentsQuery.error,
  ].some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('governance_exec.title', 'Governance Executive Dashboard')}
        description={t('governance_exec.description', 'Portfolio and property rollups, accountability gaps, KPI ownership gaps, and live control-risk indicators.')}
      />

      {hasLoadError && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            One or more executive governance datasets failed to load.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Portfolio Revenue (30d)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatAmount(totals.totalRevenue)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Risk Alerts (30d)</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.totalRiskAlerts}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Departments with Gaps</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.highGapDepartments}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Override Events</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.overrides}</CardContent></Card>
      </div>

      <Tabs defaultValue="rollups" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-4">
          <TabsTrigger value="rollups">Rollups</TabsTrigger>
          <TabsTrigger value="gaps">Accountability Gaps</TabsTrigger>
          <TabsTrigger value="risk">Risk Signals</TabsTrigger>
          <TabsTrigger value="metrics">Metric Facts</TabsTrigger>
        </TabsList>

        <TabsContent value="rollups" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Property Executive Rollup</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Revenue 30d</TableHead><TableHead>RevPAR 30d</TableHead><TableHead>Guest Sat 30d</TableHead><TableHead>Risk Alerts</TableHead></TableRow></TableHeader>
                <TableBody>
                  {propertyRollup.map((row) => (
                    <TableRow key={row.property_id}>
                      <TableCell>{row.property_name}</TableCell>
                      <TableCell>{formatAmount(row.revenue_30d)}</TableCell>
                      <TableCell>{formatAmount(row.avg_revpar_30d)}</TableCell>
                      <TableCell>{row.avg_guest_satisfaction_30d.toFixed(2)}</TableCell>
                      <TableCell>{row.risk_alert_count_30d}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Portfolio Executive Rollup</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Portfolio</TableHead><TableHead>Properties</TableHead><TableHead>Revenue 30d</TableHead><TableHead>Avg RevPAR 30d</TableHead><TableHead>Guest Sat 30d</TableHead><TableHead>Risk Alerts</TableHead></TableRow></TableHeader>
                <TableBody>
                  {portfolioRollup.map((row) => (
                    <TableRow key={row.portfolio_id}>
                      <TableCell>{row.portfolio_name}</TableCell>
                      <TableCell>{row.property_count}</TableCell>
                      <TableCell>{formatAmount(row.portfolio_revenue_30d)}</TableCell>
                      <TableCell>{formatAmount(row.portfolio_avg_revpar_30d)}</TableCell>
                      <TableCell>{row.portfolio_guest_satisfaction_30d.toFixed(2)}</TableCell>
                      <TableCell>{row.risk_alert_count_30d}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Department Accountability Gaps</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Missing Head</TableHead><TableHead>Missing Budget Owner</TableHead><TableHead>Missing KPI Targets</TableHead><TableHead>Missing Accountable RACI</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deptGaps.map((gap) => (
                    <TableRow key={gap.department_id}>
                      <TableCell>{gap.department_name}</TableCell>
                      <TableCell>{gap.missing_department_head ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{gap.missing_budget_owner ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{gap.missing_kpi_targets ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{gap.missing_accountable_raci ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KPI RACI Gaps</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>KPI Code</TableHead><TableHead>KPI Name</TableHead><TableHead>Scope</TableHead></TableRow></TableHeader>
                <TableBody>
                  {raciGaps.map((gap) => (
                    <TableRow key={gap.kpi_id}>
                      <TableCell>{gap.kpi_code}</TableCell>
                      <TableCell>{gap.kpi_name}</TableCell>
                      <TableCell>{gap.scope_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Financial Override Events</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Amount</TableHead><TableHead>Role</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {overrideEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{new Date(event.created_at).toLocaleString()}</TableCell>
                      <TableCell>{event.action_type}</TableCell>
                      <TableCell>{formatAmount(event.amount, event.currency)}</TableCell>
                      <TableCell>{event.actor_role_code || '-'}</TableCell>
                      <TableCell>{event.override_reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active Delegations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Scope</TableHead><TableHead>Window</TableHead><TableHead>Emergency</TableHead><TableHead>Max Limit</TableHead></TableRow></TableHeader>
                <TableBody>
                  {activeDelegations.map((delegation) => (
                    <TableRow key={delegation.id}>
                      <TableCell>{delegation.governance_role_code}</TableCell>
                      <TableCell>{delegation.scope_type}</TableCell>
                      <TableCell>{new Date(delegation.starts_at).toLocaleString()} - {new Date(delegation.ends_at).toLocaleString()}</TableCell>
                      <TableCell>{delegation.emergency_delegation ? <Badge variant="destructive">Yes</Badge> : 'No'}</TableCell>
                      <TableCell>{formatAmount(delegation.max_financial_limit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Record Executive Metric Fact</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={metricForm.metric_code || 'none'} onValueChange={(value) => setMetricForm((prev) => ({ ...prev, metric_code: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select metric</SelectItem>
                    {metricCatalog.map((metric) => <SelectItem key={metric.metric_code} value={metric.metric_code}>{metric.metric_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={metricForm.metric_date} onChange={(event) => setMetricForm((prev) => ({ ...prev, metric_date: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Scope Type</Label><Select value={metricForm.scope_type} onValueChange={(value) => setMetricForm((prev) => ({ ...prev, scope_type: value as typeof metricForm.scope_type, property_id: 'none', department_id: 'none', portfolio_id: 'none' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="department">department</SelectItem><SelectItem value="property">property</SelectItem><SelectItem value="portfolio">portfolio</SelectItem><SelectItem value="corporate">corporate</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Metric Value</Label><Input type="number" step="0.0001" value={metricForm.metric_value} onChange={(event) => setMetricForm((prev) => ({ ...prev, metric_value: event.target.value }))} /></div>

              {metricForm.scope_type === 'property' && (
                <div className="space-y-2"><Label>Property</Label><Select value={metricForm.property_id} onValueChange={(value) => setMetricForm((prev) => ({ ...prev, property_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select property</SelectItem>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              )}

              {metricForm.scope_type === 'department' && (
                <div className="space-y-2"><Label>Department</Label><Select value={metricForm.department_id} onValueChange={(value) => setMetricForm((prev) => ({ ...prev, department_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select department</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              )}

              {metricForm.scope_type === 'portfolio' && (
                <div className="space-y-2"><Label>Portfolio</Label><Select value={metricForm.portfolio_id} onValueChange={(value) => setMetricForm((prev) => ({ ...prev, portfolio_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select portfolio</SelectItem>{portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent></Select></div>
              )}

              <div className="space-y-2"><Label>Source System</Label><Input value={metricForm.source_system} onChange={(event) => setMetricForm((prev) => ({ ...prev, source_system: event.target.value }))} /></div>
              <div className="xl:col-span-4 space-y-2"><Label>Dimension Payload (JSON)</Label><Textarea rows={4} value={metricForm.dimension_payload} onChange={(event) => setMetricForm((prev) => ({ ...prev, dimension_payload: event.target.value }))} /></div>
              <div className="xl:col-span-4"><Button onClick={() => createMetricFactMutation.mutate()} disabled={createMetricFactMutation.isPending}>Record Metric Fact</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
