/**
 * Platform roles for the Training + Knowledge Base + Quiz product.
 * These are the 5 roles the app is migrating to (additive permissions):
 *   learner < author / knowledge_manager < training_manager < administrator
 *
 * See docs/roles-and-rls.md and supabase/migrations/20260901110000_five_role_model.sql.
 */
export type PlatformRole =
  | 'learner'
  | 'author'
  | 'knowledge_manager'
  | 'training_manager'
  | 'administrator'

/**
 * Legacy hospitality roles. Kept in the union during the cutover so the ~68
 * files still referencing them keep type-checking. New code should target
 * PlatformRole. DB-side, both vocabularies resolve through has_role().
 */
export type LegacyRole =
  | 'super_admin'
  | 'corporate_admin'
  | 'regional_admin'
  | 'regional_hr'
  | 'property_manager'
  | 'property_hr'
  | 'department_head'
  | 'manager'
  | 'staff'

export type AppRole = PlatformRole | LegacyRole

export const PLATFORM_ROLES: PlatformRole[] = [
  'administrator',
  'training_manager',
  'knowledge_manager',
  'author',
  'learner',
]

/** Legacy role -> platform role. Mirrors public.platform_role_map in the DB. */
export const LEGACY_ROLE_MAP: Record<LegacyRole, PlatformRole> = {
  super_admin: 'administrator',
  corporate_admin: 'administrator',
  regional_admin: 'training_manager', // business call: curate/assign, not platform admin
  regional_hr: 'training_manager',
  property_manager: 'training_manager', // business call: curate/assign, not platform admin
  property_hr: 'training_manager', // also carries knowledge_manager rights
  department_head: 'author',
  manager: 'learner',
  staff: 'learner',
}

/** Resolve any role (legacy or platform) to its platform role. */
export function toPlatformRole(role: AppRole | null | undefined): PlatformRole | null {
  if (!role) return null
  if ((PLATFORM_ROLES as string[]).includes(role)) return role as PlatformRole
  return LEGACY_ROLE_MAP[role as LegacyRole] ?? null
}

export const ROLES: Record<AppRole, { label: string; level: number }> = {
  // Platform roles (lower level = more authority), interleaved with legacy
  // levels so canRoleAccess()'s inheritance comparison stays coherent.
  administrator: { label: 'Administrator', level: 1 },
  training_manager: { label: 'Training Manager', level: 2 },
  knowledge_manager: { label: 'Knowledge Manager', level: 3 },
  author: { label: 'Author', level: 6 },
  learner: { label: 'Learner', level: 8 },
  // Legacy hospitality roles
  super_admin: { label: 'Super Admin', level: 0 },
  corporate_admin: { label: 'Corporate Admin', level: 1 },
  regional_admin: { label: 'Regional Admin', level: 2 },
  regional_hr: { label: 'Regional HR', level: 3 },
  property_manager: { label: 'Property Manager', level: 4 },
  property_hr: { label: 'Property HR', level: 5 },
  department_head: { label: 'Department Head', level: 6 },
  manager: { label: 'Manager', level: 7 },
  staff: { label: 'Staff', level: 8 },
}

/** Platform role hierarchy, most privileged first. */
export const ROLE_HIERARCHY: AppRole[] = [
  'administrator',
  'training_manager',
  'knowledge_manager',
  'author',
  'learner',
]

/** Full legacy hierarchy, retained for code that still walks the old ladder. */
export const LEGACY_ROLE_HIERARCHY: LegacyRole[] = [
  'super_admin',
  'corporate_admin',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
  'department_head',
  'manager',
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
  | 'group_department'
  | 'specific_departments'
  | 'role'

export const DOCUMENT_VISIBILITY_OPTIONS: { value: DocumentVisibility; label: string }[] = [
  { value: 'all_properties', label: 'Organization-Wide (All Hotels)' },
  { value: 'property', label: 'Specific Hotel' },
  { value: 'department', label: 'Specific Department (This Hotel)' },
  { value: 'group_department', label: 'Specific Department (Organization-Wide)' },
  { value: 'specific_departments', label: 'Specific Departments (Custom)' },
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

