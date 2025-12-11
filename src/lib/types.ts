import type { AppRole, DocumentStatus, DocumentVisibility, AnnouncementPriority, NotificationType, TrainingProgressStatus } from './constants'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  hire_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role: AppRole
}

export interface Property {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Department {
  id: string
  property_id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface UserProperty {
  id: string
  user_id: string
  property_id: string
}

export interface UserDepartment {
  id: string
  user_id: string
  department_id: string
}

export interface Document {
  id: string
  title: string
  description: string | null
  file_url: string
  visibility: DocumentVisibility
  property_id: string | null
  department_id: string | null
  role: AppRole | null
  status: DocumentStatus
  requires_acknowledgment: boolean
  created_by: string
  current_version: number
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  file_url: string
  change_summary: string | null
  created_by: string
  created_at: string
}

export interface DocumentApproval {
  id: string
  document_id: string
  approver_id: string
  status: 'pending' | 'approved' | 'rejected'
  feedback: string | null
  approved_at: string | null
  created_at: string
}

export interface DocumentAcknowledgment {
  id: string
  document_id: string
  user_id: string
  acknowledged_at: string
}

export interface TrainingModule {
  id: string
  title: string
  description: string | null
  estimated_duration_minutes: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TrainingContentBlock {
  id: string
  training_module_id: string
  type: 'text' | 'image' | 'video' | 'document_link'
  content: string
  content_url: string | null
  content_data: Record<string, unknown> | null
  order: number
  is_mandatory: boolean
  created_at: string
}

export interface TrainingQuiz {
  id: string
  training_module_id: string
  question: string
  type: 'mcq' | 'true_false' | 'fill_blank'
  options: string[] | null
  correct_answer: string
  order: number
  created_at: string
}

export interface TrainingAssignment {
  id: string
  training_module_id: string
  assigned_to_user_id: string | null
  assigned_to_department_id: string | null
  assigned_to_property_id: string | null
  assigned_to_all: boolean
  deadline: string | null
  reminder_sent: boolean
  auto_enroll: boolean
  recurring_type: 'none' | 'monthly' | 'quarterly'
  created_by_role: string | null
  assigned_by: string
  created_at: string
}

export interface TrainingProgress {
  id: string
  user_id: string
  training_id: string
  assignment_id: string | null
  status: TrainingProgressStatus
  started_at: string | null
  completed_at: string | null
  quiz_score: number | null
  certificate_url: string | null
  created_at: string
  updated_at: string
}

export interface TrainingQuizAttempt {
  id: string
  user_id: string
  module_id: string
  score: number
  max_score: number
  passed: boolean
  attempt_number: number
  started_at: string
  completed_at: string | null
  answers: Record<string, unknown> | null
}

export interface TrainingCertificate {
  id: string
  training_progress_id: string | null
  certificate_url: string
  verification_code: string | null
  attempt_id: string | null
  issued_at: string
  expires_at: string | null
}

export interface TrainingPath {
  id: string
  title: string
  description: string
  path_type: 'new_hire' | 'department' | 'leadership' | 'compliance' | 'skills'
  estimated_duration_hours: number
  is_mandatory: boolean
  certificate_enabled: boolean
  is_published: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TrainingPathModule {
  id: string
  path_id: string
  module_id: string
  order_index: number
  is_mandatory: boolean
}

export interface UserPathEnrollment {
  id: string
  user_id: string
  path_id: string
  enrolled_at: string
  completed_at: string | null
}

export interface Announcement {
  id: string
  title: string
  content: string
  priority: AnnouncementPriority
  pinned: boolean
  scheduled_at: string | null
  expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AnnouncementTarget {
  id: string
  announcement_id: string
  target_properties: string[] | null
  target_departments: string[] | null
  target_roles: AppRole[] | null
}

export interface AnnouncementRead {
  id: string
  announcement_id: string
  user_id: string
  read_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  email_enabled: boolean
  approval_email: boolean
  training_email: boolean
  announcement_email: boolean
  maintenance_email: boolean
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface PIIAccessLog {
  id: string
  actor_id: string
  target_user_id: string
  fields_accessed: string[]
  reason: string | null
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

export interface MaintenanceTicket {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'electrical' | 'plumbing' | 'hvac' | 'internet' | 'tv' | 'furniture' | 'general'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  property_id: string
  department_id: string
  location: string | null
  estimated_cost: number | null
  actual_cost: number | null
  reported_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  property?: Property
  department?: Department
  assigned_to_profile?: Profile
}

export interface EmployeeReferral {
  id: string
  referrer_id: string
  candidate_id: string
  position_id: string
  property_id: string
  status: 'pending' | 'interviewing' | 'hired' | 'rejected'
  bonus_amount: number | null
  bonus_status: 'pending' | 'approved' | 'paid'
  notes: string | null
  created_at: string
  updated_at: string
  referrer?: Profile
  candidate?: Profile
  position?: Position
  property?: Property
}

export interface Position {
  id: string
  title: string
  department_id: string
  description: string | null
  requirements: string | null
  salary_range: string | null
  is_active: boolean
  created_at: string
}

export interface ApprovalRequest {
  id: string
  entity_type: string
  entity_id: string
  current_approver_id: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

