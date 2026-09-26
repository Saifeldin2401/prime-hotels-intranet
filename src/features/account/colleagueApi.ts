/**
 * A colleague's public profile, as the `get_employee_public_profile` RPC
 * exposes it (the RPC decides what the viewer may see).
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DirectReport {
  id: string
  full_name: string
  job_title: string | null
  avatar_url: string | null
}

export interface PublicProfile {
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
  property_names: string[] | null
  department_names: string[] | null
  roles: string[] | null
  skills: string[] | null
  certifications: string[] | null
  direct_reports: DirectReport[] | null
}

export async function fetchPublicProfile(id: string): Promise<PublicProfile> {
  const { data, error } = await supabase.rpc('get_employee_public_profile', { p_profile_id: id })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Profile not found')
  return row as unknown as PublicProfile
}

export function usePublicProfile(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['employee-public-profile', id],
    queryFn: () => fetchPublicProfile(id as string),
    enabled: !!id && enabled,
  })
}
