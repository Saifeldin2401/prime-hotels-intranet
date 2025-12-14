import type { AppRole, DocumentStatus, DocumentVisibility, AnnouncementPriority, TrainingProgressStatus } from './constants'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  hire_date: string | null
  job_title: string | null // Actual hotel job title (e.g., "Front Office Manager", "Room Attendant")
  reporting_to: string | null // UUID of supervisor/manager
  is_active: boolean
  created_at: string
  updated_at: string

  // Relations
  reporting_to_profile?: Profile // Populated when fetching with joins
  roles?: AppRole[]
  properties?: Property[]
  departments?: Department[]
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

// Task Management Interfaces
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority

  // Assignment
  assigned_to_id: string | null
  created_by_id: string

  // Organization
  property_id: string | null
  department_id: string | null

  // Dates
  due_date: string | null
  start_date: string | null
  completed_at: string | null

  // Metadata
  tags: string[] | null
  estimated_hours: number | null
  actual_hours: number | null

  created_at: string
  updated_at: string

  // Relations
  assigned_to?: Profile
  created_by?: Profile
  property?: Property
  department?: Department
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  watchers?: Profile[]
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string

  // Relations
  author?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
  uploaded_by_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null
  created_at: string

  // Relations
  uploaded_by?: Profile
}

export interface TaskStats {
  total_tasks: number
  todo_tasks: number
  in_progress_tasks: number
  review_tasks: number
  completed_tasks: number
  overdue_tasks: number
}


// Messaging System Interfaces
export interface Message {
  id: string
  sender_id: string
  recipient_id: string | null // null for broadcast messages
  subject: string
  content: string
  message_type: 'direct' | 'broadcast' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'archived'
  sent_at: string | null
  read_at: string | null
  parent_message_id: string | null // for replies
  property_id: string | null
  department_id: string | null
  created_at: string
  updated_at: string

  // Relations
  sender?: Profile
  recipient?: Profile
  property?: Property
  department?: Department
  parent_message?: Message
  replies?: Message[]
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  uploaded_by_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  description: string | null
  created_at: string

  // Relations
  message?: Message
  uploaded_by?: Profile
}

export interface Comment {
  id: string
  entity_type: 'task' | 'maintenance_ticket' | 'document' | 'training'
  entity_id: string
  author_id: string
  content: string
  parent_comment_id: string | null // for replies
  is_internal: boolean // only visible to staff
  is_edited: boolean
  edited_at: string | null
  created_at: string
  updated_at: string

  // Relations
  author?: Profile
  parent_comment?: Comment
  replies?: Comment[]
  mentions?: Profile[]
}

export interface Conversation {
  id: string
  participant_ids: string[]
  last_message_at: string
  last_message_preview: string
  is_archived: boolean
  created_at: string
  updated_at: string

  // Relations
  participants?: Profile[]
  messages?: Message[]
}

export interface Notification {
  id: string
  user_id: string
  type: 'approval_required' | 'request_approved' | 'request_rejected' | 'request_submitted' | 'comment_added' | 'request_returned' | 'request_closed' | 'training_assigned' | 'training_deadline' | 'document_published' | 'document_acknowledgment_required' | 'announcement_new' | 'escalation_alert' | 'referral_status_update' | 'maintenance_assigned' | 'maintenance_resolved' | 'message' | 'mention' | 'task_assigned' | 'system'
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, any> | null
  is_read: boolean
  read_at: string | null
  created_at: string

  // Relations
  user?: Profile
}

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
  type: 'text' | 'image' | 'video' | 'document_link' | 'quiz' | 'sop_reference'
  content: string
  content_url: string | null
  content_data: Record<string, unknown> | null
  order: number
  is_mandatory: boolean
  created_at: string
}

/**
 * @deprecated Use LearningQuiz and KnowledgeQuestion system instead.
 * Legacy inline questions are no longer created via TrainingBuilder.
 * Existing data may still be read for backwards compatibility.
 */
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

export interface NotificationPreference {
  id: string
  user_id: string
  email_enabled: boolean
  approval_email: boolean
  training_email: boolean
  announcement_email: boolean
  maintenance_email: boolean
  browser_push_enabled: boolean
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

export interface MaintenanceComment {
  id: string
  ticket_id: string
  author_id: string
  comment: string
  internal_only: boolean
  created_at: string
  author?: Profile
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

export interface LeaveRequest {
  id: string
  requester_id: string
  property_id: string | null
  department_id: string | null
  start_date: string
  end_date: string
  type: 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity' | 'personal' | 'other'
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by_id: string | null
  rejected_by_id: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  requester?: Profile
  property?: Property
  department?: Department
  approved_by?: Profile
  rejected_by?: Profile
}

export interface MaintenanceTicket {
  id: string
  title: string
  description: string
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'cosmetic' | 'safety' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  status: 'open' | 'in_progress' | 'pending_parts' | 'completed' | 'cancelled'
  property_id: string | null
  department_id: string | null
  room_number: string | null
  reported_by_id: string
  assigned_to_id: string | null
  estimated_completion_date: string | null
  actual_completion_date: string | null
  parts_needed: string | null
  labor_hours: number | null
  material_cost: number | null
  notes: string | null
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
  file_type: string
  file_size: number | null
  description: string | null
  created_at: string
  uploaded_by?: Profile
}

// Job Posting System Interfaces
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary'
export type JobPostingStatus = 'draft' | 'open' | 'closed' | 'filled' | 'cancelled'
export type JobApplicationStatus = 'received' | 'review' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface JobPosting {
  id: string
  title: string
  department_id: string | null
  property_id: string | null
  seniority_level: SeniorityLevel
  employment_type: EmploymentType
  description: string | null
  requirements: string | null
  responsibilities: string | null
  salary_range_min: number | null
  salary_range_max: number | null
  status: JobPostingStatus
  created_by: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  closes_at: string | null

  // Relations
  department?: Department
  property?: Property
  created_by_profile?: Profile
  applications?: JobApplication[]
}

export interface JobApplication {
  id: string
  job_posting_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  cv_url: string | null
  cover_letter: string | null
  status: JobApplicationStatus
  referred_by: string | null
  routed_to: string[]
  notes: string | null
  created_at: string
  updated_at: string

  // Relations
  job_posting?: JobPosting
  referrer?: Profile
  routed_to_profiles?: Profile[]
}

// Promotion & Transfer System Interfaces
export interface EmployeePromotion {
  id: string
  employee_id: string
  from_role: string | null
  to_role: string
  from_title: string | null
  to_title: string
  from_department_id: string | null
  to_department_id: string | null
  effective_date: string
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string

  // Relations
  employee?: Profile
  approver?: Profile
  from_department?: Department
  to_department?: Department
}

export interface EmployeeTransfer {
  id: string
  employee_id: string
  from_property_id: string | null
  to_property_id: string
  from_department_id: string | null
  to_department_id: string | null
  effective_date: string
  approved_by: string | null
  reason: string | null
  notes: string | null
  created_at: string
  updated_at: string

  // Relations
  employee?: Profile
  approver?: Profile
  from_property?: Property
  to_property?: Property
  from_department?: Department
  to_department?: Department
}

// SOP System Interfaces
export type SOPStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived'
export type QuizQuestionType = 'mcq' | 'true_false' | 'fill_blank'

export interface SOPDocument {
  id: string
  title: string
  content: string | null
  version: number
  status: SOPStatus
  category: string | null
  property_id: string | null
  department_id: string | null
  created_by: string | null
  approved_by: string | null
  published_at: string | null
  requires_quiz: boolean
  passing_score: number
  quiz_enabled: boolean
  created_at: string
  updated_at: string

  // Relations
  property?: Property
  department?: Department
  created_by_profile?: Profile
  approved_by_profile?: Profile
  quiz_questions?: SOPQuizQuestion[]
}

export interface SOPQuizQuestion {
  id: string
  sop_document_id: string
  question_text: string
  question_type: QuizQuestionType
  options: string[] | null
  correct_answer: string
  points: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface SOPQuizAttempt {
  id: string
  sop_document_id: string
  user_id: string
  score: number
  total_points: number
  percentage: number
  passed: boolean
  answers: Array<{
    question_id: string
    answer: string
    correct: boolean
  }>
  started_at: string
  completed_at: string | null
  certificate_url: string | null
  created_at: string

  // Relations
  sop_document?: SOPDocument
  user?: Profile
}

// Job Title Mapping Interface
export interface JobTitleMapping {
  id: string
  job_title: string
  system_role: AppRole
  category: string | null
  created_at: string
}

export interface SOPAssignment {
  id: string
  sop_document_id: string
  assigned_to_user_id: string
  assigned_by: string | null
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string

  // Relations
  sop_document?: SOPDocument
  assigned_to?: Profile
  assigned_by_profile?: Profile
}

export interface SOPReadingLog {
  id: string
  sop_document_id: string
  user_id: string
  read_at: string
  completed: boolean

  // Relations
  sop_document?: SOPDocument
  user?: Profile
}
