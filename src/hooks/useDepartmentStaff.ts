import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { useEffect, useState } from 'react'

export interface DepartmentStaffMember extends Profile {
    status?: 'on_shift' | 'off_duty' | 'leave'
    current_shift?: {
        start: string
        end: string
    }
}

export function useDepartmentStaff(departmentId: string | undefined, propertyId: string | undefined) {
    const [staff, setStaff] = useState<DepartmentStaffMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!departmentId) {
            setLoading(false)
            return
        }

        const fetchStaff = async () => {
            try {
                setLoading(true)

                // 1. Get users in this department
                // We join user_departments to filter, and get profile data
                const { data: userDepts, error: staffError } = await supabase
                    .from('user_departments')
                    .select(`
            user_id,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url,
              job_title,
              phone
            )
          `)
                    .eq('department_id', departmentId)

                if (staffError) throw staffError

                const staffMembers = (userDepts || [])
                    .map((ud) => Array.isArray(ud.profiles) ? ud.profiles[0] : ud.profiles)
                    .filter(Boolean)
                    .map((profile) => ({
                        ...profile,
                        status: 'off_duty' // Default
                    })) as DepartmentStaffMember[]

                // 2. "Smart" Feature: Check active shifts for these users
                if (staffMembers.length > 0) {
                    const startOfDay = new Date()
                    startOfDay.setHours(0, 0, 0, 0)
                    const endOfDay = new Date(startOfDay)
                    endOfDay.setDate(endOfDay.getDate() + 1)

                    const { data: shifts } = await supabase
                        .from('shifts')
                        .select('*')
                        .in('user_id', staffMembers.map(s => s.id))
                        .gte('start_time', startOfDay.toISOString())
                        .lt('start_time', endOfDay.toISOString())
                        .neq('status', 'cancelled')

                    if (shifts) {
                        staffMembers.forEach(member => {
                            const memberShift = shifts.find(s => s.user_id === member.id)
                            if (memberShift) {
                                member.status = 'on_shift'
                                member.current_shift = {
                                    start: memberShift.start_time,
                                    end: memberShift.end_time
                                }
                            }
                        })
                    }
                }

                setStaff(staffMembers)
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error'
                console.error('Error fetching department staff:', err)
                setError(errorMessage)
            } finally {
                setLoading(false)
            }
        }

        fetchStaff()
    }, [departmentId, propertyId])

    return { staff, loading, error }
}
