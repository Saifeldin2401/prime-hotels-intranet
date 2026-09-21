import type { AppRole } from '../constants'
// Onboarding System Interfaces
interface OnboardingTemplate {
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

interface OnboardingTaskDefinition {
  title: string
  description?: string
  assignee_role: 'self' | 'manager' | 'it' | 'hr'
  due_day_offset: number
  link_type?: 'training' | 'document' | 'url'
  link_id?: string
}
