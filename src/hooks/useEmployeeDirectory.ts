import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { exportRowsToXlsx } from '@/lib/excel'
import type { AppRole } from '@/lib/constants'

export type ManagementLevelFilter = 'all' | 'executive' | 'management' | 'staff'
export type DirectorySort = 'name_asc' | 'name_desc' | 'joining_date_asc' | 'joining_date_desc'

export interface EmployeeDirectoryFilters {
  search?: string
  propertyId?: string
  departmentId?: string
  role?: AppRole | 'all'
  managementLevel?: ManagementLevelFilter
  sort?: DirectorySort
  includeInactive?: boolean
}

export interface EmployeeDirectoryRecord {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  work_email: string
  phone_extension: string | null
  bio: string | null
  joining_date: string | null
  is_active: boolean
  staff_id: string | null
  manager_id: string | null
  manager_name: string | null
  manager_title: string | null
  primary_property_id: string | null
  primary_property_name: string | null
  primary_department_id: string | null
  primary_department_name: string | null
  property_ids: string[]
  property_names: string[]
  department_ids: string[]
  department_names: string[]
  roles: AppRole[]
  management_level: 'executive' | 'management' | 'staff'
  updated_at: string
}

export interface BirthdayRecord {
  id: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  property_name: string | null
  birthday: string
  age: number
}

export function useEmployeeDirectory(filters: EmployeeDirectoryFilters) {
  return useQuery({
    queryKey: ['employee-directory-rpc', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employee_directory', {
        p_search: filters.search || null,
        p_property_id: filters.propertyId && filters.propertyId !== 'all' ? filters.propertyId : null,
        p_department_id: filters.departmentId && filters.departmentId !== 'all' ? filters.departmentId : null,
        p_role: filters.role && filters.role !== 'all' ? filters.role : null,
        p_management_level: filters.managementLevel || 'all',
        p_sort: filters.sort || 'name_asc',
        p_include_inactive: !!filters.includeInactive
      })

      if (error) throw error
      return (data || []) as EmployeeDirectoryRecord[]
    },
    staleTime: 60_000
  })
}

export function useTodaysBirthdays(propertyId?: string) {
  return useQuery({
    queryKey: ['todays-birthdays', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_todays_birthdays', {
        p_property_id: propertyId && propertyId !== 'all' ? propertyId : null
      })
      if (error) throw error
      return (data || []) as BirthdayRecord[]
    },
    staleTime: 60_000
  })
}

export async function exportMonthlyBirthdays(params: {
  month: number
  year: number
  propertyId?: string
}) {
  const { data, error } = await supabase.rpc('export_birthdays_for_month', {
    p_month: params.month,
    p_year: params.year,
    p_property_id: params.propertyId && params.propertyId !== 'all' ? params.propertyId : null
  })

  if (error) throw error

  const rows = (data || []).map((row: any) => ({
    Name: row.full_name || '',
    JobTitle: row.job_title || '',
    Hotel: row.hotel || '',
    Department: row.department || '',
    Birthday: row.birthday_date || '',
    Age: row.age || ''
  }))

  const now = new Date()
  const fileName = `birthdays_${params.year}_${String(params.month).padStart(2, '0')}_${now.getTime()}.xlsx`
  await exportRowsToXlsx(rows, fileName, 'Birthdays')
}

