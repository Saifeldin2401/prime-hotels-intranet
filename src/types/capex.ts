export type CapexCategory =
  | 'renovation'
  | 'pre_opening'
  | 'equipment'
  | 'it_infrastructure'
  | 'facility_expansion'
  | 'sustainability'

export type CapexStatus =
  | 'planning'
  | 'approved'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

export type CapexPriority = 'low' | 'medium' | 'high' | 'urgent'

export type PreOpeningPhase =
  | 'brand_standards'
  | 'legal'
  | 'hr_staffing'
  | 'procurement'
  | 'it_pms'
  | 'rooms'
  | 'fnb'
  | 'sales_marketing'
  | 'finance'
  | 'handover'

export type PreOpeningChecklistStatus = 'not_started' | 'in_progress' | 'blocked' | 'done' | 'waived'

export interface CapexProject {
  id: string
  property_id: string | null
  title: string
  description: string | null
  category: CapexCategory
  status: CapexStatus
  priority: CapexPriority
  allocated_budget: number
  spent_amount: number
  target_completion_date: string | null
  project_manager_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  property_name?: string
}

export interface CapexMilestone {
  id: string
  project_id: string
  title: string
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  owner_id: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CapexExpenditure {
  id: string
  project_id: string
  amount: number
  vendor_name: string | null
  invoice_number: string | null
  expense_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PreOpeningChecklistItem {
  id: string
  project_id: string
  phase: PreOpeningPhase
  title: string
  description: string | null
  status: PreOpeningChecklistStatus
  priority: CapexPriority
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CapexProjectTemplateChecklistItem {
  phase: PreOpeningPhase
  title: string
  description?: string
  priority?: CapexPriority
}

export interface CapexProjectTemplate {
  id: string
  template_name: string
  category: CapexCategory
  description: string | null
  default_checklist: CapexProjectTemplateChecklistItem[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateCapexProjectInput {
  property_id?: string | null
  title: string
  description?: string
  category: CapexCategory
  status?: CapexStatus
  priority?: CapexPriority
  allocated_budget: number
  target_completion_date?: string
  project_manager_id?: string | null
  created_by: string
}

export interface CreateCapexMilestoneInput {
  project_id: string
  title: string
  due_date?: string
  status?: CapexMilestone['status']
  owner_id?: string | null
  created_by?: string | null
}

export interface CreateCapexExpenditureInput {
  project_id: string
  amount: number
  vendor_name?: string
  invoice_number?: string
  expense_date?: string
  notes?: string
  created_by?: string | null
}

export interface CreatePreOpeningChecklistItemInput {
  project_id: string
  phase: PreOpeningPhase
  title: string
  description?: string
  status?: PreOpeningChecklistStatus
  priority?: CapexPriority
  assigned_to?: string | null
  due_date?: string
  created_by?: string | null
}
