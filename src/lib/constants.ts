export type AppRole =
  | 'regional_admin'
  | 'regional_hr'
  | 'property_manager'
  | 'property_hr'
  | 'department_head'
  | 'staff'

export const ROLES: Record<AppRole, { label: string; level: number }> = {
  regional_admin: { label: 'Regional Admin', level: 1 },
  regional_hr: { label: 'Regional HR', level: 2 },
  property_manager: { label: 'Property Manager', level: 3 },
  property_hr: { label: 'Property HR', level: 4 },
  department_head: { label: 'Department Head', level: 5 },
  staff: { label: 'Staff', level: 6 },
}

export const ROLE_HIERARCHY: AppRole[] = [
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
  'department_head',
  'staff',
]

export type DocumentStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'

export const DOCUMENT_STATUSES: Record<DocumentStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'gray' },
  PENDING_REVIEW: { label: 'Pending Review', color: 'yellow' },
  APPROVED: { label: 'Approved', color: 'blue' },
  PUBLISHED: { label: 'Published', color: 'green' },
  REJECTED: { label: 'Rejected', color: 'red' },
}

export type DocumentVisibility =
  | 'all_properties'
  | 'property'
  | 'department'
  | 'role'

export const DOCUMENT_VISIBILITY_OPTIONS: { value: DocumentVisibility; label: string }[] = [
  { value: 'all_properties', label: 'All Properties' },
  { value: 'property', label: 'Specific Property' },
  { value: 'department', label: 'Specific Department' },
  { value: 'role', label: 'Specific Role' },
]

export type AnnouncementPriority =
  | 'normal'
  | 'important'
  | 'critical'

export const ANNOUNCEMENT_PRIORITIES: Record<AnnouncementPriority, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'blue' },
  important: { label: 'Important', color: 'orange' },
  critical: { label: 'Critical', color: 'red' },
}

export type NotificationType =
  // Approval workflow
  | 'approval_required'
  | 'request_approved'
  | 'request_rejected'
  | 'request_submitted'
  | 'request_returned'
  | 'request_closed'
  // Comments
  | 'comment_added'
  // Training
  | 'training_assigned'
  | 'training_deadline'
  | 'training_completed'
  | 'training_overdue'
  // Documents
  | 'document_published'
  | 'document_acknowledgment_required'
  | 'document_approved'
  | 'document_rejected'
  // Announcements
  | 'announcement_new'
  // Escalation
  | 'escalation_alert'
  // HR
  | 'referral_status_update'
  | 'promotion_approved'
  | 'transfer_approved'
  // Maintenance
  | 'maintenance_assigned'
  | 'maintenance_resolved'
  | 'maintenance_updated'
  // Messaging
  | 'message_received'
  | 'mention'
  // Tasks
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  // SOP
  | 'sop_assigned'
  | 'sop_quiz_required'
  | 'sop_quiz_passed'
  | 'sop_quiz_failed'
  // System
  | 'system'

export type TrainingProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'expired'

export const TRAINING_STATUSES: Record<TrainingProgressStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  expired: { label: 'Expired', color: 'red' },
}

export const ESCALATION_THRESHOLD_HOURS = 48

