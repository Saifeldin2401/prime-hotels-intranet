import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type GovFeatureFlag = {
  flag_key: string
  is_enabled: boolean
  description: string | null
  updated_by: string | null
  updated_at: string
}

type GovRole = {
  role_code: string
  role_name: string
  tier: number
  authority_scope: string
}

type ScopeType = 'department' | 'property' | 'cluster' | 'portfolio' | 'corporate'
type OwnerType = 'owner' | 'investor' | 'management_company' | 'joint_venture'
type PayrollScope = 'none' | 'department_head_only' | 'hr_only' | 'gm_and_hr' | 'corporate_only'
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

type ProfileLite = {
  id: string
  full_name: string | null
  email: string | null
}

type PropertyLite = {
  id: string
  name: string
}

type DepartmentLite = {
  id: string
  name: string
  property_id: string | null
}

type UserRoleAssignment = {
  id: string
  user_id: string
  governance_role_code: string
  scope_type: ScopeType
  scope_id: string | null
  starts_at: string
  ends_at: string | null
  is_primary: boolean
  assignment_reason: string | null
  created_at: string
}

type OwnershipEntity = {
  id: string
  legal_name: string
  display_name: string
  owner_type: OwnerType
  country_code: string | null
  is_active: boolean
  created_at: string
}

type Portfolio = {
  id: string
  ownership_entity_id: string
  portfolio_code: string
  portfolio_name: string
  reporting_currency: string
  is_active: boolean
  created_at: string
}

type PropertyPortfolio = {
  id: string
  property_id: string
  portfolio_id: string
  effective_from: string
  effective_to: string | null
  created_at: string
}

type PropertyCluster = {
  id: string
  portfolio_id: string
  cluster_code: string
  cluster_name: string
  area_label: string | null
  is_active: boolean
  created_at: string
}

type ClusterProperty = {
  id: string
  cluster_id: string
  property_id: string
  effective_from: string
  effective_to: string | null
  created_at: string
}

type DepartmentGovernance = {
  id: string
  department_id: string
  head_user_id: string | null
  cost_center_code: string | null
  budget_owner_user_id: string | null
  payroll_visibility_scope: PayrollScope
  revenue_generating: boolean
  annual_revenue_target: number | null
  annual_opex_budget: number | null
  annual_capex_budget: number | null
  risk_level: RiskLevel
  risk_flags: unknown
  created_at: string
  updated_at: string
}

const scopeOptions: ScopeType[] = ['department', 'property', 'cluster', 'portfolio', 'corporate']
const ownerTypeOptions: OwnerType[] = ['owner', 'investor', 'management_company', 'joint_venture']
const payrollScopeOptions: PayrollScope[] = ['none', 'department_head_only', 'hr_only', 'gm_and_hr', 'corporate_only']
const riskLevelOptions: RiskLevel[] = ['low', 'medium', 'high', 'critical']

const toIsoOrNull = (value: string) => {
  if (!value) return null
  return new Date(value).toISOString()
}

const toDatetimeInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

export default function GovernanceControls() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [flagReason, setFlagReason] = useState('')

  const [assignmentForm, setAssignmentForm] = useState({
    user_id: '',
    governance_role_code: '',
    scope_type: 'corporate' as ScopeType,
    scope_id: 'none',
    starts_at: toDatetimeInput(new Date().toISOString()),
    ends_at: '',
    is_primary: false,
    assignment_reason: '',
  })

  const [ownershipForm, setOwnershipForm] = useState({
    legal_name: '',
    display_name: '',
    owner_type: 'owner' as OwnerType,
    country_code: '',
  })

  const [portfolioForm, setPortfolioForm] = useState({
    ownership_entity_id: '',
    portfolio_code: '',
    portfolio_name: '',
    reporting_currency: 'USD',
  })

  const [propertyPortfolioForm, setPropertyPortfolioForm] = useState({
    property_id: '',
    portfolio_id: '',
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: '',
  })

  const [clusterForm, setClusterForm] = useState({
    portfolio_id: '',
    cluster_code: '',
    cluster_name: '',
    area_label: '',
  })

  const [clusterPropertyForm, setClusterPropertyForm] = useState({
    cluster_id: '',
    property_id: '',
    effective_from: new Date().toISOString().slice(0, 10),
    effective_to: '',
  })

  const [departmentForm, setDepartmentForm] = useState({
    department_id: '',
    head_user_id: 'none',
    cost_center_code: '',
    budget_owner_user_id: 'none',
    payroll_visibility_scope: 'gm_and_hr' as PayrollScope,
    revenue_generating: false,
    annual_revenue_target: '',
    annual_opex_budget: '',
    annual_capex_budget: '',
    risk_level: 'medium' as RiskLevel,
    risk_flags_text: '[]',
  })

  const profilesQuery = useQuery({
    queryKey: ['gov-controls-profiles'],
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

  const rolesQuery = useQuery({
    queryKey: ['gov-controls-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_role_catalog')
        .select('role_code, role_name, tier, authority_scope')
        .eq('is_active', true)
        .order('tier', { ascending: true })

      if (error) throw error
      return (data ?? []) as GovRole[]
    }
  })

  const featureFlagsQuery = useQuery({
    queryKey: ['gov-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_feature_flags')
        .select('*')
        .order('flag_key', { ascending: true })

      if (error) throw error
      return (data ?? []) as GovFeatureFlag[]
    }
  })

  const assignmentsQuery = useQuery({
    queryKey: ['gov-role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_user_role_assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return (data ?? []) as UserRoleAssignment[]
    }
  })

  const propertiesQuery = useQuery({
    queryKey: ['gov-controls-properties'],
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
    queryKey: ['gov-controls-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property_id')
        .order('name', { ascending: true })
        .limit(1000)

      if (error) throw error
      return (data ?? []) as DepartmentLite[]
    }
  })

  const ownershipEntitiesQuery = useQuery({
    queryKey: ['gov-ownership-entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_ownership_entities')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as OwnershipEntity[]
    }
  })

  const portfoliosQuery = useQuery({
    queryKey: ['gov-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_portfolios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Portfolio[]
    }
  })

  const propertyPortfoliosQuery = useQuery({
    queryKey: ['gov-property-portfolios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_property_portfolios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return (data ?? []) as PropertyPortfolio[]
    }
  })

  const clustersQuery = useQuery({
    queryKey: ['gov-property-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_property_clusters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as PropertyCluster[]
    }
  })

  const clusterPropertiesQuery = useQuery({
    queryKey: ['gov-cluster-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_cluster_properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return (data ?? []) as ClusterProperty[]
    }
  })

  const departmentGovernanceQuery = useQuery({
    queryKey: ['gov-department-governance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_department_governance')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as DepartmentGovernance[]
    }
  })

  const profiles = profilesQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const featureFlags = featureFlagsQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []
  const properties = propertiesQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const ownershipEntities = ownershipEntitiesQuery.data ?? []
  const portfolios = portfoliosQuery.data ?? []
  const propertyPortfolios = propertyPortfoliosQuery.data ?? []
  const clusters = clustersQuery.data ?? []
  const clusterProperties = clusterPropertiesQuery.data ?? []
  const departmentGovernance = departmentGovernanceQuery.data ?? []

  const profileNameById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile.full_name || profile.email || profile.id])),
    [profiles]
  )
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.role_code, role.role_name])), [roles])
  const propertyNameById = useMemo(() => new Map(properties.map((property) => [property.id, property.name])), [properties])
  const departmentNameById = useMemo(() => new Map(departments.map((department) => [department.id, department.name])), [departments])
  const ownershipNameById = useMemo(
    () => new Map(ownershipEntities.map((entity) => [entity.id, entity.display_name])),
    [ownershipEntities]
  )
  const portfolioNameById = useMemo(() => new Map(portfolios.map((portfolio) => [portfolio.id, portfolio.portfolio_name])), [portfolios])
  const clusterNameById = useMemo(() => new Map(clusters.map((cluster) => [cluster.id, cluster.cluster_name])), [clusters])

  const departmentGovernanceByDepartment = useMemo(() => {
    const map = new Map<string, DepartmentGovernance>()
    for (const row of departmentGovernance) {
      map.set(row.department_id, row)
    }
    return map
  }, [departmentGovernance])

  useEffect(() => {
    if (!departmentForm.department_id) return
    const row = departmentGovernanceByDepartment.get(departmentForm.department_id)
    if (!row) {
      setDepartmentForm((prev) => ({
        ...prev,
        head_user_id: 'none',
        cost_center_code: '',
        budget_owner_user_id: 'none',
        payroll_visibility_scope: 'gm_and_hr',
        revenue_generating: false,
        annual_revenue_target: '',
        annual_opex_budget: '',
        annual_capex_budget: '',
        risk_level: 'medium',
        risk_flags_text: '[]',
      }))
      return
    }

    setDepartmentForm((prev) => ({
      ...prev,
      head_user_id: row.head_user_id ?? 'none',
      cost_center_code: row.cost_center_code ?? '',
      budget_owner_user_id: row.budget_owner_user_id ?? 'none',
      payroll_visibility_scope: row.payroll_visibility_scope,
      revenue_generating: row.revenue_generating,
      annual_revenue_target: row.annual_revenue_target === null ? '' : String(row.annual_revenue_target),
      annual_opex_budget: row.annual_opex_budget === null ? '' : String(row.annual_opex_budget),
      annual_capex_budget: row.annual_capex_budget === null ? '' : String(row.annual_capex_budget),
      risk_level: row.risk_level,
      risk_flags_text: JSON.stringify(row.risk_flags ?? [], null, 2),
    }))
  }, [departmentForm.department_id, departmentGovernanceByDepartment])

  const invalidateCore = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['gov-feature-flags'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-role-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-ownership-entities'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-portfolios'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-property-portfolios'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-property-clusters'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-cluster-properties'] }),
      queryClient.invalidateQueries({ queryKey: ['gov-department-governance'] }),
    ])
  }

  const setFeatureFlagMutation = useMutation({
    mutationFn: async ({ flagKey, enabled, reason }: { flagKey: string; enabled: boolean; reason: string }) => {
      const { error } = await supabase.rpc('gov_set_feature_flag', {
        p_flag_key: flagKey,
        p_is_enabled: enabled,
        p_reason: reason || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-feature-flags'] })
      toast({ title: 'Feature flag updated' })
    },
    onError: (error) => {
      toast({ title: 'Failed to update feature flag', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentForm.user_id || !assignmentForm.governance_role_code) {
        throw new Error('User and role are required.')
      }
      if (assignmentForm.scope_type !== 'corporate' && assignmentForm.scope_id === 'none') {
        throw new Error('Scope entity is required for this scope type.')
      }

      const payload = {
        user_id: assignmentForm.user_id,
        governance_role_code: assignmentForm.governance_role_code,
        scope_type: assignmentForm.scope_type,
        scope_id: assignmentForm.scope_type === 'corporate' ? null : assignmentForm.scope_id,
        assigned_by: user?.id ?? null,
        starts_at: toIsoOrNull(assignmentForm.starts_at) ?? new Date().toISOString(),
        ends_at: toIsoOrNull(assignmentForm.ends_at),
        is_primary: assignmentForm.is_primary,
        assignment_reason: assignmentForm.assignment_reason || null,
      }

      const { error } = await supabase.from('gov_user_role_assignments').insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-role-assignments'] })
      setAssignmentForm({
        user_id: '',
        governance_role_code: '',
        scope_type: 'corporate',
        scope_id: 'none',
        starts_at: toDatetimeInput(new Date().toISOString()),
        ends_at: '',
        is_primary: false,
        assignment_reason: '',
      })
      toast({ title: 'Role assignment created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create role assignment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const closeAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gov_user_role_assignments')
        .update({ ends_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-role-assignments'] })
      toast({ title: 'Assignment closed' })
    },
    onError: (error) => {
      toast({ title: 'Failed to close assignment', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createOwnershipMutation = useMutation({
    mutationFn: async () => {
      if (!ownershipForm.legal_name.trim() || !ownershipForm.display_name.trim()) {
        throw new Error('Legal name and display name are required.')
      }
      const { error } = await supabase.from('gov_ownership_entities').insert({
        legal_name: ownershipForm.legal_name.trim(),
        display_name: ownershipForm.display_name.trim(),
        owner_type: ownershipForm.owner_type,
        country_code: ownershipForm.country_code.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-ownership-entities'] })
      setOwnershipForm({ legal_name: '', display_name: '', owner_type: 'owner', country_code: '' })
      toast({ title: 'Ownership entity created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create ownership entity', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!portfolioForm.ownership_entity_id || !portfolioForm.portfolio_code.trim() || !portfolioForm.portfolio_name.trim()) {
        throw new Error('Ownership, portfolio code, and portfolio name are required.')
      }

      const { error } = await supabase.from('gov_portfolios').insert({
        ownership_entity_id: portfolioForm.ownership_entity_id,
        portfolio_code: portfolioForm.portfolio_code.trim(),
        portfolio_name: portfolioForm.portfolio_name.trim(),
        reporting_currency: portfolioForm.reporting_currency.trim().toUpperCase() || 'USD',
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-portfolios'] })
      setPortfolioForm({ ownership_entity_id: '', portfolio_code: '', portfolio_name: '', reporting_currency: 'USD' })
      toast({ title: 'Portfolio created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create portfolio', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createPropertyPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!propertyPortfolioForm.property_id || !propertyPortfolioForm.portfolio_id || !propertyPortfolioForm.effective_from) {
        throw new Error('Property, portfolio, and effective from date are required.')
      }

      const { error } = await supabase.from('gov_property_portfolios').insert({
        property_id: propertyPortfolioForm.property_id,
        portfolio_id: propertyPortfolioForm.portfolio_id,
        effective_from: propertyPortfolioForm.effective_from,
        effective_to: propertyPortfolioForm.effective_to || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-property-portfolios'] })
      setPropertyPortfolioForm({ property_id: '', portfolio_id: '', effective_from: new Date().toISOString().slice(0, 10), effective_to: '' })
      toast({ title: 'Property mapped to portfolio' })
    },
    onError: (error) => {
      toast({ title: 'Failed to map property to portfolio', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createClusterMutation = useMutation({
    mutationFn: async () => {
      if (!clusterForm.portfolio_id || !clusterForm.cluster_code.trim() || !clusterForm.cluster_name.trim()) {
        throw new Error('Portfolio, cluster code, and cluster name are required.')
      }
      const { error } = await supabase.from('gov_property_clusters').insert({
        portfolio_id: clusterForm.portfolio_id,
        cluster_code: clusterForm.cluster_code.trim(),
        cluster_name: clusterForm.cluster_name.trim(),
        area_label: clusterForm.area_label.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-property-clusters'] })
      setClusterForm({ portfolio_id: '', cluster_code: '', cluster_name: '', area_label: '' })
      toast({ title: 'Cluster created' })
    },
    onError: (error) => {
      toast({ title: 'Failed to create cluster', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const createClusterPropertyMutation = useMutation({
    mutationFn: async () => {
      if (!clusterPropertyForm.cluster_id || !clusterPropertyForm.property_id || !clusterPropertyForm.effective_from) {
        throw new Error('Cluster, property, and effective from date are required.')
      }
      const { error } = await supabase.from('gov_cluster_properties').insert({
        cluster_id: clusterPropertyForm.cluster_id,
        property_id: clusterPropertyForm.property_id,
        effective_from: clusterPropertyForm.effective_from,
        effective_to: clusterPropertyForm.effective_to || null,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-cluster-properties'] })
      setClusterPropertyForm({ cluster_id: '', property_id: '', effective_from: new Date().toISOString().slice(0, 10), effective_to: '' })
      toast({ title: 'Property mapped to cluster' })
    },
    onError: (error) => {
      toast({ title: 'Failed to map property to cluster', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const saveDepartmentGovernanceMutation = useMutation({
    mutationFn: async () => {
      if (!departmentForm.department_id) {
        throw new Error('Department is required.')
      }

      let riskFlags: unknown = []
      try {
        riskFlags = JSON.parse(departmentForm.risk_flags_text || '[]')
      } catch {
        throw new Error('Risk flags must be valid JSON.')
      }

      const payload = {
        department_id: departmentForm.department_id,
        head_user_id: departmentForm.head_user_id === 'none' ? null : departmentForm.head_user_id,
        cost_center_code: departmentForm.cost_center_code.trim() || null,
        budget_owner_user_id: departmentForm.budget_owner_user_id === 'none' ? null : departmentForm.budget_owner_user_id,
        payroll_visibility_scope: departmentForm.payroll_visibility_scope,
        revenue_generating: departmentForm.revenue_generating,
        annual_revenue_target: parseOptionalNumber(departmentForm.annual_revenue_target),
        annual_opex_budget: parseOptionalNumber(departmentForm.annual_opex_budget),
        annual_capex_budget: parseOptionalNumber(departmentForm.annual_capex_budget),
        risk_level: departmentForm.risk_level,
        risk_flags: riskFlags,
        updated_at: new Date().toISOString(),
      }

      const existing = departmentGovernanceByDepartment.get(departmentForm.department_id)
      if (existing) {
        const { error } = await supabase
          .from('gov_department_governance')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw error
        return
      }

      const { error } = await supabase
        .from('gov_department_governance')
        .insert(payload)
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['gov-department-governance'] })
      toast({ title: 'Department governance saved' })
    },
    onError: (error) => {
      toast({ title: 'Failed to save department governance', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' })
    }
  })

  const scopeEntityOptions = useMemo(() => {
    switch (assignmentForm.scope_type) {
      case 'department':
        return departments.map((item) => ({ value: item.id, label: item.name }))
      case 'property':
        return properties.map((item) => ({ value: item.id, label: item.name }))
      case 'portfolio':
        return portfolios.map((item) => ({ value: item.id, label: item.portfolio_name }))
      case 'cluster':
        return clusters.map((item) => ({ value: item.id, label: item.cluster_name }))
      default:
        return []
    }
  }, [assignmentForm.scope_type, departments, properties, portfolios, clusters])

  const hasLoadError = [
    profilesQuery.error,
    rolesQuery.error,
    featureFlagsQuery.error,
    assignmentsQuery.error,
    ownershipEntitiesQuery.error,
    portfoliosQuery.error,
    propertyPortfoliosQuery.error,
    clustersQuery.error,
    clusterPropertiesQuery.error,
    departmentGovernanceQuery.error,
    propertiesQuery.error,
    departmentsQuery.error,
  ].some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('governance_controls.title', 'Governance Controls')}
        description={t('governance_controls.description', 'Authority hierarchy, ownership model, feature flags, and department governance controls.')}
      />

      {hasLoadError && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            Governance data load failed for one or more sections. Verify `corporate_admin` or `regional_admin` access.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-4">
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="authority">Authority</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Model</TabsTrigger>
          <TabsTrigger value="department">Department Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Governance Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Change reason (optional)</Label>
                <Input value={flagReason} onChange={(event) => setFlagReason(event.target.value)} placeholder="Why this flag is changing" />
              </div>

              {featureFlags.map((flag) => (
                <div key={flag.flag_key} className="rounded border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{flag.flag_key}</div>
                    <div className="text-xs text-muted-foreground">{flag.description || 'No description'}</div>
                    <div className="text-xs text-muted-foreground">Updated: {new Date(flag.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>{flag.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
                    <Button
                      variant={flag.is_enabled ? 'destructive' : 'default'}
                      size="sm"
                      disabled={setFeatureFlagMutation.isPending}
                      onClick={() => setFeatureFlagMutation.mutate({ flagKey: flag.flag_key, enabled: !flag.is_enabled, reason: flagReason })}
                    >
                      {flag.is_enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Governance Role Assignment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={assignmentForm.user_id || 'none'} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, user_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select user</SelectItem>
                    {profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.email || profile.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Governance Role</Label>
                <Select value={assignmentForm.governance_role_code || 'none'} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, governance_role_code: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select role</SelectItem>
                    {roles.map((role) => <SelectItem key={role.role_code} value={role.role_code}>{role.role_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scope Type</Label>
                <Select value={assignmentForm.scope_type} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, scope_type: value as ScopeType, scope_id: 'none' }))}>
                  <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map((scope) => <SelectItem key={scope} value={scope}>{scope}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scope Entity</Label>
                <Select value={assignmentForm.scope_id} onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, scope_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select scope entity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{assignmentForm.scope_type === 'corporate' ? 'Not required for corporate' : 'Select entity'}</SelectItem>
                    {scopeEntityOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Starts At</Label>
                <Input type="datetime-local" value={assignmentForm.starts_at} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, starts_at: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Ends At (optional)</Label>
                <Input type="datetime-local" value={assignmentForm.ends_at} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, ends_at: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Assignment Reason</Label>
                <Input value={assignmentForm.assignment_reason} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, assignment_reason: event.target.value }))} placeholder="Reason for assignment" />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={assignmentForm.is_primary} onCheckedChange={(checked) => setAssignmentForm((prev) => ({ ...prev, is_primary: checked === true }))} />
                <Label>Primary Assignment</Label>
              </div>

              <div className="xl:col-span-4">
                <Button onClick={() => createAssignmentMutation.mutate()} disabled={createAssignmentMutation.isPending}>Create Assignment</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Role Assignments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((row) => {
                    const isActive = !row.ends_at || new Date(row.ends_at) > new Date()
                    const scopeName = row.scope_type === 'department'
                      ? departmentNameById.get(row.scope_id || '')
                      : row.scope_type === 'property'
                        ? propertyNameById.get(row.scope_id || '')
                        : row.scope_type === 'portfolio'
                          ? portfolioNameById.get(row.scope_id || '')
                          : row.scope_type === 'cluster'
                            ? clusterNameById.get(row.scope_id || '')
                            : 'Corporate'

                    return (
                      <TableRow key={row.id}>
                        <TableCell>{profileNameById.get(row.user_id) || row.user_id}</TableCell>
                        <TableCell>{roleNameByCode.get(row.governance_role_code) || row.governance_role_code}</TableCell>
                        <TableCell>{row.scope_type}{scopeName ? `: ${scopeName}` : ''}</TableCell>
                        <TableCell>{new Date(row.starts_at).toLocaleString()} - {row.ends_at ? new Date(row.ends_at).toLocaleString() : 'Open'}</TableCell>
                        <TableCell><Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Closed'}</Badge></TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <Button size="sm" variant="destructive" onClick={() => closeAssignmentMutation.mutate(row.id)} disabled={closeAssignmentMutation.isPending}>
                              Close
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Ownership Entity</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Legal Name</Label><Input value={ownershipForm.legal_name} onChange={(event) => setOwnershipForm((prev) => ({ ...prev, legal_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Display Name</Label><Input value={ownershipForm.display_name} onChange={(event) => setOwnershipForm((prev) => ({ ...prev, display_name: event.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Owner Type</Label>
                <Select value={ownershipForm.owner_type} onValueChange={(value) => setOwnershipForm((prev) => ({ ...prev, owner_type: value as OwnerType }))}>
                  <SelectTrigger><SelectValue placeholder="Select owner type" /></SelectTrigger>
                  <SelectContent>{ownerTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Country Code</Label><Input value={ownershipForm.country_code} onChange={(event) => setOwnershipForm((prev) => ({ ...prev, country_code: event.target.value }))} placeholder="US" /></div>
              <div className="md:col-span-2 xl:col-span-4"><Button onClick={() => createOwnershipMutation.mutate()} disabled={createOwnershipMutation.isPending}>Create Ownership Entity</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Portfolio</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Ownership Entity</Label>
                <Select value={portfolioForm.ownership_entity_id || 'none'} onValueChange={(value) => setPortfolioForm((prev) => ({ ...prev, ownership_entity_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select ownership entity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select ownership entity</SelectItem>
                    {ownershipEntities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Portfolio Code</Label><Input value={portfolioForm.portfolio_code} onChange={(event) => setPortfolioForm((prev) => ({ ...prev, portfolio_code: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Portfolio Name</Label><Input value={portfolioForm.portfolio_name} onChange={(event) => setPortfolioForm((prev) => ({ ...prev, portfolio_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Reporting Currency</Label><Input value={portfolioForm.reporting_currency} onChange={(event) => setPortfolioForm((prev) => ({ ...prev, reporting_currency: event.target.value }))} /></div>
              <div className="md:col-span-2 xl:col-span-4"><Button onClick={() => createPortfolioMutation.mutate()} disabled={createPortfolioMutation.isPending}>Create Portfolio</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Property to Portfolio Mapping</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={propertyPortfolioForm.property_id || 'none'} onValueChange={(value) => setPropertyPortfolioForm((prev) => ({ ...prev, property_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select property</SelectItem>
                    {properties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Portfolio</Label>
                <Select value={propertyPortfolioForm.portfolio_id || 'none'} onValueChange={(value) => setPropertyPortfolioForm((prev) => ({ ...prev, portfolio_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select portfolio</SelectItem>
                    {portfolios.map((portfolio) => <SelectItem key={portfolio.id} value={portfolio.id}>{portfolio.portfolio_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={propertyPortfolioForm.effective_from} onChange={(event) => setPropertyPortfolioForm((prev) => ({ ...prev, effective_from: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={propertyPortfolioForm.effective_to} onChange={(event) => setPropertyPortfolioForm((prev) => ({ ...prev, effective_to: event.target.value }))} /></div>
              <div className="xl:pt-7"><Button onClick={() => createPropertyPortfolioMutation.mutate()} disabled={createPropertyPortfolioMutation.isPending}>Link Property</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create Cluster and Cluster Mapping</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>Portfolio</Label>
                  <Select value={clusterForm.portfolio_id || 'none'} onValueChange={(value) => setClusterForm((prev) => ({ ...prev, portfolio_id: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="Select portfolio" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select portfolio</SelectItem>
                      {portfolios.map((portfolio) => <SelectItem key={portfolio.id} value={portfolio.id}>{portfolio.portfolio_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Cluster Code</Label><Input value={clusterForm.cluster_code} onChange={(event) => setClusterForm((prev) => ({ ...prev, cluster_code: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Cluster Name</Label><Input value={clusterForm.cluster_name} onChange={(event) => setClusterForm((prev) => ({ ...prev, cluster_name: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Area Label</Label><Input value={clusterForm.area_label} onChange={(event) => setClusterForm((prev) => ({ ...prev, area_label: event.target.value }))} /></div>
                <div className="xl:pt-7"><Button onClick={() => createClusterMutation.mutate()} disabled={createClusterMutation.isPending}>Create Cluster</Button></div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>Cluster</Label>
                  <Select value={clusterPropertyForm.cluster_id || 'none'} onValueChange={(value) => setClusterPropertyForm((prev) => ({ ...prev, cluster_id: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="Select cluster" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select cluster</SelectItem>
                      {clusters.map((cluster) => <SelectItem key={cluster.id} value={cluster.id}>{cluster.cluster_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={clusterPropertyForm.property_id || 'none'} onValueChange={(value) => setClusterPropertyForm((prev) => ({ ...prev, property_id: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select property</SelectItem>
                      {properties.map((property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Effective From</Label><Input type="date" value={clusterPropertyForm.effective_from} onChange={(event) => setClusterPropertyForm((prev) => ({ ...prev, effective_from: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Effective To</Label><Input type="date" value={clusterPropertyForm.effective_to} onChange={(event) => setClusterPropertyForm((prev) => ({ ...prev, effective_to: event.target.value }))} /></div>
                <div className="xl:pt-7"><Button onClick={() => createClusterPropertyMutation.mutate()} disabled={createClusterPropertyMutation.isPending}>Link to Cluster</Button></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Portfolio Structure Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>Ownership entities: <span className="font-medium">{ownershipEntities.length}</span></div>
              <div>Portfolios: <span className="font-medium">{portfolios.length}</span></div>
              <div>Property-portfolio links: <span className="font-medium">{propertyPortfolios.length}</span></div>
              <div>Clusters: <span className="font-medium">{clusters.length}</span></div>
              <div>Cluster-property links: <span className="font-medium">{clusterProperties.length}</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Department Governance</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={departmentForm.department_id || 'none'} onValueChange={(value) => setDepartmentForm((prev) => ({ ...prev, department_id: value === 'none' ? '' : value }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select department</SelectItem>
                    {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department Head</Label>
                <Select value={departmentForm.head_user_id} onValueChange={(value) => setDepartmentForm((prev) => ({ ...prev, head_user_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {profiles.map((profile) => <SelectItem key={`head-${profile.id}`} value={profile.id}>{profile.full_name || profile.email || profile.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Budget Owner</Label>
                <Select value={departmentForm.budget_owner_user_id} onValueChange={(value) => setDepartmentForm((prev) => ({ ...prev, budget_owner_user_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {profiles.map((profile) => <SelectItem key={`budget-${profile.id}`} value={profile.id}>{profile.full_name || profile.email || profile.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Cost Center Code</Label><Input value={departmentForm.cost_center_code} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, cost_center_code: event.target.value }))} /></div>

              <div className="space-y-2">
                <Label>Payroll Visibility Scope</Label>
                <Select value={departmentForm.payroll_visibility_scope} onValueChange={(value) => setDepartmentForm((prev) => ({ ...prev, payroll_visibility_scope: value as PayrollScope }))}>
                  <SelectTrigger><SelectValue placeholder="Select payroll visibility" /></SelectTrigger>
                  <SelectContent>{payrollScopeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2"><Label>Annual Revenue Target</Label><Input type="number" step="0.01" value={departmentForm.annual_revenue_target} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, annual_revenue_target: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Annual OpEx Budget</Label><Input type="number" step="0.01" value={departmentForm.annual_opex_budget} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, annual_opex_budget: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Annual CapEx Budget</Label><Input type="number" step="0.01" value={departmentForm.annual_capex_budget} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, annual_capex_budget: event.target.value }))} /></div>

              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={departmentForm.risk_level} onValueChange={(value) => setDepartmentForm((prev) => ({ ...prev, risk_level: value as RiskLevel }))}>
                  <SelectTrigger><SelectValue placeholder="Select risk level" /></SelectTrigger>
                  <SelectContent>{riskLevelOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={departmentForm.revenue_generating} onCheckedChange={(checked) => setDepartmentForm((prev) => ({ ...prev, revenue_generating: checked === true }))} />
                <Label>Revenue Generating Department</Label>
              </div>

              <div className="xl:col-span-4 space-y-2">
                <Label>Risk Flags (JSON array)</Label>
                <Textarea rows={4} value={departmentForm.risk_flags_text} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, risk_flags_text: event.target.value }))} />
              </div>

              <div className="xl:col-span-4">
                <Button onClick={() => saveDepartmentGovernanceMutation.mutate()} disabled={saveDepartmentGovernanceMutation.isPending}>Save Department Governance</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Department Governance Records</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Budget Owner</TableHead>
                    <TableHead>Payroll Scope</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Revenue Dept</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentGovernance.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{departmentNameById.get(row.department_id) || row.department_id}</TableCell>
                      <TableCell>{row.head_user_id ? (profileNameById.get(row.head_user_id) || row.head_user_id) : '-'}</TableCell>
                      <TableCell>{row.budget_owner_user_id ? (profileNameById.get(row.budget_owner_user_id) || row.budget_owner_user_id) : '-'}</TableCell>
                      <TableCell>{row.payroll_visibility_scope}</TableCell>
                      <TableCell><Badge variant={row.risk_level === 'critical' ? 'destructive' : 'secondary'}>{row.risk_level}</Badge></TableCell>
                      <TableCell>{row.revenue_generating ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
