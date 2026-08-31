export type TenantLifecycleStatus =
  | 'prospect'
  | 'trial'
  | 'onboarding'
  | 'active'
  | 'suspended'
  | 'renewal'
  | 'archived'

export interface TenantEntitlements {
  max_hotels: number
  max_learners: number
  max_storage_gb: number
  max_ai_credits_monthly: number
  ai_credits_used_this_month: number
  trial_ends_at?: string | null
  lifecycle_status: TenantLifecycleStatus
}

export type CompetencyCategory =
  | 'hospitality_core'
  | 'guest_service'
  | 'pms_operations'
  | 'f_and_b'
  | 'safety_compliance'
  | 'leadership'

export interface Competency {
  id: string
  organization_id: string
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  category: CompetencyCategory
  department_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  levels?: CompetencyLevel[]
}

export interface CompetencyLevel {
  id: string
  competency_id: string
  level_number: number // 1 - 5
  title: string
  title_ar?: string | null
  behavioral_indicators?: string[]
}

export interface CourseCompetency {
  id: string
  course_id: string
  competency_id: string
  target_level: number
  weight: number
  competency?: Competency
}

export interface UserCompetency {
  id: string
  user_id: string
  competency_id: string
  organization_id: string
  current_level: number // 0 - 5
  assessed_score: number
  last_assessed_at: string
  assessed_by?: string | null
  evidence_type: 'assessment' | 'course_completion' | 'practical_evaluation' | 'manual_endorsement'
  evidence_id?: string | null
  competency?: Competency
}

export interface DepartmentCompetencyGap {
  competency_id: string
  competency_name: string
  competency_name_ar?: string | null
  category: CompetencyCategory
  required_level: number
  average_actual_level: number
  gap: number // required - actual
  compliance_percentage: number
  employees_below_target_count: number
  total_evaluated_count: number
}

export type SessionDeliveryMode = 'in_person' | 'virtual' | 'hybrid'
export type SessionAttendanceStatus = 'registered' | 'attended' | 'excused' | 'no_show' | 'failed'

export interface TrainingSession {
  id: string
  organization_id: string
  course_id?: string | null
  hotel_id: string
  title: string
  title_ar?: string | null
  description?: string | null
  delivery_mode: SessionDeliveryMode
  location_venue?: string | null
  virtual_meeting_url?: string | null
  instructor_id?: string | null
  start_time: string
  end_time: string
  max_capacity: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string | null
  created_at: string
  updated_at: string
  // Joins
  instructor?: { id: string; full_name: string; email: string; avatar_url?: string }
  hotel?: { id: string; name: string }
  course?: { id: string; title: string }
  attendees_count?: number
}

export interface TrainingSessionAttendee {
  id: string
  session_id: string
  user_id: string
  attendance_status: SessionAttendanceStatus
  score_percentage?: number | null
  feedback_comments?: string | null
  marked_by?: string | null
  marked_at?: string | null
  created_at: string
  user?: { id: string; full_name: string; email: string; avatar_url?: string }
}

export interface RubricCriterion {
  id: string
  title: string
  description?: string
  max_points: number
  weight?: number
}

export interface PracticalAssessment {
  id: string
  organization_id: string
  course_id?: string | null
  department_id?: string | null
  title: string
  title_ar?: string | null
  description?: string | null
  passing_score_percentage: number
  rubric_criteria: RubricCriterion[]
  is_active: boolean
  created_at: string
  updated_at: string
  // Joins
  course?: { id: string; title: string }
  department?: { id: string; name: string }
}

export interface PracticalSubmission {
  id: string
  assessment_id: string
  learner_id: string
  evaluator_id?: string | null
  hotel_id?: string | null
  score_achieved: number
  is_passed: boolean
  rubric_evaluations: Record<string, { points: number; comments?: string }>
  evaluator_feedback?: string | null
  learner_acknowledged_at?: string | null
  evaluated_at: string
  created_at: string
  // Joins
  learner?: { id: string; full_name: string; email: string; avatar_url?: string }
  evaluator?: { id: string; full_name: string; email: string }
  assessment?: PracticalAssessment
}

export interface EmployeeTransferLog {
  id: string
  organization_id: string
  user_id: string
  previous_hotel_id?: string | null
  new_hotel_id?: string | null
  previous_department_id?: string | null
  new_department_id?: string | null
  previous_role?: string | null
  new_role?: string | null
  transferred_by?: string | null
  transfer_effective_date: string
  retained_certificates_count: number
  assigned_delta_courses_count: number
  waived_obsolete_courses_count: number
  notes?: string | null
  created_at: string
}
