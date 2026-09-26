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

const PLATFORM_ROLES: PlatformRole[] = [
  'administrator',
  'training_manager',
  'knowledge_manager',
  'author',
  'learner',
]

/** Legacy role -> platform role. Mirrors public.platform_role_map in the DB. */
const LEGACY_ROLE_MAP: Record<LegacyRole, PlatformRole> = {
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

/** 'all_properties' is the stored name for "the whole organization". */
export type DocumentVisibility =
  | 'all_properties'
  | 'department'
  | 'specific_departments'
  | 'role'

export const DOCUMENT_VISIBILITY_OPTIONS: { value: DocumentVisibility; label: string }[] = [
  { value: 'all_properties', label: 'Whole organization' },
  { value: 'department', label: 'One department' },
  { value: 'specific_departments', label: 'Several departments' },
  { value: 'role', label: 'One role' },
]
export type TrainingProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'expired'

interface StandardJobTitle {
  id: string
  title: string
  title_ar: string
  category: string
  category_ar: string
  default_role: AppRole
}

export const STANDARD_JOB_TITLES: StandardJobTitle[] = [
  { id: 'gm', title: 'General Manager', title_ar: 'المدير العام', category: 'Executive', category_ar: 'الإدارة التنفيذية', default_role: 'administrator' },
  { id: 'agm', title: 'Assistant General Manager', title_ar: 'مساعد المدير العام', category: 'Executive', category_ar: 'الإدارة التنفيذية', default_role: 'administrator' },
  { id: 'ops-dir', title: 'Director of Operations', title_ar: 'مدير العمليات', category: 'Operations', category_ar: 'العمليات', default_role: 'corporate_admin' },
  { id: 'fom', title: 'Front Office Manager', title_ar: 'مدير المكاتب الأمامية', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'department_head' },
  { id: 'afom', title: 'Assistant Front Office Manager', title_ar: 'مساعد مدير المكاتب الأمامية', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'department_head' },
  { id: 'fd-sup', title: 'Front Desk Supervisor', title_ar: 'مشرف الاستقبال', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'staff' },
  { id: 'fd-agent', title: 'Front Desk Agent', title_ar: 'موظف استقبال', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'staff' },
  { id: 'concierge', title: 'Concierge', title_ar: 'كونسيرج', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'staff' },
  { id: 'night-audit', title: 'Night Auditor', title_ar: 'مراجع ليلي', category: 'Front Office', category_ar: 'المكاتب الأمامية', default_role: 'staff' },
  { id: 'exec-hk', title: 'Executive Housekeeper', title_ar: 'مدير التدبير المنزلي', category: 'Housekeeping', category_ar: 'التدبير المنزلي', default_role: 'department_head' },
  { id: 'hk-sup', title: 'Housekeeping Supervisor', title_ar: 'مشرف التدبير المنزلي', category: 'Housekeeping', category_ar: 'التدبير المنزلي', default_role: 'staff' },
  { id: 'room-attendant', title: 'Room Attendant', title_ar: 'عامل غرف', category: 'Housekeeping', category_ar: 'التدبير المنزلي', default_role: 'staff' },
  { id: 'laundry-sup', title: 'Laundry Supervisor', title_ar: 'مشرف المغسلة', category: 'Housekeeping', category_ar: 'التدبير المنزلي', default_role: 'staff' },
  { id: 'fb-dir', title: 'Food & Beverage Director', title_ar: 'مدير الأغذية والمشروبات', category: 'Food & Beverage', category_ar: 'الأغذية والمشروبات', default_role: 'department_head' },
  { id: 'fb-mgr', title: 'Restaurant Manager', title_ar: 'مدير المطعم', category: 'Food & Beverage', category_ar: 'الأغذية والمشروبات', default_role: 'department_head' },
  { id: 'exec-chef', title: 'Executive Chef', title_ar: 'رئيس الطهاة', category: 'Culinary', category_ar: 'المطبخ', default_role: 'department_head' },
  { id: 'sous-chef', title: 'Sous Chef', title_ar: 'مساعد رئيس الطهاة', category: 'Culinary', category_ar: 'المطبخ', default_role: 'staff' },
  { id: 'fb-captain', title: 'F&B Captain', title_ar: 'كابتن مطعم', category: 'Food & Beverage', category_ar: 'الأغذية والمشروبات', default_role: 'staff' },
  { id: 'waiter', title: 'Waiter / Server', title_ar: 'نادل', category: 'Food & Beverage', category_ar: 'الأغذية والمشروبات', default_role: 'staff' },
  { id: 'hr-dir', title: 'Director of Human Resources', title_ar: 'مدير الموارد البشرية', category: 'Human Resources', category_ar: 'الموارد البشرية', default_role: 'property_hr' },
  { id: 'hr-mgr', title: 'Human Resources Manager', title_ar: 'مدير الموارد البشرية', category: 'Human Resources', category_ar: 'الموارد البشرية', default_role: 'property_hr' },
  { id: 'training-mgr', title: 'Training Manager', title_ar: 'مدير التدريب', category: 'Human Resources', category_ar: 'الموارد البشرية', default_role: 'training_manager' },
  { id: 'chief-eng', title: 'Chief Engineer', title_ar: 'كبير المهندسين', category: 'Engineering & Maintenance', category_ar: 'الهندسة والصيانة', default_role: 'department_head' },
  { id: 'maint-tech', title: 'Maintenance Technician', title_ar: 'فني صيانة', category: 'Engineering & Maintenance', category_ar: 'الهندسة والصيانة', default_role: 'staff' },
  { id: 'sec-mgr', title: 'Security Manager', title_ar: 'مدير الأمن والسلامة', category: 'Security', category_ar: 'الأمن', default_role: 'department_head' },
  { id: 'sec-officer', title: 'Security Officer', title_ar: 'ضابط أمن', category: 'Security', category_ar: 'الأمن', default_role: 'staff' },
  { id: 'fin-dir', title: 'Director of Finance', title_ar: 'المدير المالي', category: 'Finance', category_ar: 'المالية', default_role: 'department_head' },
  { id: 'sales-dir', title: 'Director of Sales & Marketing', title_ar: 'مدير المبيعات والتسويق', category: 'Sales & Marketing', category_ar: 'المبيعات والتسويق', default_role: 'department_head' },
  { id: 'it-mgr', title: 'IT Manager', title_ar: 'مدير تقنية المعلومات', category: 'Information Technology', category_ar: 'تقنية المعلومات', default_role: 'department_head' },
  { id: 'learner', title: 'Trainee / Intern', title_ar: 'متدرب', category: 'Training', category_ar: 'التدريب', default_role: 'learner' },
]

