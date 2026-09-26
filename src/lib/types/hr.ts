import type { EntityStatus } from './index'
import type { Department, Profile } from './profile'
// Job Posting System Interfaces
type SeniorityLevel = 'junior' | 'mid' | 'senior' | 'manager' | 'director' | 'executive'
type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary'
type JobPostingStatus = EntityStatus
type JobApplicationStatus = 'received' | 'review' | 'shortlisted' | 'interview' | 'offer' | 'hired' | 'rejected'

interface JobPosting {
  id: string
  title: string
  department_id: string | null
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
  created_by_profile?: Profile
  applications?: JobApplication[]
}

interface JobApplication {
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
// Job Title Mapping Interface
