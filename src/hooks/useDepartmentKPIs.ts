import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

// Types
interface DepartmentKPI {
    department_id: string
    department_name: string
    head_name: string | null
    staff_count: number
    metrics: {
        training_completion_rate: number
        sop_compliance_rate: number
    }
    overall_score: number
}

// Get KPIs for all departments in a property (or cluster)
export function useDepartmentKPIs(propertyId?: string) {
    const { currentProperty, propertyIds } = useProperty()
    const propId = propertyId || currentProperty?.id
    const isScoped = isRealPropertyId(propId)

    return useQuery({
        queryKey: ['department-kpis', propId, propertyIds],
        queryFn: async (): Promise<DepartmentKPI[]> => {
            // Get departments
            let query = supabase.from('departments').select('id, name, property_id')

            if (isScoped) {
                query = query.eq('property_id', propId)
            } else if (propertyIds.length > 0) {
                query = query.in('property_id', propertyIds)
            } else {
                return []
            }

            const { data: departments } = await query

            if (!departments || departments.length === 0) return []

            const kpis: DepartmentKPI[] = []

            for (const dept of departments) {
                // Get users in department from memberships
                const { data: deptUsers } = await supabase
                    .from('organization_memberships')
                    .select('user_id')
                    .eq('department_id', dept.id)
                    .eq('is_active', true)

                const userIds = deptUsers?.map((u: any) => u.user_id) || []
                const staffCount = userIds.length

                // Get Department Head
                let headName = 'Not assigned'
                if (userIds.length > 0) {
                    // The department manager is the member holding that membership role here.
                    const { data: headUser } = await supabase
                        .from('organization_memberships')
                        .select('user_id')
                        .eq('department_id', dept.id)
                        .eq('role', 'department_manager')
                        .eq('is_active', true)
                        .in('user_id', userIds)
                        .limit(1)
                        .maybeSingle()

                    if (headUser) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', headUser.user_id)
                            .single()
                        if (profile) headName = profile.full_name || 'Unknown'
                    }
                }

                if (userIds.length === 0) {
                    kpis.push({
                        department_id: dept.id,
                        department_name: dept.name,
                        head_name: headName,
                        staff_count: 0,
                        metrics: {
                            training_completion_rate: 0,
                            sop_compliance_rate: 0
                        },
                        overall_score: 0
                    })
                    continue
                }

                // Calculate Training Completion Rate
                const { count: totalTraining } = await supabase
                    .from('assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('target_type', 'user')
                    .in('target_id', userIds)

                const { count: completedTraining } = await supabase
                    .from('training_progress')
                    .select('*', { count: 'exact', head: true })
                    .in('user_id', userIds)
                    .eq('status', 'completed')

                // Completions are counted against individual assignments only, so the
                // ratio can exceed 100% until compliance is computed server-side
                // (rebuild Phase 4). Clamp so the scorecard never shows >100%.
                const trainingCompletionRate = totalTraining && totalTraining > 0
                    ? Math.min(100, Math.round((completedTraining || 0) / totalTraining * 100))
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
                        ? Math.min(100, Math.round((sopAcks || 0) / totalSopRequired * 100))
                        : 0
                }

                // Calculate Overall Score (weighted average)
                // Training and SOP acknowledgement are the two compliance signals.
                // (A 45% weight on the removed tasks domain used to cap every
                // department at 55% and flag all of them as lagging.)
                const overallScore = Math.round(
                    (trainingCompletionRate * 0.6) +
                    (sopComplianceRate * 0.4)
                )

                kpis.push({
                    department_id: dept.id,
                    department_name: dept.name,
                    head_name: headName,
                    staff_count: staffCount,
                    metrics: {
                        training_completion_rate: trainingCompletionRate,
                        sop_compliance_rate: sopComplianceRate
                    },
                    overall_score: overallScore
                })
            }

            return kpis.sort((a, b) => b.overall_score - a.overall_score)
        },
        enabled: propertyIds.length > 0 || isScoped,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })
}

// Get department comparison data
// Get a single department's KPI trend over time (last 30 days)
