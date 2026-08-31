import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useDepartments } from '@/hooks/useDepartments'
import { useProperties } from '@/hooks/useProperties'
import type { RequestRow, RequestStepRow } from '@/hooks/useRequests'
import type { AppRole } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { AlertTriangle, Clock, Loader2, Shield, UserPlus, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Candidate = {
  id: string
  full_name: string | null
  email: string
  roles: AppRole[]
  property_ids: string[]
}

type DelegationRow = {
  id: string
  delegator_id: string
  delegate_id: string
  scope_type: 'property' | 'department' | 'all'
  scope_id: string | null
  start_at: string
  end_at: string
  reason?: string | null
  entity_type?: string | null
  entity_id?: string | null
  delegator?: { id: string; full_name: string | null; email: string }
  delegate?: { id: string; full_name: string | null; email: string }
}


function toLabel(role?: string | null) {
  if (!role) return 'Unknown'
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function safeDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'MMM dd, yyyy')
}

export default function RoutingHealth() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: properties = [] } = useProperties()
  const { departments = [] } = useDepartments()

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState<{
    request: RequestRow
    step: RequestStepRow | null
  } | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState('')

  const [_propertySelections, _setPropertySelections] = useState<Record<string, string>>({})

  const [delegatorId, setDelegatorId] = useState('')
  const [delegateId, setDelegateId] = useState('')
  const [scopeType, setScopeType] = useState<'all' | 'property' | 'department'>('all')
  const [scopeId, setScopeId] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [reason, setReason] = useState('')
  const [entityType, _setEntityType] = useState('')
  const [entityId, _setEntityId] = useState('')

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['routing-health', 'requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(
          `
          id,
          request_no,
          entity_type,
          entity_id,
          requester_id,
          supervisor_id,
          current_assignee_id,
          status,
          submitted_at,
          created_at,
          metadata,
          requester:profiles!requests_requester_id_fkey(id, full_name, email),
          supervisor:profiles!requests_supervisor_id_fkey(id, full_name, email),
          current_assignee:profiles!requests_current_assignee_id_fkey(id, full_name, email)
        `.trim()
        )
        .in('status', ['draft', 'pending_supervisor_approval', 'pending_hr_review', 'returned_for_correction'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as RequestRow[]
    }
  })

  const requestIds = useMemo(() => requests.map((r) => r.id), [requests])

  const { data: steps = [] } = useQuery({
    queryKey: ['routing-health', 'request-steps', requestIds],
    enabled: requestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_steps')
        .select(
          `
          id,
          request_id,
          step_order,
          assignee_id,
          assignee_role,
          status,
          acted_at,
          created_at,
          assignee:profiles!request_steps_assignee_id_fkey(id, full_name, email)
        `.trim()
        )
        .in('request_id', requestIds)
        .order('step_order', { ascending: true })

      if (error) throw error
      return (data || []) as unknown as RequestStepRow[]
    }
  })

  const { data: profiles = [] } = useQuery({
    queryKey: ['routing-health', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active, user_roles(role), user_properties(property_id)')
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      return data || []
    }
  })

  const { data: delegations = [] } = useQuery({
    queryKey: ['routing-health', 'delegations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delegations')
        .select(
          `
          id,
          delegator_id,
          delegate_id,
          scope_type,
          scope_id,
          start_at:starts_at,
          end_at:ends_at,
          reason,
          entity_type,
          entity_id,
          delegator:profiles!delegations_delegator_id_fkey(id, full_name, email),
          delegate:profiles!delegations_delegate_id_fkey(id, full_name, email)
        `.trim()
        )
        .eq('delegation_category', 'temporary_approval')
        .order('starts_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as DelegationRow[]
    }
  })

  const candidates = useMemo<Candidate[]>(() => {
    return (profiles || []).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name ?? null,
      email: profile.email,
      roles: (profile.user_roles || []).map((role) => role.role) as AppRole[],
      property_ids: (profile.user_properties || []).map((p) => p.property_id) as string[],
    }))
  }, [profiles])

  const stepsByRequest = useMemo(() => {
    const map = new Map<string, RequestStepRow[]>()
    steps.forEach((step) => {
      const list = map.get(step.request_id) || []
      list.push(step)
      map.set(step.request_id, list)
    })
    return map
  }, [steps])

  const routingIssues = useMemo(() => {
    return requests
      .map((request) => {
        const requestSteps = stepsByRequest.get(request.id) || []
        const pendingStep = requestSteps.find((s) => s.status === 'pending') || null
        const waitingStep = requestSteps.find((s) => s.status === 'waiting') || null
        const routingWarning = (request.metadata as any)?.routing_warning || {}
        const missingSupervisor = routingWarning.missing_supervisor === true
        const missingHrAssignee = routingWarning.missing_hr_assignee === true
        const missingCurrentAssignee = !request.current_assignee_id
        const pendingWithoutAssignee = pendingStep ? !pendingStep.assignee_id : false

        const hasIssue =
          missingSupervisor ||
          missingHrAssignee ||
          missingCurrentAssignee ||
          pendingWithoutAssignee

        return {
          request,
          requestSteps,
          pendingStep,
          waitingStep,
          missingSupervisor,
          missingHrAssignee,
          missingCurrentAssignee,
          pendingWithoutAssignee,
          hasIssue,
        }
      })
      .filter((row) => row.hasIssue)
  }, [requests, stepsByRequest])


  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['routing-health'] })
  }

  const assignMutation = useMutation({
    mutationFn: async (params: {
      requestId: string
      stepId?: string
      assigneeId: string
      type: 'supervisor' | 'hr'
    }) => {
      const { requestId, stepId, assigneeId, type } = params

      if (type === 'supervisor') {
        const { error } = await supabase
          .from('requests')
          .update({
            supervisor_id: assigneeId,
            current_assignee_id: assigneeId
          })
          .eq('id', requestId)
        if (error) throw error

        // If there's a pending supervisor step, update it too
        if (stepId) {
          await supabase
            .from('request_steps')
            .update({ assignee_id: assigneeId })
            .eq('id', stepId)
        }
      } else {
        // HR Assignment
        const { error } = await supabase
          .from('requests')
          .update({ current_assignee_id: assigneeId })
          .eq('id', requestId)
        if (error) throw error

        if (stepId) {
          await supabase
            .from('request_steps')
            .update({ assignee_id: assigneeId })
            .eq('id', stepId)
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Assignee updated' })
      setAssignDialogOpen(false)
      refreshAll()
    },
    onError: (err) => {
      toast({ title: 'Assignment failed', description: err.message, variant: 'destructive' })
    }
  })

  const delegationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('delegations').insert({
        delegation_category: 'temporary_approval',
        delegator_id: delegatorId,
        delegate_id: delegateId,
        scope_type: scopeType,
        scope_id: scopeId || null,
        starts_at: new Date().toISOString(),
        ends_at: addDays(new Date(), parseInt(expiryDays)).toISOString(),
        reason,
        entity_type: entityType || null,
        entity_id: entityId || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Delegation created' })
      setDelegatorId('')
      setDelegateId('')
      setReason('')
      refreshAll()
    },
    onError: (err) => {
      toast({ title: 'Failed to create delegation', description: err.message, variant: 'destructive' })
    }
  })

  const removeDelegation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delegations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Delegation removed' })
      refreshAll()
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routing Health & Delegations"
        description="Monitor request routing issues and manage temporary approval delegations."
      />

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">
            Routing Issues
            {routingIssues.length > 0 && (
              <Badge variant="destructive" className="ms-2">
                {routingIssues.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delegations">Active Delegations</TabsTrigger>
          <TabsTrigger value="tools">Maintenance Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4 pt-4">
          <div className="grid gap-4">
            {loadingRequests && <Loader2 className="animate-spin h-8 w-8 mx-auto" />}
            {!loadingRequests && routingIssues.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground font-medium">No routing issues detected.</p>
              </div>
            )}
            {routingIssues.map((row) => (
              <Card key={row.request.id} className="overflow-hidden">
                <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-bold">Request #{row.request.request_no}</p>
                      <p className="text-xs text-muted-foreground uppercase">{row.request.entity_type}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{row.request.status.replace(/_/g, ' ')}</Badge>
                </div>
                <CardContent className="p-4 bg-background">
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Requester Info</p>
                      <p>{row.request.requester?.full_name} ({row.request.requester?.email})</p>
                      <p className="text-xs text-muted-foreground">Supervisor: {row.request.supervisor?.full_name || 'MISSING'}</p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Current Status</p>
                      <div className="flex flex-col gap-1.5">
                        {row.missingSupervisor && (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Missing assigned supervisor linkage</span>
                          </div>
                        )}
                        {row.missingHrAssignee && (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            <span>No HR assignee found for property</span>
                          </div>
                        )}
                        {row.pendingWithoutAssignee && (
                          <div className="flex items-center gap-2 text-amber-600">
                            <Clock className="h-3 w-3" />
                            <span>Step {row.pendingStep?.step_order} has no assignee ID</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full mt-2"
                        onClick={() => {
                          setAssignTarget({ request: row.request, step: row.pendingStep })
                          setAssignDialogOpen(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 me-2" />
                        Fix Routing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="delegations" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Delegation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Delegator (Person away)</label>
                  <Select value={delegatorId} onValueChange={setDelegatorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delegator" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Delegate (Temporary approver)</label>
                  <Select value={delegateId} onValueChange={setDelegateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delegate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Scope</label>
                  <Select value={scopeType} onValueChange={(v) => setScopeType(v as typeof scopeType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Global (All Requests)</SelectItem>
                      <SelectItem value="property">Specific Property</SelectItem>
                      <SelectItem value="department">Specific Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {scopeType !== 'all' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Target {scopeType}</label>
                    <Select value={scopeId} onValueChange={setScopeId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopeType === 'property'
                          ? properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                          : departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Duration (Days)</label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="2">2 Days</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">1 Week</SelectItem>
                      <SelectItem value="14">2 Weeks</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Reason / Notes</label>
                <Textarea
                  placeholder="e.g. Annual leave, Sickness..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                disabled={!delegatorId || !delegateId || delegationMutation.isPending}
                onClick={() => delegationMutation.mutate()}
              >
                {delegationMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                Create Temporary Delegation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Delegations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {delegations.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No active delegations.</p>}
                {delegations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{d.delegator?.full_name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold text-hotel-gold">{d.delegate?.full_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scope: <span className="capitalize">{d.scope_type}</span> {d.scope_id ? `(${d.scope_id})` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {safeDate(d.end_at)}
                      </p>
                      {d.reason && <p className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded italic w-max">"{d.reason}"</p>}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-8 w-8"
                      onClick={() => removeDelegation.mutate(d.id)}
                      aria-label={t('accessibility.remove_delegation', 'Remove Delegation')}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Repair Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Force Refresh Routing</p>
                  <p className="text-xs text-muted-foreground">Re-run find_hr_assignee logic for all pending requests.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refreshAll()}>
                  Run Refresh
                </Button>
              </div>

              <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-destructive">Advanced Debug</p>
                    <p className="text-xs text-muted-foreground">Routing issues often occur when users are deleted or roles are changed without clearing active requests.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Approver</DialogTitle>
            <DialogDescription>
              Manually route Request #{assignTarget?.request.request_no} to an available approver.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Select Assignee</label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common:search_users")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} ({c.email}) - {c.roles.map(toLabel).join(', ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>{t('common:cancel')}</Button>
            <Button
              disabled={!selectedAssignee || assignMutation.isPending}
              onClick={() => {
                if (!assignTarget) return
                assignMutation.mutate({
                  requestId: assignTarget.request.id,
                  stepId: assignTarget.step?.id,
                  assigneeId: selectedAssignee,
                  type: assignTarget.request.status.includes('hr') ? 'hr' : 'supervisor'
                })
              }}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChevronRight(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
