import type { AppRole } from '../constants'
import type { EntityStatus } from './index'
import type { Department, Profile, Property } from './profile'

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
  status: EntityStatus
  approved_by_id: string | null
  rejected_by_id: string | null
  rejection_reason: string | null
  workflow_request_id: string | null
  created_at: string
  updated_at: string
  requester?: Profile
  property?: Property
  department?: Department
  approved_by?: Profile
  rejected_by?: Profile
  workflow?: {
    id: string
    request_no: number
  }
}

export interface ExpenseClaim {
  id: string
  requester_id: string
  property_id: string | null
  department_id: string | null
  category: 'travel' | 'meals' | 'accommodation' | 'transport' | 'supplies' | 'training' | 'medical' | 'other'
  amount: number
  currency: string
  expense_date: string
  vendor_name: string | null
  description: string | null
  receipt_bucket: string
  receipt_path: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'returned_for_correction' | 'paid' | 'cancelled'
  workflow_request_id: string | null
  approved_by_id: string | null
  approved_at: string | null
  rejected_by_id: string | null
  rejected_at: string | null
  rejection_reason: string | null
  paid_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  requester?: Profile
  property?: Property
  department?: Department
  workflow?: {
    id: string
    request_no: number
    status?: string
  } | null
}

// Job Posting System Interfaces
export type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary'
export type JobPostingStatus = EntityStatus
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
  cv_bucket?: string | null
  cv_path?: string | null
  cv_filename?: string | null
  cv_mime?: string | null
  cv_size?: number | null
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

// Job Title Mapping Interface
export interface JobTitleMapping {
  id: string
  job_title: string
  system_role: AppRole
  category: string | null
  created_at: string
}
