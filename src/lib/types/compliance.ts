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
