import type { AppRole } from '../constants'
import type { EntityStatus } from './index'
import type { Profile } from './profile'

// Onboarding System Interfaces
export interface OnboardingTemplate {
  id: string
  title: string
  role: AppRole | null
  job_title: string | null
  department_id: string | null
  tasks: OnboardingTaskDefinition[]
  required_training_ids?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingTaskDefinition {
  title: string
  description?: string
  assignee_role: 'self' | 'manager' | 'it' | 'hr'
  due_day_offset: number
  link_type?: 'training' | 'document' | 'url'
  link_id?: string
}

export interface OnboardingProcess {
  id: string
  user_id: string
  template_id: string | null
  status: EntityStatus
  start_date: string
  progress_percent: number
  created_at: string
  updated_at: string

  // Relations
  user?: Profile
  template?: OnboardingTemplate
  tasks?: OnboardingTask[]
}

export interface OnboardingTask {
  id: string
  process_id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed'
  assigned_to_id: string | null
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
  order_index?: number
  link_type?: 'training' | 'document' | 'url'
  link_id?: string

  // Relations
  assigned_to?: Profile
}
