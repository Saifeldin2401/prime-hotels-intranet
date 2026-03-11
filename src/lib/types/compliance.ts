import type { AppRole } from '../constants'
import type { Profile } from './profile'

export interface PIIAccessLog {
  id: string
  user_id: string
  accessed_by: string
  resource_type: 'profile' | 'document' | 'leave_request' | 'training_record' | 'maintenance_ticket' | 'message'
  resource_id: string
  access_type: 'view' | 'edit' | 'download' | 'export' | 'delete'
  pii_fields: string[]
  ip_address: string
  user_agent: string
  session_id: string
  justification: string | null
  approved_by: string | null
  created_at: string

  // Relations
  user?: Profile
  accessed_by_profile?: Profile
  approved_by_profile?: Profile
  password_history?: Record<string, unknown>[] // Placeholder for join
}

export interface PIIAccessSummary {
  total_accesses: number
  unique_users: number
  sensitive_fields_accessed: string[]
  access_by_type: Record<string, number>
  access_by_resource: Record<string, number>
  recent_accesses: PIIAccessLog[]
  high_risk_accesses: PIIAccessLog[]
}

export interface PIIAccessPolicy {
  id: string
  name: string
  description: string
  resource_types: string[]
  requires_approval: boolean
  auto_approve_roles: AppRole[]
  retention_days: number
  notification_enabled: boolean
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string

  // Relations
  created_by_profile?: Profile
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  details?: Record<string, unknown> | null
  changes?: Record<string, { old: unknown; new: unknown }> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface TemporaryApprover {
  id: string
  delegator_id: string
  delegate_id: string
  scope_type: 'property' | 'department' | 'all'
  scope_id: string | null
  start_at: string
  end_at: string
  created_at: string
}

export interface EscalationRule {
  id: string
  action_type: string
  threshold_hours: number
  next_role: AppRole
  is_active: boolean
  created_at: string
  updated_at: string | null
}
