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

type ProfileLite = { id: string; full_name: string | null; email: string | null }
type PropertyLite = { id: string; name: string }
type DepartmentLite = { id: string; name: string }
type GovRole = { role_code: string; role_name: string }
type PortfolioLite = { id: string; portfolio_name: string }
type OwnershipEntityLite = { id: string; display_name: string }

type KpiCatalog = {
  id: string
  kpi_code: string
  kpi_name: string
  scope_type: 'department' | 'property' | 'portfolio' | 'corporate'
  category: 'financial' | 'operational' | 'guest' | 'people' | 'risk'
  target_direction: 'higher_better' | 'lower_better' | 'range'
  unit: string | null
  is_active: boolean
  created_at: string
}

type DepartmentKpiTarget = {
  id: string
  department_id: string
  kpi_id: string
  owner_user_id: string
  target_value: number
  warning_threshold: number | null
  critical_threshold: number | null
  measurement_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  effective_from: string
  effective_to: string | null
  created_at: string
}

type KpiRaciAssignment = {
  id: string
  kpi_id: string
  scope_entity_type: 'department' | 'property' | 'portfolio' | 'corporate'
  scope_entity_id: string
  user_id: string
  raci_role: 'R' | 'A' | 'C' | 'I'
  starts_at: string
  ends_at: string | null
  created_at: string
}

type PortfolioRoleAssignment = {
  id: string
  user_id: string
  portfolio_id: string
  governance_role_code: string
  starts_at: string
  ends_at: string | null
  is_primary: boolean
  created_at: string
}

type PropertyExecutiveAssignment = {
  id: string
  user_id: string
  property_id: string
  department_id: string | null
  governance_role_code: string
  authority_scope: 'team' | 'department' | 'property' | 'cluster' | 'portfolio' | 'corporate'
  acting_for_user_id: string | null
  starts_at: string
  ends_at: string | null
  assignment_source: 'manual' | 'delegation' | 'workflow'
  created_at: string
}

type OwnerVisibilityGrant = {
  id: string
  ownership_entity_id: string
  portfolio_id: string | null
  property_id: string | null
  can_view_financial_summary: boolean
  can_view_operational_summary: boolean
  can_export: boolean
  restriction_notes: string | null
  created_by: string | null
  created_at: string
}

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toDatetimeInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

export default function GovernanceAssignments() {
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [kpiForm, setKpiForm] = useState({
    kpi_code: '',
    kpi_name: '',
    scope_type: 'department' as KpiCatalog['scope_type'],
    category: 'operational' as KpiCatalog['category'],
    target_direction: 'higher_better' as KpiCatalog['target_direction'],
    unit: '',
    is_active: true,
  })

  const [kpiTargetForm, setKpiTargetForm] = useState({
    department_id: '',
    kpi_id: '',
    owner_user_id: '',
    target_value: '',
    warning_threshold: '',
    critical_threshold: '',
    measurement_period: 'monthly' as DepartmentKpiTarget['measurement_period'],
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: '',
  })

  const [raciForm, setRaciForm] = useState({
    kpi_id: '',
    scope_entity_type: 'department' as KpiRaciAssignment['scope_entity_type'],
    scope_entity_id: '',
    user_id: '',
    raci_role: 'R' as KpiRaciAssignment['raci_role'],
    starts_at: toDatetimeInput(new Date().toISOString()),
    ends_at: '',
  })

  const [portfolioRoleForm, setPortfolioRoleForm] = useState({
    user_id: '',
    portfolio_id: '',
    governance_role_code: '',
    starts_at: toDatetimeInput(new Date().toISOString()),
    ends_at: '',
    is_primary: false,
  })

  const [propertyExecutiveForm, setPropertyExecutiveForm] = useState({
    user_id: '',
    property_id: '',
    department_id: 'none',
    governance_role_code: '',
    authority_scope: 'property' as PropertyExecutiveAssignment['authority_scope'],
    acting_for_user_id: 'none',
    starts_at: toDatetimeInput(new Date().toISOString()),
    ends_at: '',
    assignment_source: 'manual' as PropertyExecutiveAssignment['assignment_source'],
  })

  const [ownerVisibilityForm, setOwnerVisibilityForm] = useState({
    ownership_entity_id: '',
    portfolio_id: 'none',
    property_id: 'none',
    can_view_financial_summary: true,
    can_view_operational_summary: false,
    can_export: false,
    restriction_notes: '',
  })

  const profilesQuery = useQuery({
    queryKey: ['gov-assign-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name', { ascending: true }).limit(1000)
      if (error) throw error
      return (data ?? []) as ProfileLite[]
    }
  })

  const propertiesQuery = useQuery({
    queryKey: ['gov-assign-properties'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, name').order('name', { ascending: true }).limit(500)
      if (error) throw error
      return (data ?? []) as PropertyLite[]
    }
  })

  const departmentsQuery = useQuery({
    queryKey: ['gov-assign-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name').order('name', { ascending: true }).limit(1000)
      if (error) throw error
      return (data ?? []) as DepartmentLite[]
    }
  })

  const rolesQuery = useQuery({
    queryKey: ['gov-assign-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_role_catalog').select('role_code, role_name').eq('is_active', true).order('tier', { ascending: true })
      if (error) throw error
      return (data ?? []) as GovRole[]
    }
  })

  const portfoliosQuery = useQuery({
    queryKey: ['gov-assign-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_portfolios').select('id, portfolio_name').eq('is_active', true).order('portfolio_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as PortfolioLite[]
    }
  })

  const ownershipQuery = useQuery({
    queryKey: ['gov-assign-ownership'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_ownership_entities').select('id, display_name').eq('is_active', true).order('display_name', { ascending: true })
      if (error) throw error
      return (data ?? []) as OwnershipEntityLite[]
    }
  })

  const kpiCatalogQuery = useQuery({
    queryKey: ['gov-kpi-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_kpi_catalog').select('*').order('kpi_code', { ascending: true })
      if (error) throw error
      return (data ?? []) as KpiCatalog[]
    }
  })

  const kpiTargetsQuery = useQuery({
    queryKey: ['gov-kpi-targets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_department_kpi_targets').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as DepartmentKpiTarget[]
    }
  })

  const raciAssignmentsQuery = useQuery({
    queryKey: ['gov-kpi-raci-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_kpi_raci_assignments').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as KpiRaciAssignment[]
    }
  })

  const portfolioRoleAssignmentsQuery = useQuery({
    queryKey: ['gov-portfolio-role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_portfolio_role_assignments').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as PortfolioRoleAssignment[]
    }
  })

  const propertyExecutiveAssignmentsQuery = useQuery({
    queryKey: ['gov-property-executive-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_property_executive_assignments').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as PropertyExecutiveAssignment[]
    }
  })

  const ownerVisibilityQuery = useQuery({
    queryKey: ['gov-owner-visibility-grants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gov_owner_visibility_grants').select('*').order('created_at', { ascending: false }).limit(500)
      if (error) throw error
      return (data ?? []) as OwnerVisibilityGrant[]
    }
  })

  const profiles = profilesQuery.data ?? []
  const properties = propertiesQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const portfolios = portfoliosQuery.data ?? []
  const ownership = ownershipQuery.data ?? []
  const kpiCatalog = kpiCatalogQuery.data ?? []
  const kpiTargets = kpiTargetsQuery.data ?? []
  const raciAssignments = raciAssignmentsQuery.data ?? []
  const portfolioRoleAssignments = portfolioRoleAssignmentsQuery.data ?? []
  const propertyExecutiveAssignments = propertyExecutiveAssignmentsQuery.data ?? []
  const ownerVisibilityGrants = ownerVisibilityQuery.data ?? []

  const profileNameById = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name || p.email || p.id])), [profiles])
  const propertyNameById = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties])
  const departmentNameById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const roleNameByCode = useMemo(() => new Map(roles.map((r) => [r.role_code, r.role_name])), [roles])
  const portfolioNameById = useMemo(() => new Map(portfolios.map((p) => [p.id, p.portfolio_name])), [portfolios])
  const ownershipNameById = useMemo(() => new Map(ownership.map((o) => [o.id, o.display_name])), [ownership])
  const kpiNameById = useMemo(() => new Map(kpiCatalog.map((k) => [k.id, k.kpi_name])), [kpiCatalog])


  const createKpiMutation = useMutation({
    mutationFn: async () => {
      if (!kpiForm.kpi_code.trim() || !kpiForm.kpi_name.trim()) throw new Error('KPI code and name are required.')
      const { error } = await supabase.from('gov_kpi_catalog').insert({
        kpi_code: kpiForm.kpi_code.trim(),
        kpi_name: kpiForm.kpi_name.trim(),
        scope_type: kpiForm.scope_type,
        category: kpiForm.category,
        target_direction: kpiForm.target_direction,
        unit: kpiForm.unit.trim() || null,
        is_active: kpiForm.is_active,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-kpi-catalog'] })
      setKpiForm({ kpi_code: '', kpi_name: '', scope_type: 'department', category: 'operational', target_direction: 'higher_better', unit: '', is_active: true })
      toast({ title: 'KPI created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create KPI', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createKpiTargetMutation = useMutation({
    mutationFn: async () => {
      if (!kpiTargetForm.department_id || !kpiTargetForm.kpi_id || !kpiTargetForm.owner_user_id || !kpiTargetForm.target_value.trim()) {
        throw new Error('Department, KPI, owner, and target value are required.')
      }
      const targetValue = Number(kpiTargetForm.target_value)
      if (!Number.isFinite(targetValue)) throw new Error('Target value must be numeric.')
      const { error } = await supabase.from('gov_department_kpi_targets').insert({
        department_id: kpiTargetForm.department_id,
        kpi_id: kpiTargetForm.kpi_id,
        owner_user_id: kpiTargetForm.owner_user_id,
        target_value: targetValue,
        warning_threshold: parseOptionalNumber(kpiTargetForm.warning_threshold),
        critical_threshold: parseOptionalNumber(kpiTargetForm.critical_threshold),
        measurement_period: kpiTargetForm.measurement_period,
        effective_from: kpiTargetForm.effective_from,
        effective_to: kpiTargetForm.effective_to || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-kpi-targets'] })
      setKpiTargetForm({ department_id: '', kpi_id: '', owner_user_id: '', target_value: '', warning_threshold: '', critical_threshold: '', measurement_period: 'monthly', effective_from: new Date().toISOString().slice(0, 10), effective_to: '' })
      toast({ title: 'KPI target created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create KPI target', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createRaciMutation = useMutation({
    mutationFn: async () => {
      if (!raciForm.kpi_id || !raciForm.scope_entity_id || !raciForm.user_id || !raciForm.starts_at) throw new Error('KPI, scope entity, user, and start time are required.')
      const { error } = await supabase.from('gov_kpi_raci_assignments').insert({
        kpi_id: raciForm.kpi_id,
        scope_entity_type: raciForm.scope_entity_type,
        scope_entity_id: raciForm.scope_entity_id,
        user_id: raciForm.user_id,
        raci_role: raciForm.raci_role,
        starts_at: new Date(raciForm.starts_at).toISOString(),
        ends_at: raciForm.ends_at ? new Date(raciForm.ends_at).toISOString() : null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-kpi-raci-assignments'] })
      setRaciForm({ kpi_id: '', scope_entity_type: 'department', scope_entity_id: '', user_id: '', raci_role: 'R', starts_at: toDatetimeInput(new Date().toISOString()), ends_at: '' })
      toast({ title: 'RACI assignment created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create RACI assignment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createPortfolioRoleMutation = useMutation({
    mutationFn: async () => {
      if (!portfolioRoleForm.user_id || !portfolioRoleForm.portfolio_id || !portfolioRoleForm.governance_role_code || !portfolioRoleForm.starts_at) {
        throw new Error('User, portfolio, role, and start time are required.')
      }
      const { error } = await supabase.from('gov_portfolio_role_assignments').insert({
        user_id: portfolioRoleForm.user_id,
        portfolio_id: portfolioRoleForm.portfolio_id,
        governance_role_code: portfolioRoleForm.governance_role_code,
        starts_at: new Date(portfolioRoleForm.starts_at).toISOString(),
        ends_at: portfolioRoleForm.ends_at ? new Date(portfolioRoleForm.ends_at).toISOString() : null,
        is_primary: portfolioRoleForm.is_primary,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-portfolio-role-assignments'] })
      setPortfolioRoleForm({ user_id: '', portfolio_id: '', governance_role_code: '', starts_at: toDatetimeInput(new Date().toISOString()), ends_at: '', is_primary: false })
      toast({ title: 'Portfolio role assignment created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create portfolio role assignment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createPropertyExecutiveMutation = useMutation({
    mutationFn: async () => {
      if (!propertyExecutiveForm.user_id || !propertyExecutiveForm.property_id || !propertyExecutiveForm.governance_role_code || !propertyExecutiveForm.starts_at) {
        throw new Error('User, property, governance role, and start time are required.')
      }
      const { error } = await supabase.from('gov_property_executive_assignments').insert({
        user_id: propertyExecutiveForm.user_id,
        property_id: propertyExecutiveForm.property_id,
        department_id: propertyExecutiveForm.department_id === 'none' ? null : propertyExecutiveForm.department_id,
        governance_role_code: propertyExecutiveForm.governance_role_code,
        authority_scope: propertyExecutiveForm.authority_scope,
        acting_for_user_id: propertyExecutiveForm.acting_for_user_id === 'none' ? null : propertyExecutiveForm.acting_for_user_id,
        starts_at: new Date(propertyExecutiveForm.starts_at).toISOString(),
        ends_at: propertyExecutiveForm.ends_at ? new Date(propertyExecutiveForm.ends_at).toISOString() : null,
        assignment_source: propertyExecutiveForm.assignment_source,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-property-executive-assignments'] })
      setPropertyExecutiveForm({ user_id: '', property_id: '', department_id: 'none', governance_role_code: '', authority_scope: 'property', acting_for_user_id: 'none', starts_at: toDatetimeInput(new Date().toISOString()), ends_at: '', assignment_source: 'manual' })
      toast({ title: 'Property executive assignment created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create property executive assignment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createOwnerVisibilityMutation = useMutation({
    mutationFn: async () => {
      if (!ownerVisibilityForm.ownership_entity_id) throw new Error('Ownership entity is required.')
      if (ownerVisibilityForm.portfolio_id === 'none' && ownerVisibilityForm.property_id === 'none') {
        throw new Error('Portfolio or property must be selected.')
      }
      const { error } = await supabase.from('gov_owner_visibility_grants').insert({
        ownership_entity_id: ownerVisibilityForm.ownership_entity_id,
        portfolio_id: ownerVisibilityForm.portfolio_id === 'none' ? null : ownerVisibilityForm.portfolio_id,
        property_id: ownerVisibilityForm.property_id === 'none' ? null : ownerVisibilityForm.property_id,
        can_view_financial_summary: ownerVisibilityForm.can_view_financial_summary,
        can_view_operational_summary: ownerVisibilityForm.can_view_operational_summary,
        can_export: ownerVisibilityForm.can_export,
        restriction_notes: ownerVisibilityForm.restriction_notes.trim() || null,
        created_by: user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-owner-visibility-grants'] })
      setOwnerVisibilityForm({ ownership_entity_id: '', portfolio_id: 'none', property_id: 'none', can_view_financial_summary: true, can_view_operational_summary: false, can_export: false, restriction_notes: '' })
      toast({ title: 'Owner visibility grant created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create owner visibility grant', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const hasLoadError = [
    profilesQuery.error,
    propertiesQuery.error,
    departmentsQuery.error,
    rolesQuery.error,
    portfoliosQuery.error,
    ownershipQuery.error,
    kpiCatalogQuery.error,
    kpiTargetsQuery.error,
    raciAssignmentsQuery.error,
    portfolioRoleAssignmentsQuery.error,
    propertyExecutiveAssignmentsQuery.error,
    ownerVisibilityQuery.error,
  ].some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance Assignments & KPIs"
        description="Control KPI ownership (RACI), portfolio/property executive assignments, and owner visibility rules."
      />

      {hasLoadError && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            Some governance assignment data failed to load.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="kpi" className="space-y-6">
        <TabsList className="grid w-full h-auto grid-cols-2 gap-2">
          <TabsTrigger value="kpi">KPI & RACI</TabsTrigger>
          <TabsTrigger value="assignments">Executive Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create KPI Catalog Item</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>KPI Code</Label><Input value={kpiForm.kpi_code} onChange={(event) => setKpiForm((prev) => ({ ...prev, kpi_code: event.target.value }))} /></div>
              <div className="space-y-2"><Label>KPI Name</Label><Input value={kpiForm.kpi_name} onChange={(event) => setKpiForm((prev) => ({ ...prev, kpi_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Scope</Label><Select value={kpiForm.scope_type} onValueChange={(value) => setKpiForm((prev) => ({ ...prev, scope_type: value as KpiCatalog['scope_type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="department">department</SelectItem><SelectItem value="property">property</SelectItem><SelectItem value="portfolio">portfolio</SelectItem><SelectItem value="corporate">corporate</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Category</Label><Select value={kpiForm.category} onValueChange={(value) => setKpiForm((prev) => ({ ...prev, category: value as KpiCatalog['category'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="financial">financial</SelectItem><SelectItem value="operational">operational</SelectItem><SelectItem value="guest">guest</SelectItem><SelectItem value="people">people</SelectItem><SelectItem value="risk">risk</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Target Direction</Label><Select value={kpiForm.target_direction} onValueChange={(value) => setKpiForm((prev) => ({ ...prev, target_direction: value as KpiCatalog['target_direction'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="higher_better">higher_better</SelectItem><SelectItem value="lower_better">lower_better</SelectItem><SelectItem value="range">range</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={kpiForm.unit} onChange={(event) => setKpiForm((prev) => ({ ...prev, unit: event.target.value }))} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={kpiForm.is_active} onCheckedChange={(checked) => setKpiForm((prev) => ({ ...prev, is_active: checked === true }))} /><Label>Active</Label></div>
              <div className="xl:pt-7"><Button onClick={() => createKpiMutation.mutate()} disabled={createKpiMutation.isPending}>Create KPI</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Department KPI Target</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Department</Label><Select value={kpiTargetForm.department_id || 'none'} onValueChange={(value) => setKpiTargetForm((prev) => ({ ...prev, department_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select department</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>KPI</Label><Select value={kpiTargetForm.kpi_id || 'none'} onValueChange={(value) => setKpiTargetForm((prev) => ({ ...prev, kpi_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select KPI</SelectItem>{kpiCatalog.map((k) => <SelectItem key={k.id} value={k.id}>{k.kpi_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Owner</Label><Select value={kpiTargetForm.owner_user_id || 'none'} onValueChange={(value) => setKpiTargetForm((prev) => ({ ...prev, owner_user_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select owner</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Target Value</Label><Input type="number" step="0.0001" value={kpiTargetForm.target_value} onChange={(event) => setKpiTargetForm((prev) => ({ ...prev, target_value: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Warning Threshold</Label><Input type="number" step="0.0001" value={kpiTargetForm.warning_threshold} onChange={(event) => setKpiTargetForm((prev) => ({ ...prev, warning_threshold: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Critical Threshold</Label><Input type="number" step="0.0001" value={kpiTargetForm.critical_threshold} onChange={(event) => setKpiTargetForm((prev) => ({ ...prev, critical_threshold: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Measurement Period</Label><Select value={kpiTargetForm.measurement_period} onValueChange={(value) => setKpiTargetForm((prev) => ({ ...prev, measurement_period: value as DepartmentKpiTarget['measurement_period'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">daily</SelectItem><SelectItem value="weekly">weekly</SelectItem><SelectItem value="monthly">monthly</SelectItem><SelectItem value="quarterly">quarterly</SelectItem><SelectItem value="annual">annual</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={kpiTargetForm.effective_from} onChange={(event) => setKpiTargetForm((prev) => ({ ...prev, effective_from: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={kpiTargetForm.effective_to} onChange={(event) => setKpiTargetForm((prev) => ({ ...prev, effective_to: event.target.value }))} /></div>
              <div className="xl:pt-7"><Button onClick={() => createKpiTargetMutation.mutate()} disabled={createKpiTargetMutation.isPending}>Create KPI Target</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create KPI RACI Assignment</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>KPI</Label><Select value={raciForm.kpi_id || 'none'} onValueChange={(value) => setRaciForm((prev) => ({ ...prev, kpi_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select KPI</SelectItem>{kpiCatalog.map((k) => <SelectItem key={k.id} value={k.id}>{k.kpi_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Scope Type</Label><Select value={raciForm.scope_entity_type} onValueChange={(value) => setRaciForm((prev) => ({ ...prev, scope_entity_type: value as KpiRaciAssignment['scope_entity_type'], scope_entity_id: '' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="department">department</SelectItem><SelectItem value="property">property</SelectItem><SelectItem value="portfolio">portfolio</SelectItem><SelectItem value="corporate">corporate</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Scope Entity ID</Label><Input value={raciForm.scope_entity_id} onChange={(event) => setRaciForm((prev) => ({ ...prev, scope_entity_id: event.target.value }))} placeholder="UUID or corporate marker" /></div>
              <div className="space-y-2"><Label>User</Label><Select value={raciForm.user_id || 'none'} onValueChange={(value) => setRaciForm((prev) => ({ ...prev, user_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select user</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>RACI Role</Label><Select value={raciForm.raci_role} onValueChange={(value) => setRaciForm((prev) => ({ ...prev, raci_role: value as KpiRaciAssignment['raci_role'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="R">R</SelectItem><SelectItem value="A">A</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="I">I</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Starts At</Label><Input type="datetime-local" value={raciForm.starts_at} onChange={(event) => setRaciForm((prev) => ({ ...prev, starts_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Ends At</Label><Input type="datetime-local" value={raciForm.ends_at} onChange={(event) => setRaciForm((prev) => ({ ...prev, ends_at: event.target.value }))} /></div>
              <div className="xl:pt-7"><Button onClick={() => createRaciMutation.mutate()} disabled={createRaciMutation.isPending}>Create RACI Assignment</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KPI Catalog</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiCatalog.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell className="font-medium">{kpi.kpi_code}</TableCell>
                      <TableCell>{kpi.kpi_name}</TableCell>
                      <TableCell>{kpi.scope_type}</TableCell>
                      <TableCell>{kpi.category}</TableCell>
                      <TableCell>{kpi.target_direction}</TableCell>
                      <TableCell><Badge variant={kpi.is_active ? 'default' : 'outline'}>{kpi.is_active ? 'active' : 'inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!kpiCatalog.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No KPI catalog records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Department KPI Targets</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiTargets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell>{departmentNameById.get(target.department_id) || target.department_id}</TableCell>
                      <TableCell>{kpiNameById.get(target.kpi_id) || target.kpi_id}</TableCell>
                      <TableCell>{profileNameById.get(target.owner_user_id) || target.owner_user_id}</TableCell>
                      <TableCell>{target.target_value}</TableCell>
                      <TableCell>
                        W: {target.warning_threshold ?? '-'} / C: {target.critical_threshold ?? '-'}
                      </TableCell>
                      <TableCell>{target.measurement_period}</TableCell>
                      <TableCell>{target.effective_from}{target.effective_to ? ` -> ${target.effective_to}` : ''}</TableCell>
                    </TableRow>
                  ))}
                  {!kpiTargets.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No KPI target records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KPI RACI Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Scope ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>RACI</TableHead>
                    <TableHead>Window</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raciAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{kpiNameById.get(assignment.kpi_id) || assignment.kpi_id}</TableCell>
                      <TableCell>{assignment.scope_entity_type}</TableCell>
                      <TableCell>{assignment.scope_entity_id}</TableCell>
                      <TableCell>{profileNameById.get(assignment.user_id) || assignment.user_id}</TableCell>
                      <TableCell>
                        <Badge variant={assignment.raci_role === 'A' ? 'default' : 'secondary'}>{assignment.raci_role}</Badge>
                      </TableCell>
                      <TableCell>{new Date(assignment.starts_at).toLocaleString()}{assignment.ends_at ? ` -> ${new Date(assignment.ends_at).toLocaleString()}` : ''}</TableCell>
                    </TableRow>
                  ))}
                  {!raciAssignments.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No RACI assignments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Portfolio Role Assignment</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>User</Label><Select value={portfolioRoleForm.user_id || 'none'} onValueChange={(value) => setPortfolioRoleForm((prev) => ({ ...prev, user_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select user</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Portfolio</Label><Select value={portfolioRoleForm.portfolio_id || 'none'} onValueChange={(value) => setPortfolioRoleForm((prev) => ({ ...prev, portfolio_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select portfolio</SelectItem>{portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Governance Role</Label><Select value={portfolioRoleForm.governance_role_code || 'none'} onValueChange={(value) => setPortfolioRoleForm((prev) => ({ ...prev, governance_role_code: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select role</SelectItem>{roles.map((r) => <SelectItem key={r.role_code} value={r.role_code}>{r.role_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Starts At</Label><Input type="datetime-local" value={portfolioRoleForm.starts_at} onChange={(event) => setPortfolioRoleForm((prev) => ({ ...prev, starts_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Ends At</Label><Input type="datetime-local" value={portfolioRoleForm.ends_at} onChange={(event) => setPortfolioRoleForm((prev) => ({ ...prev, ends_at: event.target.value }))} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={portfolioRoleForm.is_primary} onCheckedChange={(checked) => setPortfolioRoleForm((prev) => ({ ...prev, is_primary: checked === true }))} /><Label>Primary assignment</Label></div>
              <div className="xl:pt-7"><Button onClick={() => createPortfolioRoleMutation.mutate()} disabled={createPortfolioRoleMutation.isPending}>Create Portfolio Assignment</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Property Executive Assignment</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>User</Label><Select value={propertyExecutiveForm.user_id || 'none'} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, user_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select user</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Property</Label><Select value={propertyExecutiveForm.property_id || 'none'} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, property_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select property</SelectItem>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Department (optional)</Label><Select value={propertyExecutiveForm.department_id} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, department_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No department</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Governance Role</Label><Select value={propertyExecutiveForm.governance_role_code || 'none'} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, governance_role_code: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select role</SelectItem>{roles.map((r) => <SelectItem key={r.role_code} value={r.role_code}>{r.role_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Authority Scope</Label><Select value={propertyExecutiveForm.authority_scope} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, authority_scope: value as PropertyExecutiveAssignment['authority_scope'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="team">team</SelectItem><SelectItem value="department">department</SelectItem><SelectItem value="property">property</SelectItem><SelectItem value="cluster">cluster</SelectItem><SelectItem value="portfolio">portfolio</SelectItem><SelectItem value="corporate">corporate</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Acting For (optional)</Label><Select value={propertyExecutiveForm.acting_for_user_id} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, acting_for_user_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No acting user</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Starts At</Label><Input type="datetime-local" value={propertyExecutiveForm.starts_at} onChange={(event) => setPropertyExecutiveForm((prev) => ({ ...prev, starts_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Ends At</Label><Input type="datetime-local" value={propertyExecutiveForm.ends_at} onChange={(event) => setPropertyExecutiveForm((prev) => ({ ...prev, ends_at: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Source</Label><Select value={propertyExecutiveForm.assignment_source} onValueChange={(value) => setPropertyExecutiveForm((prev) => ({ ...prev, assignment_source: value as PropertyExecutiveAssignment['assignment_source'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">manual</SelectItem><SelectItem value="delegation">delegation</SelectItem><SelectItem value="workflow">workflow</SelectItem></SelectContent></Select></div>
              <div className="xl:pt-7"><Button onClick={() => createPropertyExecutiveMutation.mutate()} disabled={createPropertyExecutiveMutation.isPending}>Create Property Executive Assignment</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Owner Visibility Grant</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Ownership Entity</Label><Select value={ownerVisibilityForm.ownership_entity_id || 'none'} onValueChange={(value) => setOwnerVisibilityForm((prev) => ({ ...prev, ownership_entity_id: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select ownership entity</SelectItem>{ownership.map((o) => <SelectItem key={o.id} value={o.id}>{o.display_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Portfolio (optional)</Label><Select value={ownerVisibilityForm.portfolio_id} onValueChange={(value) => setOwnerVisibilityForm((prev) => ({ ...prev, portfolio_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No portfolio</SelectItem>{portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.portfolio_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Property (optional)</Label><Select value={ownerVisibilityForm.property_id} onValueChange={(value) => setOwnerVisibilityForm((prev) => ({ ...prev, property_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No property</SelectItem>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2 xl:col-span-4"><Label>Restriction Notes</Label><Textarea rows={3} value={ownerVisibilityForm.restriction_notes} onChange={(event) => setOwnerVisibilityForm((prev) => ({ ...prev, restriction_notes: event.target.value }))} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={ownerVisibilityForm.can_view_financial_summary} onCheckedChange={(checked) => setOwnerVisibilityForm((prev) => ({ ...prev, can_view_financial_summary: checked === true }))} /><Label>Financial summary</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={ownerVisibilityForm.can_view_operational_summary} onCheckedChange={(checked) => setOwnerVisibilityForm((prev) => ({ ...prev, can_view_operational_summary: checked === true }))} /><Label>Operational summary</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={ownerVisibilityForm.can_export} onCheckedChange={(checked) => setOwnerVisibilityForm((prev) => ({ ...prev, can_export: checked === true }))} /><Label>Export allowed</Label></div>
              <div className="xl:pt-7"><Button onClick={() => createOwnerVisibilityMutation.mutate()} disabled={createOwnerVisibilityMutation.isPending}>Create Owner Visibility Grant</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Portfolio Role Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Window</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioRoleAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{profileNameById.get(assignment.user_id) || assignment.user_id}</TableCell>
                      <TableCell>{portfolioNameById.get(assignment.portfolio_id) || assignment.portfolio_id}</TableCell>
                      <TableCell>{roleNameByCode.get(assignment.governance_role_code) || assignment.governance_role_code}</TableCell>
                      <TableCell><Badge variant={assignment.is_primary ? 'default' : 'outline'}>{assignment.is_primary ? 'yes' : 'no'}</Badge></TableCell>
                      <TableCell>{new Date(assignment.starts_at).toLocaleString()}{assignment.ends_at ? ` -> ${new Date(assignment.ends_at).toLocaleString()}` : ''}</TableCell>
                    </TableRow>
                  ))}
                  {!portfolioRoleAssignments.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No portfolio role assignments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Property Executive Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Window</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyExecutiveAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{profileNameById.get(assignment.user_id) || assignment.user_id}</TableCell>
                      <TableCell>{propertyNameById.get(assignment.property_id) || assignment.property_id}</TableCell>
                      <TableCell>{assignment.department_id ? (departmentNameById.get(assignment.department_id) || assignment.department_id) : '-'}</TableCell>
                      <TableCell>{roleNameByCode.get(assignment.governance_role_code) || assignment.governance_role_code}</TableCell>
                      <TableCell>{assignment.authority_scope}</TableCell>
                      <TableCell>{assignment.assignment_source}</TableCell>
                      <TableCell>{new Date(assignment.starts_at).toLocaleString()}{assignment.ends_at ? ` -> ${new Date(assignment.ends_at).toLocaleString()}` : ''}</TableCell>
                    </TableRow>
                  ))}
                  {!propertyExecutiveAssignments.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No property executive assignments found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Owner Visibility Grants</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Financial</TableHead>
                    <TableHead>Operational</TableHead>
                    <TableHead>Export</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerVisibilityGrants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell>{ownershipNameById.get(grant.ownership_entity_id) || grant.ownership_entity_id}</TableCell>
                      <TableCell>{grant.portfolio_id ? (portfolioNameById.get(grant.portfolio_id) || grant.portfolio_id) : '-'}</TableCell>
                      <TableCell>{grant.property_id ? (propertyNameById.get(grant.property_id) || grant.property_id) : '-'}</TableCell>
                      <TableCell><Badge variant={grant.can_view_financial_summary ? 'default' : 'outline'}>{grant.can_view_financial_summary ? 'yes' : 'no'}</Badge></TableCell>
                      <TableCell><Badge variant={grant.can_view_operational_summary ? 'default' : 'outline'}>{grant.can_view_operational_summary ? 'yes' : 'no'}</Badge></TableCell>
                      <TableCell><Badge variant={grant.can_export ? 'default' : 'outline'}>{grant.can_export ? 'yes' : 'no'}</Badge></TableCell>
                      <TableCell className="max-w-[280px] truncate">{grant.restriction_notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!ownerVisibilityGrants.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">No owner visibility grants found.</TableCell>
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
