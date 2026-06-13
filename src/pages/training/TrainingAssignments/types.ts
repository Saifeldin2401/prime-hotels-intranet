import type { LearningProgress } from '@/hooks/useLearningProgress'
import type { TrainingModule } from '@/lib/types'

export interface LearningAssignment {
  id: string
  target_type: 'all' | 'everyone' | 'user' | 'department' | 'property'
  target_id: string | null
  content_type: string
  content_id: string
  assigned_by: string | null
  due_date: string | null
  valid_from: string
  expires_at?: string | null
  priority: string
  instructions?: string | null
  requires_acknowledgement?: boolean | null
  notify_on_due?: boolean | null
  reminder_days_before?: number[] | null
  created_at: string
  training_modules?: TrainingModule
  profiles?: { id: string; full_name: string }
}

export type AssignmentStatus = 'active' | 'completed' | 'overdue' | 'due_soon'

export type EnrichedProgressRecord = LearningProgress & {
  resolvedDepartmentName: string
  resolvedModuleTitle: string
  resolvedProgress: number
  resolvedPropertyName: string
  resolvedScore: number | null
  resolvedUserName: string
  statusLabel: string
  userInitials: string
  lastTouchedAt: string
  locationLabel: string
}

export interface EmployeeProgressGroup {
  activeModules: number
  assignedModules: number
  attentionCount: number
  averageProgress: number
  averageScore: number | null
  completedModules: number
  departmentName: string
  excusedModules: number
  highlightModule: EnrichedProgressRecord | null
  inProgressModules: number
  lastTouchedAt: string | null
  locationLabel: string
  overdueModules: number
  propertyName: string
  records: EnrichedProgressRecord[]
  totalModules: number
  userId: string
  userInitials: string
  userName: string
  avatarUrl?: string
}

export interface TrainingAssignmentsPanelProps {
  embedded?: boolean
  initialTab?: 'overview' | 'assignments'
  defaultModuleId?: string
  autoOpen?: boolean
  hideCreateButton?: boolean
  hideHeaderActions?: boolean
}
