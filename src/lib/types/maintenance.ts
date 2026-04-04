import type { EntityStatus } from './index'
import type { Department, Profile, Property } from './profile'

export interface MaintenanceTicket {
  id: string
  title: string
  description: string
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'safety' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  status: EntityStatus
  property_id: string | null
  department_id: string | null
  room_number: string | null
  location?: string | null
  reported_by_id: string
  assigned_to_id: string | null
  estimated_completion_date: string | null
  actual_completion_date: string | null
  parts_needed: string | null
  labor_hours: number | null
  material_cost: number | null
  estimated_cost: number | null
  notes: string | null
  due_at?: string | null
  sla_hours?: number | null
  escalated_at?: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  reported_by?: Profile
  property?: Property
  department?: Department
  assigned_to?: Profile
  comments?: MaintenanceComment[]
  attachments?: MaintenanceAttachment[]
}

export interface MaintenanceComment {
  id: string
  ticket_id: string
  author_id: string
  comment: string
  internal_only: boolean
  created_at: string
  author?: Profile
}

export interface MaintenanceAttachment {
  id: string
  ticket_id: string
  uploaded_by_id: string
  file_name: string
  file_path: string
  storage_bucket?: string | null
  storage_path?: string | null
  file_type: string
  file_size: number | null
  description: string | null
  created_at: string
  uploaded_by?: Profile
}
