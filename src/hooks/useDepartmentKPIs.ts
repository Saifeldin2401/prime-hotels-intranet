import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProperty } from '@/contexts/PropertyContext'

// Types
export interface DepartmentKPI {
    department_id: string
    department_name: string
    staff_count: number
    metrics: {
        task_completion_rate: number
        training_completion_rate: number
        sop_compliance_rate: number
        avg_response_time_hours: number
        attendance_rate: number
    }
    overall_score: number
}

export interface DepartmentComparisonData {
    departments: DepartmentKPI[]
    property_average: {
        task_completion_rate: number
        training_completion_rate: number
        sop_compliance_rate: number
    }
}

// Get KPIs for all departments in a property
export function useDepartmentKPIs(propertyId?: string) {
    const { currentProperty } = useProperty()
    const propId = propertyId || currentProperty?.id

    return useQuery({
        queryKey: ['department-kpis', propId],
        queryFn: async (): Promise<DepartmentKPI[]> => {
            if (!propId || propId === 'all') return []

            // Get departments
            const { data: departments } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', propId)

            if (!departments || departments.length === 0) return []

            const kpis: DepartmentKPI[] = []

            for (const dept of departments) {
                // Get users in department
                const { data: deptUsers } = await supabase
                    .from('user_departments')
                    .select('user_id')
                    .eq('department_id', dept.id)

                const userIds = deptUsers?.map(u => u.user_id) || []
                const staffCount = userIds.length

                if (userIds.length === 0) {
                    kpis.push({
                        department_id: dept.id,
                        department_name: dept.name,
                        staff_count: 0,
                        metrics: {
                            task_completion_rate: 0,
                            training_completion_rate: 0,
                            sop_compliance_rate: 0,
                            avg_response_time_hours: 0,
                            attendance_rate: 0
                        },
                        overall_score: 0
                    })
                    continue
                }

                // Calculate Task Completion Rate
                const { count: totalTasks } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .in('assignee_id', userIds)

                const { count: completedTasks } = await supabase
                    .from('tasks')
                    .select('*', { count: 'exact', head: true })
                    .in('assignee_id', userIds)
                    .eq('status', 'completed')

                const taskCompletionRate = totalTasks && totalTasks > 0
                    ? Math.round((completedTasks || 0) / totalTasks * 100)
                    : 0

                // Calculate Training Completion Rate
                const { count: totalTraining } = await supabase
                    .from('training_assignments')
                    .select('*', { count: 'exact', head: true })
                    .in('assigned_to_user_id', userIds)

                const { count: completedTraining } = await supabase
                    .from('training_progress')
                    .select('*', { count: 'exact', head: true })
                    .in('user_id', userIds)
                    .eq('status', 'completed')

                const trainingCompletionRate = totalTraining && totalTraining > 0
                    ? Math.round((completedTraining || 0) / totalTraining * 100)
                    : 0

                // Calculate SOP Compliance Rate
                const { data: deptSops } = await supabase
                    .from('documents')
                    .select('id')
                    .eq('department_id', dept.id)
                    .eq('status', 'PUBLISHED')

                const sopIds = deptSops?.map(s => s.id) || []
                const totalSopRequired = sopIds.length * userIds.length

                let sopComplianceRate = 0
                if (sopIds.length > 0 && userIds.length > 0) {
                    const { count: sopAcks } = await supabase
                        .from('document_acknowledgments')
                        .select('*', { count: 'exact', head: true })
                        .in('document_id', sopIds)
                        .in('user_id', userIds)

                    sopComplianceRate = totalSopRequired > 0
                        ? Math.round((sopAcks || 0) / totalSopRequired * 100)
                        : 0
                }

                // Calculate Avg Response Time (Task completion)
                let avgResponseTime = 0
                if (userIds.length > 0) {
                    const { data: completedTasksData } = await supabase
                        .from('tasks')
                        .select('created_at, updated_at') // Using updated_at as proxy for completed_at if not present
                        .in('assignee_id', userIds)
                        .eq('status', 'completed')
                        .limit(50)

                    if (completedTasksData && completedTasksData.length > 0) {
                        const totalHours = completedTasksData.reduce((acc, task) => {
                            const start = new Date(task.created_at).getTime()
                            const end = new Date(task.updated_at).getTime()
                            return acc + ((end - start) / (1000 * 60 * 60))
                        }, 0)
                        avgResponseTime = Math.round((totalHours / completedTasksData.length) * 10) / 10
                    }
                }

                // Calculate Attendance Rate (Today's Shifts)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date(today)
                tomorrow.setDate(tomorrow.getDate() + 1)

                const { data: deptShifts } = await supabase
                    .from('shifts')
                    .select('status')
                    .in('user_id', userIds)
                    .gte('start_time', today.toISOString())
                    .lt('start_time', tomorrow.toISOString())
                    .neq('status', 'cancelled')

                const scheduledCount = deptShifts?.length || 0
                const presentCount = deptShifts?.filter(s => ['in_progress', 'completed'].includes(s.status)).length || 0

                const attendanceRate = scheduledCount > 0
                    ? Math.round((presentCount / scheduledCount) * 100)
                    : 0

                // Calculate Overall Score (weighted average)
                const overallScore = Math.round(
                    (taskCompletionRate * 0.4) +
                    (trainingCompletionRate * 0.3) +
                    (sopComplianceRate * 0.2) +
                    (attendanceRate * 0.1)
                )

                kpis.push({
                    department_id: dept.id,
                    department_name: dept.name,
                    staff_count: staffCount,
                    metrics: {
                        task_completion_rate: taskCompletionRate,
                        training_completion_rate: trainingCompletionRate,
                        sop_compliance_rate: sopComplianceRate,
                        avg_response_time_hours: avgResponseTime,
                        attendance_rate: attendanceRate
                    },
                    overall_score: overallScore
                })
            }

            return kpis.sort((a, b) => b.overall_score - a.overall_score)
        },
        enabled: !!propId && propId !== 'all',
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })
}

// Get department comparison data
export function useDepartmentComparison(propertyId?: string) {
    const { data: kpis, isLoading } = useDepartmentKPIs(propertyId)

    return useQuery({
        queryKey: ['department-comparison', propertyId, kpis],
        queryFn: async (): Promise<DepartmentComparisonData | null> => {
            if (!kpis || kpis.length === 0) return null

            // Calculate property averages
            const avgTaskCompletion = Math.round(
                kpis.reduce((sum, d) => sum + d.metrics.task_completion_rate, 0) / kpis.length
            )
            const avgTrainingCompletion = Math.round(
                kpis.reduce((sum, d) => sum + d.metrics.training_completion_rate, 0) / kpis.length
            )
            const avgSopCompliance = Math.round(
                kpis.reduce((sum, d) => sum + d.metrics.sop_compliance_rate, 0) / kpis.length
            )

            return {
                departments: kpis,
                property_average: {
                    task_completion_rate: avgTaskCompletion,
                    training_completion_rate: avgTrainingCompletion,
                    sop_compliance_rate: avgSopCompliance
                }
            }
        },
        enabled: !!kpis && kpis.length > 0
    })
}

// Get a single department's KPI trend over time (last 30 days)
export function useDepartmentKPITrend(departmentId: string) {
    return useQuery({
        queryKey: ['department-kpi-trend', departmentId],
        queryFn: async () => {
            // For now, return placeholder data
            // In production, this would query daily snapshots
            const today = new Date()
            const trend = []

            for (let i = 29; i >= 0; i--) {
                const date = new Date(today)
                date.setDate(date.getDate() - i)

                trend.push({
                    date: date.toISOString().split('T')[0],
                    overall_score: 70 + Math.floor(Math.random() * 25)
                })
            }

            return trend
        },
        enabled: !!departmentId
    })
}
