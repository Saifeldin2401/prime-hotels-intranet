import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Severity = 'low' | 'medium' | 'high' | 'critical'
type IncidentCategory = 'safety' | 'security' | 'financial' | 'operational' | 'guest' | 'regulatory' | 'technology' | 'other'
type IncidentStatus = 'open' | 'triaged' | 'contained' | 'resolved' | 'closed'
type EscalationStatus = 'pending' | 'acknowledged' | 'actioned' | 'skipped' | 'expired'
type DelegationScope = 'department' | 'property' | 'cluster' | 'portfolio' | 'corporate'

type ProfileLite = { id: string; full_name: string | null; email: string | null }
type PropertyLite = { id: string; name: string }
type DepartmentLite = { id: string; name: string }
type GovRole = { role_code: string; role_name: string; tier: number }

type IncidentReport = {
  id: string
  incident_no: number
  property_id: string | null
  department_id: string | null
  reported_by: string
  current_owner_id: string | null
  severity: Severity
  category: IncidentCategory
  status: IncidentStatus
  summary: string
  details: string | null
  occurred_at: string
  reported_at: string
  resolved_at: string | null
  closed_at: string | null
  risk_score: number | null
  created_at: string
}

type IncidentEscalation = {
  id: string
  incident_id: string
  escalation_level: number
  target_role_code: string | null
  target_user_id: string | null
  due_at: string | null
  acknowledged_at: string | null
  actioned_at: string | null
  status: EscalationStatus
  escalation_reason: string | null
  created_at: string
}

type Delegation = {
  id: string
  delegator_id: string
  delegate_id: string
  governance_role_code: string
  scope_type: DelegationScope
  scope_id: string | null
  starts_at: string
  ends_at: string
  acting_assignment: boolean
  emergency_delegation: boolean
  max_financial_limit: number | null
  delegation_reason: string | null
  revoked_at: string | null
  revoked_by: string | null
  created_at: string
}

type ActiveDelegationView = {
  id: string
  delegator_id: string
  delegate_id: string
  governance_role_code: string
  scope_type: DelegationScope
  scope_id: string | null
  starts_at: string
  ends_at: string
  acting_assignment: boolean
  emergency_delegation: boolean
  max_financial_limit: number | null
}

type ControlAuditLog = {
  id: string
  event_type: string
  severity: 'info' | 'warning' | 'critical'
  actor_id: string | null
  subject_user_id: string | null
  scope_type: string | null
  scope_id: string | null
  entity_table: string
  entity_id: string | null
  reason: string | null
  event_at: string
}

type SoDConflict = {
  user_id: string
  has_owner_observer_role: boolean
  has_operational_role: boolean
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

const severityOptions: Severity[] = ['low', 'medium', 'high', 'critical']
const categoryOptions: IncidentCategory[] = ['safety', 'security', 'financial', 'operational', 'guest', 'regulatory', 'technology', 'other']
const incidentStatusOptions: IncidentStatus[] = ['open', 'triaged', 'contained', 'resolved', 'closed']
const escalationStatusOptions: EscalationStatus[] = ['pending', 'acknowledged', 'actioned', 'skipped', 'expired']
const delegationScopeOptions: DelegationScope[] = ['department', 'property', 'cluster', 'portfolio', 'corporate']

const toDatetimeInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function GovernanceRisk() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [incidentForm, setIncidentForm] = useState({
    property_id: 'none',
    department_id: 'none',
    severity: 'medium' as Severity,
    category: 'operational' as IncidentCategory,
    summary: '',
    details: '',
    occurred_at: toDatetimeInput(new Date().toISOString()),
    risk_score: '',
  })

  const [escalationForm, setEscalationForm] = useState({
    incident_id: '',
    escalation_level: '1',
    target_role_code: 'none',
    target_user_id: 'none',
    due_at: '',
    status: 'pending' as EscalationStatus,
    escalation_reason: '',
  })

  const [delegationForm, setDelegationForm] = useState({
    delegator_id: '',
    delegate_id: '',
    governance_role_code: '',
    scope_type: 'corporate' as DelegationScope,
    scope_id: 'none',
    starts_at: toDatetimeInput(new Date().toISOString()),
    ends_at: toDatetimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    acting_assignment: false,
    emergency_delegation: false,
    max_financial_limit: '',
    delegation_reason: '',
  })

  const [revokeReason, setRevokeReason] = useState('')
  const [auditEventFilter, setAuditEventFilter] = useState('all')
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all')
  const [incidentStatusDraft, setIncidentStatusDraft] = useState<Record<string, IncidentStatus>>({})

  const profilesQuery = useQuery({
    queryKey: ['gov-risk-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
        .limit(1000)
      if (error) throw error
      return (data ?? []) as ProfileLite[]
    }
  })

  const propertiesQuery = useQuery({
    queryKey: ['gov-risk-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(500)
      if (error) throw error
      return (data ?? []) as PropertyLite[]
    }
  })

  const departmentsQuery = useQuery({
    queryKey: ['gov-risk-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(1000)
      if (error) throw error
      return (data ?? []) as DepartmentLite[]
    }
  })

  const rolesQuery = useQuery({
    queryKey: ['gov-risk-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_role_catalog')
        .select('role_code, role_name, tier')
        .eq('is_active', true)
        .order('tier', { ascending: true })
      if (error) throw error
      return (data ?? []) as GovRole[]
    }
  })

  const incidentsQuery = useQuery({
    queryKey: ['gov-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_incident_reports')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as IncidentReport[]
    }
  })

  const escalationsQuery = useQuery({
    queryKey: ['gov-incident-escalations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_incident_escalation_chain')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as IncidentEscalation[]
    }
  })

  const delegationsQuery = useQuery({
    queryKey: ['gov-authority-delegations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_authority_delegations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as Delegation[]
    }
  })

  const activeDelegationsQuery = useQuery({
    queryKey: ['gov-active-delegations-view'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_active_delegations')
        .select('*')
        .order('starts_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as ActiveDelegationView[]
    }
  })

  const auditLogQuery = useQuery({
    queryKey: ['gov-control-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_control_audit_log')
        .select('id, event_type, severity, actor_id, subject_user_id, scope_type, scope_id, entity_table, entity_id, reason, event_at')
        .order('event_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as ControlAuditLog[]
    }
  })

  const sodConflictQuery = useQuery({
    queryKey: ['gov-sod-conflicts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_v_separation_of_duties_conflicts')
        .select('*')
        .limit(200)
      if (error) throw error
      return (data ?? []) as SoDConflict[]
    }
  })

  const overrideEventsQuery = useQuery({
    queryKey: ['gov-financial-override-events-view'],
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

  const profiles = profilesQuery.data ?? []
  const properties = propertiesQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const incidents = incidentsQuery.data ?? []
  const delegations = delegationsQuery.data ?? []
  const activeDelegations = activeDelegationsQuery.data ?? []
  const auditLog = auditLogQuery.data ?? []
  const sodConflicts = sodConflictQuery.data ?? []
  const overrideEvents = overrideEventsQuery.data ?? []

  const profileNameById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.full_name || profile.email || profile.id])),
    [profiles]
  )
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.role_code, role.role_name])), [roles])


  const filteredAudit = useMemo(() => {
    return auditLog.filter((entry) => {
      if (auditEventFilter !== 'all' && entry.event_type !== auditEventFilter) return false
      if (auditSeverityFilter !== 'all' && entry.severity !== auditSeverityFilter) return false
      return true
    })
  }, [auditLog, auditEventFilter, auditSeverityFilter])

  const invalidateRiskQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['gov-incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-incident-escalations'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-authority-delegations'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-active-delegations-view'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-control-audit-log'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-sod-conflicts'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-financial-override-events-view'] }),
    ])
  }

  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!incidentForm.summary.trim() || !incidentForm.occurred_at) {
        throw new Error('Summary and occurred-at time are required.')
      }
      const payload = {
        property_id: incidentForm.property_id === 'none' ? null : incidentForm.property_id,
        department_id: incidentForm.department_id === 'none' ? null : incidentForm.department_id,
        reported_by: user?.id,
        severity: incidentForm.severity,
        category: incidentForm.category,
        status: 'open' as IncidentStatus,
        summary: incidentForm.summary.trim(),
        details: incidentForm.details.trim() || null,
        occurred_at: new Date(incidentForm.occurred_at).toISOString(),
        risk_score: parseOptionalNumber(incidentForm.risk_score),
      }
      const { error } = await supabase.from('gov_incident_reports').insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-incidents'] })
      setIncidentForm({
        property_id: 'none',
        department_id: 'none',
        severity: 'medium',
        category: 'operational',
        summary: '',
        details: '',
        occurred_at: toDatetimeInput(new Date().toISOString()),
        risk_score: '',
      })
      toast({ title: 'Incident created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create incident', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const updateIncidentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IncidentStatus }) => {
      const payload: Partial<IncidentReport> & { updated_at?: string } = { status, updated_at: new Date().toISOString() }
      if (status === 'resolved') payload.resolved_at = new Date().toISOString()
      if (status === 'closed') payload.closed_at = new Date().toISOString()

      const { error } = await supabase
        .from('gov_incident_reports')
        .update(payload)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-incidents'] })
      toast({ title: 'Incident status updated' })
    },
    onError: (error) => {
      toast({ title: 'Failed to update incident', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createEscalationMutation = useMutation({
    mutationFn: async () => {
      if (!escalationForm.incident_id || !escalationForm.escalation_level) {
        throw new Error('Incident and escalation level are required.')
      }
      const level = Number(escalationForm.escalation_level)
      if (!Number.isFinite(level) || level < 1) {
        throw new Error('Escalation level must be >= 1.')
      }

      const payload = {
        incident_id: escalationForm.incident_id,
        escalation_level: level,
        target_role_code: escalationForm.target_role_code === 'none' ? null : escalationForm.target_role_code,
        target_user_id: escalationForm.target_user_id === 'none' ? null : escalationForm.target_user_id,
        due_at: escalationForm.due_at ? new Date(escalationForm.due_at).toISOString() : null,
        status: escalationForm.status,
        escalation_reason: escalationForm.escalation_reason.trim() || null,
      }

      const { error } = await supabase.from('gov_incident_escalation_chain').insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-incident-escalations'] })
      setEscalationForm({
        incident_id: '',
        escalation_level: '1',
        target_role_code: 'none',
        target_user_id: 'none',
        due_at: '',
        status: 'pending',
        escalation_reason: '',
      })
      toast({ title: 'Escalation step added' })
    },
    onError: (error) => {
      toast({ title: 'Failed to add escalation step', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createDelegationMutation = useMutation({
    mutationFn: async () => {
      if (!delegationForm.delegator_id || !delegationForm.delegate_id || !delegationForm.governance_role_code) {
        throw new Error('Delegator, delegate, and role are required.')
      }
      if (!delegationForm.starts_at || !delegationForm.ends_at) {
        throw new Error('Start and end time are required.')
      }
      const startsAt = new Date(delegationForm.starts_at).toISOString()
      const endsAt = new Date(delegationForm.ends_at).toISOString()
      if (new Date(endsAt) <= new Date(startsAt)) {
        throw new Error('End time must be after start time.')
      }

      const payload = {
        delegator_id: delegationForm.delegator_id,
        delegate_id: delegationForm.delegate_id,
        governance_role_code: delegationForm.governance_role_code,
        scope_type: delegationForm.scope_type,
        scope_id: delegationForm.scope_type === 'corporate' ? null : (delegationForm.scope_id === 'none' ? null : delegationForm.scope_id),
        starts_at: startsAt,
        ends_at: endsAt,
        acting_assignment: delegationForm.acting_assignment,
        emergency_delegation: delegationForm.emergency_delegation,
        max_financial_limit: parseOptionalNumber(delegationForm.max_financial_limit),
        delegation_reason: delegationForm.delegation_reason.trim() || null,
      }

      const { error } = await supabase.from('gov_authority_delegations').insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gov-authority-delegations'] }),
        queryClient.invalidateQueries({ queryKey: ['gov-active-delegations-view'] }),
      ])
      setDelegationForm({
        delegator_id: '',
        delegate_id: '',
        governance_role_code: '',
        scope_type: 'corporate',
        scope_id: 'none',
        starts_at: toDatetimeInput(new Date().toISOString()),
        ends_at: toDatetimeInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        acting_assignment: false,
        emergency_delegation: false,
        max_financial_limit: '',
        delegation_reason: '',
      })
      toast({ title: 'Delegation created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create delegation', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const revokeDelegationMutation = useMutation({
    mutationFn: async (delegationId: string) => {
      const { error } = await supabase.rpc('gov_revoke_delegation', {
        p_delegation_id: delegationId,
        p_reason: revokeReason || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateRiskQueries()
      toast({ title: 'Delegation revoked' })
    },
    onError: (error) => {
      toast({ title: 'Failed to revoke delegation', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const expireDelegationsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('gov_expire_delegations', {
        p_reference_time: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateRiskQueries()
      toast({ title: 'Expired delegations processed' })
    },
    onError: (error) => {
      toast({ title: 'Failed to expire delegations', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const hasLoadError = [
    profilesQuery.error,
    propertiesQuery.error,
    departmentsQuery.error,
    rolesQuery.error,
    incidentsQuery.error,
    escalationsQuery.error,
    delegationsQuery.error,
    activeDelegationsQuery.error,
    auditLogQuery.error,
    sodConflictQuery.error,
    overrideEventsQuery.error,
  ].some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('governance_risk.title', 'Governance Risk & Compliance')}
        description={t('governance_risk.description', 'Incident escalation, delegation authority, control audit trail, and separation-of-duties monitoring.')}
      />

      {hasLoadError && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            Some governance risk data failed to load. Verify role permissions and governance RLS policies.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="incidents" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
          <TabsTrigger value="incidents">Incidents & Escalation</TabsTrigger>
          <TabsTrigger value="delegations">Delegations</TabsTrigger>
          <TabsTrigger value="audit">Control Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Incident</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={incidentForm.property_id} onValueChange={(value) => setIncidentForm((prev) => ({ ...prev, property_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={incidentForm.department_id} onValueChange={(value) => setIncidentForm((prev) => ({ ...prev, department_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Severity</Label><Select value={incidentForm.severity} onValueChange={(value) => setIncidentForm((prev) => ({ ...prev, severity: value as Severity }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{severityOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Category</Label><Select value={incidentForm.category} onValueChange={(value) => setIncidentForm((prev) => ({ ...prev, category: value as IncidentCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2 xl:col-span-4"><Label>Summary</Label><Input value={incidentForm.summary} onChange={(event) => setIncidentForm((prev) => ({ ...prev, summary: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2 xl:col-span-4"><Label>Details</Label><Textarea rows={4} value={incidentForm.details} onChange={(event) => setIncidentForm((prev) => ({ ...prev, details: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Occurred At</Label><Input type="datetime-local" value={incidentForm.occurred_at} onChange={(event) => setIncidentForm((prev) => ({ ...prev, occurred_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Risk Score (0-100)</Label><Input type="number" min="0" max="100" step="0.01" value={incidentForm.risk_score} onChange={(event) => setIncidentForm((prev) => ({ ...prev, risk_score: event.target.value }))} /></div>
              <div className="xl:pt-7"><Button onClick={() => createIncidentMutation.mutate()} disabled={createIncidentMutation.isPending}>Create Incident</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Incident Escalation Step</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Incident</Label><Select value={escalationForm.incident_id || 'none'} onValueChange={(value) => setEscalationForm((prev) => ({ ...prev, incident_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Select incident" /></SelectTrigger><SelectContent><SelectItem value="none">Select incident</SelectItem>{incidents.map((i) => <SelectItem key={i.id} value={i.id}>#{i.incident_no} - {i.summary}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Level</Label><Input type="number" min="1" value={escalationForm.escalation_level} onChange={(event) => setEscalationForm((prev) => ({ ...prev, escalation_level: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Target Role</Label><Select value={escalationForm.target_role_code} onValueChange={(value) => setEscalationForm((prev) => ({ ...prev, target_role_code: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{roles.map((role) => <SelectItem key={role.role_code} value={role.role_code}>{role.role_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Target User</Label><Select value={escalationForm.target_user_id} onValueChange={(value) => setEscalationForm((prev) => ({ ...prev, target_user_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email || profile.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Due At</Label><Input type="datetime-local" value={escalationForm.due_at} onChange={(event) => setEscalationForm((prev) => ({ ...prev, due_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={escalationForm.status} onValueChange={(value) => setEscalationForm((prev) => ({ ...prev, status: value as EscalationStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{escalationStatusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Reason</Label><Input value={escalationForm.escalation_reason} onChange={(event) => setEscalationForm((prev) => ({ ...prev, escalation_reason: event.target.value }))} /></div>
              <div className="xl:pt-7"><Button onClick={() => createEscalationMutation.mutate()} disabled={createEscalationMutation.isPending}>Add Escalation</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Incidents</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Summary</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {incidents.map((incident) => {
                    const draftStatus = incidentStatusDraft[incident.id] || incident.status
                    return (
                      <TableRow key={incident.id}>
                        <TableCell>{incident.incident_no}</TableCell>
                        <TableCell>{incident.summary}</TableCell>
                        <TableCell><Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>{incident.severity}</Badge></TableCell>
                        <TableCell>
                          <Select value={draftStatus} onValueChange={(value) => setIncidentStatusDraft((prev) => ({ ...prev, [incident.id]: value as IncidentStatus }))}>
                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{incidentStatusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{incident.current_owner_id ? (profileNameById.get(incident.current_owner_id) || incident.current_owner_id) : '-'}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => updateIncidentStatusMutation.mutate({ id: incident.id, status: draftStatus })} disabled={updateIncidentStatusMutation.isPending}>Update</Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegations" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Delegation</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Delegator</Label><Select value={delegationForm.delegator_id || 'none'} onValueChange={(value) => setDelegationForm((prev) => ({ ...prev, delegator_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Select delegator" /></SelectTrigger><SelectContent><SelectItem value="none">Select delegator</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Delegate</Label><Select value={delegationForm.delegate_id || 'none'} onValueChange={(value) => setDelegationForm((prev) => ({ ...prev, delegate_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Select delegate" /></SelectTrigger><SelectContent><SelectItem value="none">Select delegate</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Role</Label><Select value={delegationForm.governance_role_code || 'none'} onValueChange={(value) => setDelegationForm((prev) => ({ ...prev, governance_role_code: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent><SelectItem value="none">Select role</SelectItem>{roles.map((r) => <SelectItem key={r.role_code} value={r.role_code}>{r.role_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Scope Type</Label><Select value={delegationForm.scope_type} onValueChange={(value) => setDelegationForm((prev) => ({ ...prev, scope_type: value as DelegationScope, scope_id: 'none' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{delegationScopeOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Scope Entity ID</Label><Input value={delegationForm.scope_id === 'none' ? '' : delegationForm.scope_id} onChange={(event) => setDelegationForm((prev) => ({ ...prev, scope_id: event.target.value || 'none' }))} placeholder="UUID for scope entity" /></div>
              <div className="space-y-2"><Label>Starts At</Label><Input type="datetime-local" value={delegationForm.starts_at} onChange={(event) => setDelegationForm((prev) => ({ ...prev, starts_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Ends At</Label><Input type="datetime-local" value={delegationForm.ends_at} onChange={(event) => setDelegationForm((prev) => ({ ...prev, ends_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Max Financial Limit</Label><Input type="number" step="0.01" min="0" value={delegationForm.max_financial_limit} onChange={(event) => setDelegationForm((prev) => ({ ...prev, max_financial_limit: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2 xl:col-span-4"><Label>Delegation Reason</Label><Input value={delegationForm.delegation_reason} onChange={(event) => setDelegationForm((prev) => ({ ...prev, delegation_reason: event.target.value }))} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={delegationForm.acting_assignment} onCheckedChange={(checked) => setDelegationForm((prev) => ({ ...prev, acting_assignment: checked === true }))} /><Label>Acting Assignment</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={delegationForm.emergency_delegation} onCheckedChange={(checked) => setDelegationForm((prev) => ({ ...prev, emergency_delegation: checked === true }))} /><Label>Emergency Delegation</Label></div>
              <div className="xl:pt-7"><Button onClick={() => createDelegationMutation.mutate()} disabled={createDelegationMutation.isPending}>Create Delegation</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <CardTitle>Delegation Actions</CardTitle>
              <div className="w-full md:w-96 space-y-2">
                <Label>Revoke reason (optional)</Label>
                <Input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} placeholder="Reason for revocation" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={() => expireDelegationsMutation.mutate()} disabled={expireDelegationsMutation.isPending}>Expire Past Delegations</Button>
              <Table>
                <TableHeader><TableRow><TableHead>Delegator</TableHead><TableHead>Delegate</TableHead><TableHead>Role</TableHead><TableHead>Window</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {delegations.map((delegation) => {
                    const isRevoked = Boolean(delegation.revoked_at)
                    return (
                      <TableRow key={delegation.id}>
                        <TableCell>{profileNameById.get(delegation.delegator_id) || delegation.delegator_id}</TableCell>
                        <TableCell>{profileNameById.get(delegation.delegate_id) || delegation.delegate_id}</TableCell>
                        <TableCell>{roleNameByCode.get(delegation.governance_role_code) || delegation.governance_role_code}</TableCell>
                        <TableCell>{new Date(delegation.starts_at).toLocaleString()} - {new Date(delegation.ends_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={isRevoked ? 'secondary' : 'default'}>{isRevoked ? 'Revoked' : 'Active/Planned'}</Badge></TableCell>
                        <TableCell>
                          {!isRevoked && (
                            <Button size="sm" variant="destructive" onClick={() => revokeDelegationMutation.mutate(delegation.id)} disabled={revokeDelegationMutation.isPending}>Revoke</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active Delegations View</CardTitle></CardHeader>
            <CardContent className="text-sm">Currently active delegations: <span className="font-semibold">{activeDelegations.length}</span></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Control Audit Filters</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={auditEventFilter} onValueChange={setAuditEventFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {[...new Set(auditLog.map((a) => a.event_type))].map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>{eventType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={auditSeverityFilter} onValueChange={(value) => setAuditSeverityFilter(value as typeof auditSeverityFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Control Audit Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Severity</TableHead><TableHead>Actor</TableHead><TableHead>Entity</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredAudit.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.event_at).toLocaleString()}</TableCell>
                      <TableCell>{entry.event_type}</TableCell>
                      <TableCell><Badge variant={entry.severity === 'critical' ? 'destructive' : 'secondary'}>{entry.severity}</Badge></TableCell>
                      <TableCell>{entry.actor_id ? (profileNameById.get(entry.actor_id) || entry.actor_id) : '-'}</TableCell>
                      <TableCell>{entry.entity_table}</TableCell>
                      <TableCell>{entry.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Separation of Duties Conflicts</CardTitle></CardHeader>
              <CardContent>
                {sodConflicts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No SoD conflicts detected.</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {sodConflicts.map((conflict) => (
                      <div key={conflict.user_id} className="rounded border p-2">
                        {profileNameById.get(conflict.user_id) || conflict.user_id}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financial Override Events</CardTitle></CardHeader>
              <CardContent>
                {overrideEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No financial override events.</div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {overrideEvents.slice(0, 20).map((event) => (
                      <div key={event.id} className="rounded border p-2">
                        <div className="font-medium">{event.action_type} - {event.entity_type}</div>
                        <div className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</div>
                        <div className="text-muted-foreground">{event.override_reason || 'No reason'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
