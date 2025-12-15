import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'

// Types
export interface LeaveEvent {
    id: string
    user_id: string
    user_name: string
    department_id: string
    department_name: string
    start_date: string
    end_date: string
    leave_type: string
    status: 'pending' | 'approved' | 'rejected'
}

export interface DepartmentCoverage {
    department_id: string
    department_name: string
    total_staff: number
    staff_on_leave: number
    coverage_percentage: number
    upcoming_leaves: number
}

export interface LeaveCoverageData {
    events: LeaveEvent[]
    coverage: DepartmentCoverage[]
    conflicts: LeaveConflict[]
}

export interface LeaveConflict {
    department_id: string
    department_name: string
    date: string
    staff_on_leave: number
    total_staff: number
    coverage_percentage: number
    is_critical: boolean
}

// Get leave events for a date range
export function useLeaveEvents(startDate: Date, endDate: Date, departmentId?: string) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['leave-events', currentProperty?.id, startDate.toISOString(), endDate.toISOString(), departmentId],
        queryFn: async (): Promise<LeaveEvent[]> => {
            let query = supabase
                .from('leave_requests')
                .select('id, user_id, department_id, start_date, end_date, leave_type, status')
                .gte('end_date', startDate.toISOString().split('T')[0])
                .lte('start_date', endDate.toISOString().split('T')[0])
                .in('status', ['approved', 'pending'])

            if (currentProperty?.id && currentProperty.id !== 'all') {
                query = query.eq('property_id', currentProperty.id)
            }

            if (departmentId) {
                query = query.eq('department_id', departmentId)
            }

            const { data: leaves, error } = await query

            if (error) throw error
            if (!leaves || leaves.length === 0) return []

            // Manually fetch user profiles and departments to ensure data availability
            const userIds = Array.from(new Set(leaves.map(l => l.user_id)))
            const deptIds = Array.from(new Set(leaves.map(l => l.department_id)))

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds)

            const { data: departments } = await supabase
                .from('departments')
                .select('id, name')
                .in('id', deptIds)

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])
            const deptMap = new Map(departments?.map(d => [d.id, d.name]) || [])

            return leaves.map(item => ({
                id: item.id,
                user_id: item.user_id,
                user_name: profileMap.get(item.user_id) || 'Unknown User',
                department_id: item.department_id,
                department_name: deptMap.get(item.department_id) || 'Unknown Dept',
                start_date: item.start_date,
                end_date: item.end_date,
                leave_type: item.leave_type,
                status: item.status as 'pending' | 'approved' | 'rejected'
            }))
        },
        enabled: !!currentProperty
    })
}

// Get department coverage analysis
export function useDepartmentCoverage(date?: Date) {
    const { currentProperty } = useProperty()
    const targetDate = date || new Date()

    return useQuery({
        queryKey: ['department-coverage', currentProperty?.id, targetDate.toISOString().split('T')[0]],
        queryFn: async (): Promise<DepartmentCoverage[]> => {
            if (!currentProperty?.id || currentProperty.id === 'all') return []

            // Get departments for this property
            const { data: departments } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', currentProperty.id)

            if (!departments || departments.length === 0) return []

            const coverage: DepartmentCoverage[] = []

            for (const dept of departments) {
                // Count total staff in department
                const { count: totalStaff } = await supabase
                    .from('user_departments')
                    .select('*', { count: 'exact', head: true })
                    .eq('department_id', dept.id)

                // Count staff on leave today
                const dateStr = targetDate.toISOString().split('T')[0]
                const { count: onLeave } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('department_id', dept.id)
                    .eq('status', 'approved')
                    .lte('start_date', dateStr)
                    .gte('end_date', dateStr)

                // Count upcoming leaves (next 7 days)
                const nextWeek = new Date(targetDate)
                nextWeek.setDate(nextWeek.getDate() + 7)
                const { count: upcoming } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('department_id', dept.id)
                    .in('status', ['approved', 'pending'])
                    .gte('start_date', dateStr)
                    .lte('start_date', nextWeek.toISOString().split('T')[0])

                const staffCount = totalStaff || 0
                const onLeaveCount = onLeave || 0
                const coveragePercentage = staffCount > 0
                    ? Math.round(((staffCount - onLeaveCount) / staffCount) * 100)
                    : 100

                coverage.push({
                    department_id: dept.id,
                    department_name: dept.name,
                    total_staff: staffCount,
                    staff_on_leave: onLeaveCount,
                    coverage_percentage: coveragePercentage,
                    upcoming_leaves: upcoming || 0
                })
            }

            return coverage.sort((a, b) => a.coverage_percentage - b.coverage_percentage)
        },
        enabled: !!currentProperty?.id && currentProperty.id !== 'all'
    })
}

// Detect leave conflicts (multiple people off same day)
export function useLeaveConflicts(startDate: Date, endDate: Date) {
    const { currentProperty } = useProperty()

    return useQuery({
        queryKey: ['leave-conflicts', currentProperty?.id, startDate.toISOString(), endDate.toISOString()],
        queryFn: async (): Promise<LeaveConflict[]> => {
            if (!currentProperty?.id || currentProperty.id === 'all') return []

            const conflicts: LeaveConflict[] = []
            const currentDate = new Date(startDate)

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0]

                // Get departments
                const { data: departments } = await supabase
                    .from('departments')
                    .select('id, name')
                    .eq('property_id', currentProperty.id)

                for (const dept of departments || []) {
                    // Count total staff
                    const { count: totalStaff } = await supabase
                        .from('user_departments')
                        .select('*', { count: 'exact', head: true })
                        .eq('department_id', dept.id)

                    // Count staff on leave this day
                    const { count: onLeave } = await supabase
                        .from('leave_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('department_id', dept.id)
                        .eq('status', 'approved')
                        .lte('start_date', dateStr)
                        .gte('end_date', dateStr)

                    const staffCount = totalStaff || 0
                    const onLeaveCount = onLeave || 0

                    if (staffCount > 0 && onLeaveCount > 0) {
                        const coveragePercentage = Math.round(((staffCount - onLeaveCount) / staffCount) * 100)
                        const isCritical = coveragePercentage < 50

                        if (onLeaveCount >= 2 || isCritical) {
                            conflicts.push({
                                department_id: dept.id,
                                department_name: dept.name,
                                date: dateStr,
                                staff_on_leave: onLeaveCount,
                                total_staff: staffCount,
                                coverage_percentage: coveragePercentage,
                                is_critical: isCritical
                            })
                        }
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }

            return conflicts.sort((a, b) => a.coverage_percentage - b.coverage_percentage)
        },
        enabled: !!currentProperty?.id && currentProperty.id !== 'all'
    })
}

// Check if a new leave request would create a conflict
export function useCheckLeaveConflict() {
    return useQuery({
        queryKey: ['check-leave-conflict'],
        queryFn: async () => null, // Placeholder - used for conflict checking
        enabled: false
    })
}
