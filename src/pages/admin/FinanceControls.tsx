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

type GovRole = {
  role_code: string
  role_name: string
  tier: number
}

type PropertyOption = {
  id: string
  name: string
}

type DepartmentOption = {
  id: string
  name: string
  property_id: string | null
}

type BudgetCycleStatus = 'draft' | 'active' | 'closed' | 'archived'
type DepartmentBudgetStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
type ApprovalType = 'opex' | 'capex' | 'purchase' | 'expense_claim' | 'contract'
type FinancialActionType =
  | 'budget_submit'
  | 'budget_approve'
  | 'budget_reject'
  | 'purchase_approve'
  | 'purchase_reject'
  | 'expense_approve'
  | 'expense_reject'
  | 'override'

type BudgetCycle = {
  id: string
  cycle_name: string
  starts_on: string
  ends_on: string
  status: BudgetCycleStatus
  created_at: string
}

type DepartmentBudget = {
  id: string
  budget_cycle_id: string
  department_id: string
  opex_budget: number
  capex_budget: number
  status: DepartmentBudgetStatus
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

type FinancialApprovalPolicy = {
  id: string
  approval_type: ApprovalType
  governance_role_code: string
  min_amount: number
  max_amount: number | null
  require_next_level: boolean
  next_level_role_code: string | null
  allow_emergency_override: boolean
  dual_approval_required: boolean
  is_active: boolean
  created_at: string
}

type FinancialActionLog = {
  id: string
  action_type: FinancialActionType
  entity_type: string
  entity_id: string | null
  property_id: string | null
  department_id: string | null
  actor_id: string | null
  actor_role_code: string | null
  amount: number | null
  currency: string
  approval_path: unknown
  was_override: boolean
  override_reason: string | null
  created_at: string
}

const APPROVAL_TYPES: ApprovalType[] = ['opex', 'capex', 'purchase', 'expense_claim', 'contract']
const BUDGET_CYCLE_STATUSES: BudgetCycleStatus[] = ['draft', 'active', 'closed', 'archived']
const DEPARTMENT_BUDGET_STATUSES: DepartmentBudgetStatus[] = ['draft', 'submitted', 'approved', 'rejected']
const FINANCIAL_ACTION_TYPES: FinancialActionType[] = [
  'budget_submit',
  'budget_approve',
  'budget_reject',
  'purchase_approve',
  'purchase_reject',
  'expense_approve',
  'expense_reject',
  'override',
]

const emptyPolicyForm = {
  approval_type: 'opex' as ApprovalType,
  governance_role_code: '',
  min_amount: '0',
  max_amount: '',
  require_next_level: false,
  next_level_role_code: 'none',
  allow_emergency_override: false,
  dual_approval_required: false,
  is_active: true,
}

const emptyCycleForm = {
  cycle_name: '',
  starts_on: '',
  ends_on: '',
  status: 'draft' as BudgetCycleStatus,
}

const emptyBudgetForm = {
  budget_cycle_id: '',
  department_id: '',
  opex_budget: '0',
  capex_budget: '0',
  status: 'draft' as DepartmentBudgetStatus,
}

const emptyActionForm = {
  action_type: 'budget_submit' as FinancialActionType,
  entity_type: 'department_budget',
  entity_id: '',
  property_id: 'none',
  department_id: 'none',
  actor_role_code: 'none',
  amount: '',
  currency: 'USD',
  approval_path: '[]',
  was_override: false,
  override_reason: '',
}

function parseAmount(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatAmount(value: number | null | undefined, currency = 'USD') {
  if (value === null || value === undefined) return '-'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export default function FinanceControls() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null)
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [policyForm, setPolicyForm] = useState(emptyPolicyForm)
  const [cycleForm, setCycleForm] = useState(emptyCycleForm)
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm)
  const [actionForm, setActionForm] = useState(emptyActionForm)
  const [actionsFilter, setActionsFilter] = useState<'all' | FinancialActionType>('all')

  const rolesQuery = useQuery({
    queryKey: ['gov-role-catalog-options'],
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

  const propertiesQuery = useQuery({
    queryKey: ['gov-finance-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name', { ascending: true })
        .limit(500)

      if (error) throw error
      return (data ?? []) as PropertyOption[]
    }
  })

  const departmentsQuery = useQuery({
    queryKey: ['gov-finance-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, property_id')
        .order('name', { ascending: true })
        .limit(1000)

      if (error) throw error
      return (data ?? []) as DepartmentOption[]
    }
  })

  const budgetCyclesQuery = useQuery({
    queryKey: ['gov-budget-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_budget_cycles')
        .select('*')
        .order('starts_on', { ascending: false })
        .limit(200)

      if (error) throw error
      return (data ?? []) as BudgetCycle[]
    }
  })

  const departmentBudgetsQuery = useQuery({
    queryKey: ['gov-department-budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_department_budgets')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return (data ?? []) as DepartmentBudget[]
    }
  })

  const approvalPoliciesQuery = useQuery({
    queryKey: ['gov-financial-approval-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_financial_approval_policies')
        .select('*')
        .order('approval_type', { ascending: true })
        .order('min_amount', { ascending: true })
        .limit(500)

      if (error) throw error
      return (data ?? []) as FinancialApprovalPolicy[]
    }
  })

  const financialActionsQuery = useQuery({
    queryKey: ['gov-financial-actions-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gov_financial_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return (data ?? []) as FinancialActionLog[]
    }
  })

  const roles = rolesQuery.data ?? []
  const properties = propertiesQuery.data ?? []
  const departments = departmentsQuery.data ?? []
  const budgetCycles = budgetCyclesQuery.data ?? []
  const departmentBudgets = departmentBudgetsQuery.data ?? []
  const approvalPolicies = approvalPoliciesQuery.data ?? []
  const financialActions = financialActionsQuery.data ?? []

  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.role_code, role.role_name])), [roles])
  const propertyNameById = useMemo(() => new Map(properties.map((property) => [property.id, property.name])), [properties])
  const departmentById = useMemo(() => new Map(departments.map((department) => [department.id, department])), [departments])
  const cycleNameById = useMemo(() => new Map(budgetCycles.map((cycle) => [cycle.id, cycle.cycle_name])), [budgetCycles])

  const filteredActions = useMemo(() => {
    if (actionsFilter === 'all') return financialActions
    return financialActions.filter((action) => action.action_type === actionsFilter)
  }, [actionsFilter, financialActions])

  const stats = useMemo(() => {
    const activePolicies = approvalPolicies.filter((policy) => policy.is_active).length
    const activeCycles = budgetCycles.filter((cycle) => cycle.status === 'active').length
    const approvedBudgets = departmentBudgets.filter((budget) => budget.status === 'approved').length
    const overrides = financialActions.filter((action) => action.was_override).length

    return { activePolicies, activeCycles, approvedBudgets, overrides }
  }, [approvalPolicies, budgetCycles, departmentBudgets, financialActions])

  const savePolicyMutation = useMutation({
    mutationFn: async () => {
      if (!policyForm.governance_role_code) {
        throw new Error('Role is required.')
      }

      const minAmount = parseAmount(policyForm.min_amount)
      const maxAmount = parseAmount(policyForm.max_amount)

      if (minAmount === null || minAmount < 0) {
        throw new Error('Min amount must be a number >= 0.')
      }

      if (maxAmount !== null && maxAmount <= minAmount) {
        throw new Error('Max amount must be greater than min amount.')
      }

      const payload = {
        approval_type: policyForm.approval_type,
        governance_role_code: policyForm.governance_role_code,
        min_amount: minAmount,
        max_amount: maxAmount,
        require_next_level: policyForm.require_next_level,
        next_level_role_code: policyForm.require_next_level && policyForm.next_level_role_code !== 'none'
          ? policyForm.next_level_role_code
          : null,
        allow_emergency_override: policyForm.allow_emergency_override,
        dual_approval_required: policyForm.dual_approval_required,
        is_active: policyForm.is_active,
      }

      if (editingPolicyId) {
        const { error } = await supabase
          .from('gov_financial_approval_policies')
          .update(payload)
          .eq('id', editingPolicyId)

        if (error) throw error
        return
      }

      const { error } = await supabase
        .from('gov_financial_approval_policies')
        .insert(payload)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-financial-approval-policies'] })
      setEditingPolicyId(null)
      setPolicyForm(emptyPolicyForm)
      toast({
        title: t('finance_controls.toasts.policy_saved_title', 'Approval policy saved'),
        description: t('finance_controls.toasts.policy_saved_desc', 'Financial approval matrix has been updated.')
      })
    },
    onError: (error) => {
      toast({
        title: t('finance_controls.toasts.policy_save_failed_title', 'Failed to save policy'),
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive'
      })
    }
  })

  const togglePolicyActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('gov_financial_approval_policies')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-financial-approval-policies'] })
    },
    onError: (error) => {
      toast({
        title: t('finance_controls.toasts.policy_toggle_failed_title', 'Failed to update policy'),
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive'
      })
    }
  })

  const saveCycleMutation = useMutation({
    mutationFn: async () => {
      if (!cycleForm.cycle_name.trim()) {
        throw new Error('Cycle name is required.')
      }
      if (!cycleForm.starts_on || !cycleForm.ends_on) {
        throw new Error('Start and end dates are required.')
      }
      if (new Date(cycleForm.ends_on) <= new Date(cycleForm.starts_on)) {
        throw new Error('End date must be after start date.')
      }

      const payload = {
        cycle_name: cycleForm.cycle_name.trim(),
        starts_on: cycleForm.starts_on,
        ends_on: cycleForm.ends_on,
        status: cycleForm.status,
      }

      if (editingCycleId) {
        const { error } = await supabase
          .from('gov_budget_cycles')
          .update(payload)
          .eq('id', editingCycleId)

        if (error) throw error
        return
      }

      const { error } = await supabase
        .from('gov_budget_cycles')
        .insert({
          ...payload,
          created_by: user?.id ?? null,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-budget-cycles'] })
      setEditingCycleId(null)
      setCycleForm(emptyCycleForm)
      toast({
        title: t('finance_controls.toasts.cycle_saved_title', 'Budget cycle saved'),
        description: t('finance_controls.toasts.cycle_saved_desc', 'Cycle configuration is updated.')
      })
    },
    onError: (error) => {
      toast({
        title: t('finance_controls.toasts.cycle_save_failed_title', 'Failed to save cycle'),
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive'
      })
    }
  })

  const saveBudgetMutation = useMutation({
    mutationFn: async () => {
      if (!budgetForm.budget_cycle_id) {
        throw new Error('Budget cycle is required.')
      }
      if (!budgetForm.department_id) {
        throw new Error('Department is required.')
      }

      const opexBudget = parseAmount(budgetForm.opex_budget)
      const capexBudget = parseAmount(budgetForm.capex_budget)

      if (opexBudget === null || opexBudget < 0) {
        throw new Error('OpEx budget must be a number >= 0.')
      }
      if (capexBudget === null || capexBudget < 0) {
        throw new Error('CapEx budget must be a number >= 0.')
      }

      const isApproved = budgetForm.status === 'approved'
      const payload = {
        budget_cycle_id: budgetForm.budget_cycle_id,
        department_id: budgetForm.department_id,
        opex_budget: opexBudget,
        capex_budget: capexBudget,
        status: budgetForm.status,
        approved_at: isApproved ? new Date().toISOString() : null,
        approved_by: isApproved ? (user?.id ?? null) : null,
        updated_at: new Date().toISOString(),
      }

      if (editingBudgetId) {
        const { error } = await supabase
          .from('gov_department_budgets')
          .update(payload)
          .eq('id', editingBudgetId)

        if (error) throw error
        return
      }

      const { error } = await supabase
        .from('gov_department_budgets')
        .insert(payload)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-department-budgets'] })
      setEditingBudgetId(null)
      setBudgetForm(emptyBudgetForm)
      toast({
        title: t('finance_controls.toasts.budget_saved_title', 'Department budget saved'),
        description: t('finance_controls.toasts.budget_saved_desc', 'Budget entry has been stored.')
      })
    },
    onError: (error) => {
      toast({
        title: t('finance_controls.toasts.budget_save_failed_title', 'Failed to save budget'),
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive'
      })
    }
  })

  const recordActionMutation = useMutation({
    mutationFn: async () => {
      if (!actionForm.entity_type.trim()) {
        throw new Error('Entity type is required.')
      }
      if (!actionForm.currency.trim()) {
        throw new Error('Currency is required.')
      }
      if (actionForm.was_override && !actionForm.override_reason.trim()) {
        throw new Error('Override reason is required when override is enabled.')
      }

      let parsedApprovalPath: unknown = []
      try {
        parsedApprovalPath = JSON.parse(actionForm.approval_path || '[]')
      } catch {
        throw new Error('Approval path must be valid JSON.')
      }

      const parsedAmount = parseAmount(actionForm.amount)
      if (actionForm.amount.trim() && parsedAmount === null) {
        throw new Error('Amount must be a valid number.')
      }

      const payload = {
        action_type: actionForm.action_type,
        entity_type: actionForm.entity_type.trim(),
        entity_id: actionForm.entity_id.trim() || null,
        property_id: actionForm.property_id === 'none' ? null : actionForm.property_id,
        department_id: actionForm.department_id === 'none' ? null : actionForm.department_id,
        actor_id: user?.id ?? null,
        actor_role_code: actionForm.actor_role_code === 'none' ? null : actionForm.actor_role_code,
        amount: parsedAmount,
        currency: actionForm.currency.trim().toUpperCase(),
        approval_path: parsedApprovalPath,
        was_override: actionForm.was_override,
        override_reason: actionForm.override_reason.trim() || null,
      }

      const { error } = await supabase
        .from('gov_financial_actions_log')
        .insert(payload)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gov-financial-actions-log'] })
      setActionForm(emptyActionForm)
      toast({
        title: t('finance_controls.toasts.action_saved_title', 'Financial action logged'),
        description: t('finance_controls.toasts.action_saved_desc', 'Action is now in the immutable audit trail.')
      })
    },
    onError: (error) => {
      toast({
        title: t('finance_controls.toasts.action_save_failed_title', 'Failed to log action'),
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive'
      })
    }
  })

  const startEditPolicy = (policy: FinancialApprovalPolicy) => {
    setEditingPolicyId(policy.id)
    setPolicyForm({
      approval_type: policy.approval_type,
      governance_role_code: policy.governance_role_code,
      min_amount: String(policy.min_amount ?? ''),
      max_amount: policy.max_amount === null ? '' : String(policy.max_amount),
      require_next_level: policy.require_next_level,
      next_level_role_code: policy.next_level_role_code ?? 'none',
      allow_emergency_override: policy.allow_emergency_override,
      dual_approval_required: policy.dual_approval_required,
      is_active: policy.is_active,
    })
  }

  const startEditCycle = (cycle: BudgetCycle) => {
    setEditingCycleId(cycle.id)
    setCycleForm({
      cycle_name: cycle.cycle_name,
      starts_on: cycle.starts_on,
      ends_on: cycle.ends_on,
      status: cycle.status,
    })
  }

  const startEditBudget = (budget: DepartmentBudget) => {
    setEditingBudgetId(budget.id)
    setBudgetForm({
      budget_cycle_id: budget.budget_cycle_id,
      department_id: budget.department_id,
      opex_budget: String(budget.opex_budget ?? ''),
      capex_budget: String(budget.capex_budget ?? ''),
      status: budget.status,
    })
  }

  const hasAnyQueryError = [
    rolesQuery.error,
    propertiesQuery.error,
    departmentsQuery.error,
    budgetCyclesQuery.error,
    departmentBudgetsQuery.error,
    approvalPoliciesQuery.error,
    financialActionsQuery.error,
  ].some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance_controls.title', 'Finance Controls')}
        description={t(
          'finance_controls.description',
          'Manage approval limits, budget cycles, department budgets, and financial control logging.'
        )}
      />

      {hasAnyQueryError && (
        <Card className="border-red-300">
          <CardContent className="pt-6 text-sm text-red-600">
            {t(
              'finance_controls.load_error',
              'Some finance governance data failed to load. Check your role permissions or table access policies.'
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('finance_controls.stats.active_policies', 'Active Policies')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.activePolicies}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('finance_controls.stats.active_cycles', 'Active Cycles')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.activeCycles}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('finance_controls.stats.approved_budgets', 'Approved Budgets')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.approvedBudgets}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('finance_controls.stats.override_events', 'Override Events')}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.overrides}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="policies" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 lg:grid-cols-4">
          <TabsTrigger value="policies">{t('finance_controls.tabs.policies', 'Approval Matrix')}</TabsTrigger>
          <TabsTrigger value="cycles">{t('finance_controls.tabs.cycles', 'Budget Cycles')}</TabsTrigger>
          <TabsTrigger value="budgets">{t('finance_controls.tabs.budgets', 'Department Budgets')}</TabsTrigger>
          <TabsTrigger value="actions">{t('finance_controls.tabs.actions', 'Financial Actions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingPolicyId ? 'Edit Approval Policy' : 'Create Approval Policy'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Approval Type</Label>
                <Select
                  value={policyForm.approval_type}
                  onValueChange={(value) => setPolicyForm((prev) => ({ ...prev, approval_type: value as ApprovalType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={policyForm.governance_role_code || 'none'}
                  onValueChange={(value) => setPolicyForm((prev) => ({
                    ...prev,
                    governance_role_code: value === 'none' ? '' : value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.role_code} value={role.role_code}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policyForm.min_amount}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, min_amount: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Amount (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policyForm.max_amount}
                  onChange={(event) => setPolicyForm((prev) => ({ ...prev, max_amount: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Next Level Role</Label>
                <Select
                  value={policyForm.next_level_role_code}
                  onValueChange={(value) => setPolicyForm((prev) => ({ ...prev, next_level_role_code: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select next level role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No escalation role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={`next-${role.role_code}`} value={role.role_code}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="policy-require-next-level"
                    checked={policyForm.require_next_level}
                    onCheckedChange={(checked) => setPolicyForm((prev) => ({ ...prev, require_next_level: checked === true }))}
                  />
                  <Label htmlFor="policy-require-next-level">Require Next Level</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="policy-emergency-override"
                    checked={policyForm.allow_emergency_override}
                    onCheckedChange={(checked) => setPolicyForm((prev) => ({ ...prev, allow_emergency_override: checked === true }))}
                  />
                  <Label htmlFor="policy-emergency-override">Emergency Override</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="policy-dual-approval"
                    checked={policyForm.dual_approval_required}
                    onCheckedChange={(checked) => setPolicyForm((prev) => ({ ...prev, dual_approval_required: checked === true }))}
                  />
                  <Label htmlFor="policy-dual-approval">Dual Approval</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="policy-active"
                    checked={policyForm.is_active}
                    onCheckedChange={(checked) => setPolicyForm((prev) => ({ ...prev, is_active: checked === true }))}
                  />
                  <Label htmlFor="policy-active">Active</Label>
                </div>
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-2">
                <Button onClick={() => savePolicyMutation.mutate()} disabled={savePolicyMutation.isPending}>
                  {editingPolicyId ? 'Update Policy' : 'Create Policy'}
                </Button>
                {editingPolicyId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPolicyId(null)
                      setPolicyForm(emptyPolicyForm)
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {approvalPolicies.length === 0 ? (
                <div className="text-sm text-muted-foreground">No approval policies found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Controls</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalPolicies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>{policy.approval_type}</TableCell>
                        <TableCell>{roleNameByCode.get(policy.governance_role_code) ?? policy.governance_role_code}</TableCell>
                        <TableCell>
                          {formatAmount(policy.min_amount)} - {policy.max_amount === null ? 'No limit' : formatAmount(policy.max_amount)}
                        </TableCell>
                        <TableCell className="space-x-1">
                          {policy.require_next_level && <Badge variant="outline">Escalates</Badge>}
                          {policy.allow_emergency_override && <Badge variant="outline">Override</Badge>}
                          {policy.dual_approval_required && <Badge variant="outline">Dual</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                            {policy.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => startEditPolicy(policy)}>Edit</Button>
                          <Button
                            variant={policy.is_active ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => togglePolicyActiveMutation.mutate({ id: policy.id, isActive: !policy.is_active })}
                            disabled={togglePolicyActiveMutation.isPending}
                          >
                            {policy.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingCycleId ? 'Edit Budget Cycle' : 'Create Budget Cycle'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label>Cycle Name</Label>
                <Input
                  value={cycleForm.cycle_name}
                  onChange={(event) => setCycleForm((prev) => ({ ...prev, cycle_name: event.target.value }))}
                  placeholder="FY2026 Q1"
                />
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={cycleForm.starts_on}
                  onChange={(event) => setCycleForm((prev) => ({ ...prev, starts_on: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={cycleForm.ends_on}
                  onChange={(event) => setCycleForm((prev) => ({ ...prev, ends_on: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={cycleForm.status}
                  onValueChange={(value) => setCycleForm((prev) => ({ ...prev, status: value as BudgetCycleStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_CYCLE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
                <Button onClick={() => saveCycleMutation.mutate()} disabled={saveCycleMutation.isPending}>
                  {editingCycleId ? 'Update Cycle' : 'Create Cycle'}
                </Button>
                {editingCycleId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCycleId(null)
                      setCycleForm(emptyCycleForm)
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetCycles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No budget cycles found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetCycles.map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell>{cycle.cycle_name}</TableCell>
                        <TableCell>{cycle.starts_on} to {cycle.ends_on}</TableCell>
                        <TableCell>
                          <Badge variant={cycle.status === 'active' ? 'default' : 'secondary'}>{cycle.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(cycle.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => startEditCycle(cycle)}>Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{editingBudgetId ? 'Edit Department Budget' : 'Create Department Budget'}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Budget Cycle</Label>
                <Select
                  value={budgetForm.budget_cycle_id || 'none'}
                  onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, budget_cycle_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select cycle</SelectItem>
                    {budgetCycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>{cycle.cycle_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={budgetForm.department_id || 'none'}
                  onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, department_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select department</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>OpEx Budget</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.opex_budget}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, opex_budget: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>CapEx Budget</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.capex_budget}
                  onChange={(event) => setBudgetForm((prev) => ({ ...prev, capex_budget: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={budgetForm.status}
                  onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, status: value as DepartmentBudgetStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_BUDGET_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
                <Button onClick={() => saveBudgetMutation.mutate()} disabled={saveBudgetMutation.isPending}>
                  {editingBudgetId ? 'Update Budget' : 'Create Budget'}
                </Button>
                {editingBudgetId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingBudgetId(null)
                      setBudgetForm(emptyBudgetForm)
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              {departmentBudgets.length === 0 ? (
                <div className="text-sm text-muted-foreground">No department budgets found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>OpEx</TableHead>
                      <TableHead>CapEx</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentBudgets.map((budget) => {
                      const department = departmentById.get(budget.department_id)
                      return (
                        <TableRow key={budget.id}>
                          <TableCell>{cycleNameById.get(budget.budget_cycle_id) ?? budget.budget_cycle_id}</TableCell>
                          <TableCell>{department?.name ?? budget.department_id}</TableCell>
                          <TableCell>{formatAmount(budget.opex_budget)}</TableCell>
                          <TableCell>{formatAmount(budget.capex_budget)}</TableCell>
                          <TableCell>
                            <Badge variant={budget.status === 'approved' ? 'default' : 'secondary'}>
                              {budget.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{budget.approved_at ? new Date(budget.approved_at).toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => startEditBudget(budget)}>Edit</Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Record Financial Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select
                    value={actionForm.action_type}
                    onValueChange={(value) => setActionForm((prev) => ({ ...prev, action_type: value as FinancialActionType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_ACTION_TYPES.map((actionType) => (
                        <SelectItem key={actionType} value={actionType}>{actionType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Input
                    value={actionForm.entity_type}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, entity_type: event.target.value }))}
                    placeholder="department_budget"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entity ID (optional)</Label>
                  <Input
                    value={actionForm.entity_id}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, entity_id: event.target.value }))}
                    placeholder="UUID"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Actor Role Code</Label>
                  <Select
                    value={actionForm.actor_role_code}
                    onValueChange={(value) => setActionForm((prev) => ({ ...prev, actor_role_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={`actor-${role.role_code}`} value={role.role_code}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={actionForm.property_id}
                    onValueChange={(value) => setActionForm((prev) => ({ ...prev, property_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={actionForm.department_id}
                    onValueChange={(value) => setActionForm((prev) => ({ ...prev, department_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actionForm.amount}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={actionForm.currency}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, currency: event.target.value }))}
                    placeholder="USD"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Approval Path JSON</Label>
                  <Textarea
                    rows={4}
                    value={actionForm.approval_path}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, approval_path: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 pt-7">
                    <Checkbox
                      id="action-was-override"
                      checked={actionForm.was_override}
                      onCheckedChange={(checked) => setActionForm((prev) => ({ ...prev, was_override: checked === true }))}
                    />
                    <Label htmlFor="action-was-override">Was override</Label>
                  </div>
                  <Label>Override Reason</Label>
                  <Textarea
                    rows={4}
                    value={actionForm.override_reason}
                    onChange={(event) => setActionForm((prev) => ({ ...prev, override_reason: event.target.value }))}
                    placeholder="Required when override is enabled"
                  />
                </div>
              </div>

              <div>
                <Button onClick={() => recordActionMutation.mutate()} disabled={recordActionMutation.isPending}>
                  Record Action
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle>Financial Action Log</CardTitle>
              </div>
              <div className="w-full md:w-72">
                <Label className="mb-2 block">Filter by action type</Label>
                <Select value={actionsFilter} onValueChange={(value) => setActionsFilter(value as typeof actionsFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {FINANCIAL_ACTION_TYPES.map((actionType) => (
                      <SelectItem key={`filter-${actionType}`} value={actionType}>{actionType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredActions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No financial actions found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actor Role</TableHead>
                      <TableHead>Override</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActions.map((action) => {
                      const scopeLabel = action.department_id
                        ? `Dept: ${departmentById.get(action.department_id)?.name ?? action.department_id}`
                        : action.property_id
                          ? `Property: ${propertyNameById.get(action.property_id) ?? action.property_id}`
                          : 'Corporate'

                      return (
                        <TableRow key={action.id}>
                          <TableCell>{new Date(action.created_at).toLocaleString()}</TableCell>
                          <TableCell>{action.action_type}</TableCell>
                          <TableCell>{action.entity_type}</TableCell>
                          <TableCell>{scopeLabel}</TableCell>
                          <TableCell>{formatAmount(action.amount, action.currency)}</TableCell>
                          <TableCell>{action.actor_role_code ?? '-'}</TableCell>
                          <TableCell>
                            {action.was_override ? (
                              <Badge variant="destructive">Override</Badge>
                            ) : (
                              <Badge variant="secondary">Normal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
