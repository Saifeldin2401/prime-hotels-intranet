import type { AppRole } from '../constants'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  hire_date: string | null
  date_of_birth: string | null
  job_title: string | null // Actual hotel job title (e.g., "Front Office Manager", "Room Attendant")
  staff_id: string | null // Human-readable unique employee identifier (e.g., "PH-1001")
  reporting_to: string | null // UUID of supervisor/manager
  is_active: boolean
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  nationality: string | null
  blood_group: string | null
  created_at: string
  updated_at: string
  is_temp_password?: boolean
  password_initialized?: boolean
  password_last_changed_at?: string | null

  // Account lifecycle
  account_status?: 'active' | 'suspended' | 'locked'
  suspended_at?: string | null
  suspended_by?: string | null
  suspend_reason?: string | null
  suspended_until?: string | null
  last_login_at?: string | null
  force_password_reset?: boolean

  // Employment details
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'probation' | 'intern'
  contract_end_date?: string | null
  iqama_number?: string | null
  iqama_expiry?: string | null

  // Public profile fields (added by migration 20260221170000)
  bio?: string | null
  phone_extension?: string | null

  // Private profile fields – HR/Admin only (added by migration 20260221170000)
  national_id?: string | null
  salary_grade?: string | null

  // Relations
  reporting_to_profile?: Profile // Populated when fetching with joins
  roles?: AppRole[]
  role?: AppRole | null
  properties?: Property[]
  property?: Property | null
  departments?: Department[]
  department_id?: string | null
}

export interface UserRole {
  id: string
  user_id: string
  role: AppRole
}

export interface Company {
  id: string
  name: string
  name_ar: string | null
  code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  company_id: string
  name: string
  name_ar: string | null
  code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  address: string | null
  phone: string | null
  is_active: boolean
  latitude: number | null
  longitude: number | null
  created_at: string
  company_id?: string | null
  brand_id?: string | null
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
