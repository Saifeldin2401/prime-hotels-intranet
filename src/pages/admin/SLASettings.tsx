import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import { ROLES, type AppRole } from '@/lib/constants'

type RequestSlaPolicy = {
  id: string
  entity_type: string
  step_role: AppRole | null
  sla_hours: number | null
  default_priority: 'low' | 'normal' | 'high' | 'urgent' | null
  is_active: boolean
  created_at: string
}

type MaintenanceSlaPolicy = {
  id: string
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  sla_hours: number
  is_active: boolean
  created_at: string
}

const REQUEST_ENTITY_TYPES = ['leave_request', 'transfer', 'promotion', 'document'] as const
const REQUEST_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical'] as const

export default function SLASettings() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [editingRequestPolicy, setEditingRequestPolicy] = useState<RequestSlaPolicy | null>(null)
  const [editingMaintenancePolicy, setEditingMaintenancePolicy] = useState<MaintenanceSlaPolicy | null>(null)

  const [reqEntityType, setReqEntityType] = useState<string>('leave_request')
  const [reqStepRole, setReqStepRole] = useState<AppRole | 'none'>('none')
  const [reqSlaHours, setReqSlaHours] = useState<string>('48')
  const [reqPriority, setReqPriority] = useState<RequestSlaPolicy['default_priority']>('normal')
  const [reqActive, setReqActive] = useState(true)

  const [maintPriority, setMaintPriority] = useState<MaintenanceSlaPolicy['priority']>('medium')
  const [maintSlaHours, setMaintSlaHours] = useState<string>('24')
  const [maintActive, setMaintActive] = useState(true)

  const requestPoliciesQuery = useQuery({
    queryKey: ['request-sla-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_sla_policies')
        .select('*')
        .order('entity_type', { ascending: true })
        .order('step_role', { ascending: true, nullsFirst: true })

      if (error) throw error
      return data as RequestSlaPolicy[]
    }
  })

  const maintenancePoliciesQuery = useQuery({
    queryKey: ['maintenance-sla-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_sla_policies')
        .select('*')
        .order('priority', { ascending: true })

      if (error) throw error
      return data as MaintenanceSlaPolicy[]
    }
  })

  const upsertRequestPolicy = useMutation({
    mutationFn: async () => {
      const payload = {
        entity_type: reqEntityType,
        step_role: reqStepRole === 'none' ? null : reqStepRole,
        sla_hours: reqSlaHours ? Number(reqSlaHours) : null,
        default_priority: reqPriority,
        is_active: reqActive
      }

      if (editingRequestPolicy) {
        const { error } = await supabase
          .from('request_sla_policies')
          .update(payload)
          .eq('id', editingRequestPolicy.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('request_sla_policies')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-sla-policies'] })
      setEditingRequestPolicy(null)
      toast({ title: 'SLA policy saved' })
    }
  })

  const deleteRequestPolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('request_sla_policies')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-sla-policies'] })
      toast({ title: 'SLA policy deleted' })
    }
  })

  const upsertMaintenancePolicy = useMutation({
    mutationFn: async () => {
      const payload = {
        priority: maintPriority,
        sla_hours: Number(maintSlaHours),
        is_active: maintActive
      }

      if (editingMaintenancePolicy) {
        const { error } = await supabase
          .from('maintenance_sla_policies')
          .update(payload)
          .eq('id', editingMaintenancePolicy.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('maintenance_sla_policies')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-sla-policies'] })
      setEditingMaintenancePolicy(null)
      toast({ title: 'Maintenance SLA saved' })
    }
  })

  const deleteMaintenancePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_sla_policies')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-sla-policies'] })
      toast({ title: 'Maintenance SLA deleted' })
    }
  })

  const requestStats = useMemo(() => {
    const rows = requestPoliciesQuery.data || []
    const active = rows.filter(r => r.is_active).length
    return { total: rows.length, active }
  }, [requestPoliciesQuery.data])

  const maintenanceStats = useMemo(() => {
    const rows = maintenancePoliciesQuery.data || []
    const active = rows.filter(r => r.is_active).length
    return { total: rows.length, active }
  }, [maintenancePoliciesQuery.data])

  const onEditRequestPolicy = (policy: RequestSlaPolicy) => {
    setEditingRequestPolicy(policy)
    setReqEntityType(policy.entity_type)
    setReqStepRole(policy.step_role ?? 'none')
    setReqSlaHours(policy.sla_hours ? String(policy.sla_hours) : '')
    setReqPriority(policy.default_priority ?? 'normal')
    setReqActive(policy.is_active)
  }

  const onEditMaintenancePolicy = (policy: MaintenanceSlaPolicy) => {
    setEditingMaintenancePolicy(policy)
    setMaintPriority(policy.priority)
    setMaintSlaHours(String(policy.sla_hours))
    setMaintActive(policy.is_active)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sla_settings.title', 'SLA & Governance')}
        description={t('sla_settings.description', 'Manage SLA policies for requests and maintenance')}
      />

      <Tabs defaultValue="requests">
        <TabsList className="w-full h-11 bg-muted/30 p-1">
          <TabsTrigger value="requests" className="flex-1">Request SLAs</TabsTrigger>
          <TabsTrigger value="maintenance" className="flex-1">Maintenance SLAs</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{requestStats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{requestStats.active}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{editingRequestPolicy ? 'Edit Request SLA' : 'Create Request SLA'}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={reqEntityType} onValueChange={setReqEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_ENTITY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Step Role (Optional)</Label>
                <Select value={reqStepRole} onValueChange={(value) => setReqStepRole(value as AppRole | 'none')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Request level (default)</SelectItem>
                    {Object.keys(ROLES).map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SLA Hours</Label>
                <Input type="number" min="1" value={reqSlaHours} onChange={(e) => setReqSlaHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default Priority</Label>
                <Select value={reqPriority || 'normal'} onValueChange={(v) => setReqPriority(v as RequestSlaPolicy['default_priority'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_PRIORITIES.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="req-active" checked={reqActive} onCheckedChange={(checked) => setReqActive(!!checked)} />
                <Label htmlFor="req-active">Active</Label>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button onClick={() => upsertRequestPolicy.mutate()} disabled={upsertRequestPolicy.isPending}>
                  {editingRequestPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
                {editingRequestPolicy && (
                  <Button variant="outline" onClick={() => setEditingRequestPolicy(null)}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request SLA Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(requestPoliciesQuery.data || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No policies configured.</div>
              ) : (
                (requestPoliciesQuery.data || []).map(policy => (
                  <div key={policy.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
                    <div>
                      <div className="font-medium">{policy.entity_type}</div>
                      <div className="text-xs text-gray-500">
                        {policy.step_role ? `Role: ${policy.step_role}` : 'Default request SLA'} • {policy.sla_hours ?? '—'} hours
                      </div>
                      {policy.default_priority && (
                        <Badge variant="outline" className="mt-2">Priority: {policy.default_priority}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => onEditRequestPolicy(policy)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteRequestPolicy.mutate(policy.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{maintenanceStats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{maintenanceStats.active}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{editingMaintenancePolicy ? 'Edit Maintenance SLA' : 'Create Maintenance SLA'}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={maintPriority} onValueChange={(value) => setMaintPriority(value as MaintenanceSlaPolicy['priority'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_PRIORITIES.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SLA Hours</Label>
                <Input type="number" min="1" value={maintSlaHours} onChange={(e) => setMaintSlaHours(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="maint-active" checked={maintActive} onCheckedChange={(checked) => setMaintActive(!!checked)} />
                <Label htmlFor="maint-active">Active</Label>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button onClick={() => upsertMaintenancePolicy.mutate()} disabled={upsertMaintenancePolicy.isPending}>
                  {editingMaintenancePolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
                {editingMaintenancePolicy && (
                  <Button variant="outline" onClick={() => setEditingMaintenancePolicy(null)}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance SLA Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(maintenancePoliciesQuery.data || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No policies configured.</div>
              ) : (
                (maintenancePoliciesQuery.data || []).map(policy => (
                  <div key={policy.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-md p-3">
                    <div>
                      <div className="font-medium">{policy.priority}</div>
                      <div className="text-xs text-gray-500">{policy.sla_hours} hours</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => onEditMaintenancePolicy(policy)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteMaintenancePolicy.mutate(policy.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
