import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProperty } from '@/contexts/PropertyContext'

// Types
export interface KnowledgeComplianceStats {
    total_documents: number
    acknowledged_count: number
    pending_count: number
    compliance_rate: number
    overdue_count: number
}

export interface DepartmentKnowledgeCompliance {
    department_id: string
    department_name: string
    total_required: number
    acknowledged: number
    compliance_rate: number
}

// Get Knowledge Base compliance stats for current user
export function useUserKnowledgeCompliance() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['knowledge-compliance', 'user', user?.id],
        queryFn: async (): Promise<KnowledgeComplianceStats> => {
            if (!user?.id) {
                return { total_documents: 0, acknowledged_count: 0, pending_count: 0, compliance_rate: 0, overdue_count: 0 }
            }

            // Get published documents that require acknowledgment
            const { data: requiredDocs } = await supabase
                .from('documents')
                .select('id')
                .eq('status', 'PUBLISHED')
                .eq('requires_acknowledgment', true)

            const totalDocs = requiredDocs?.length || 0

            // Get user's acknowledgments
            const { data: acks } = await supabase
                .from('document_acknowledgments')
                .select('document_id')
                .eq('user_id', user.id)

            const acknowledgedIds = new Set(acks?.map(a => a.document_id) || [])
            const docIds = new Set(requiredDocs?.map(d => d.id) || [])

            // Count acknowledged documents (intersection)
            const acknowledgedCount = [...docIds].filter(id => acknowledgedIds.has(id)).length
            const pendingCount = totalDocs - acknowledgedCount

            return {
                total_documents: totalDocs,
                acknowledged_count: acknowledgedCount,
                pending_count: pendingCount,
                compliance_rate: totalDocs > 0 ? Math.round((acknowledgedCount / totalDocs) * 100) : 100,
                overdue_count: 0 // Logic for overdue requires due dates which might not be in documents table yet
            }
        },
        enabled: !!user?.id
    })
}

// Get Knowledge compliance by department
export function useDepartmentKnowledgeCompliance(propertyId?: string) {
    const { currentProperty } = useProperty()
    const propId = propertyId || currentProperty?.id

    return useQuery({
        queryKey: ['knowledge-compliance', 'department', propId],
        queryFn: async (): Promise<DepartmentKnowledgeCompliance[]> => {
            const { data: departments } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', propId)

            if (!departments || departments.length === 0) return []

            const results: DepartmentKnowledgeCompliance[] = []

            for (const dept of departments) {
                const { data: deptUsers } = await supabase
                    .from('user_departments')
                    .select('user_id')
                    .eq('department_id', dept.id)

                const userIds = deptUsers?.map(u => u.user_id) || []

                // Get documents for this department
                const { data: deptDocs } = await supabase
                    .from('documents')
                    .select('id')
                    .eq('department_id', dept.id)
                    .eq('status', 'PUBLISHED')
                    .eq('requires_acknowledgment', true)

                const docIds = deptDocs?.map(d => d.id) || []
                const totalRequired = docIds.length * userIds.length

                let acknowledgedCount = 0
                if (docIds.length > 0 && userIds.length > 0) {
                    const { count } = await supabase
                        .from('document_acknowledgments')
                        .select('*', { count: 'exact', head: true })
                        .in('document_id', docIds)
                        .in('user_id', userIds)
                    acknowledgedCount = count || 0
                }

                results.push({
                    department_id: dept.id,
                    department_name: dept.name,
                    total_required: totalRequired,
                    acknowledged: acknowledgedCount,
                    compliance_rate: totalRequired > 0
                        ? Math.round((acknowledgedCount / totalRequired) * 100)
                        : 100
                })
            }

            return results.sort((a, b) => a.compliance_rate - b.compliance_rate)
        },
        enabled: !!propId && propId !== 'all'
    })
}
