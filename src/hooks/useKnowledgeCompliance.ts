import { useProperty } from '@/contexts/PropertyContext'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

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
export function useDepartmentKnowledgeCompliance(propertyId?: string, options?: { enabled?: boolean }) {
    const { currentProperty } = useProperty()
    const propId = propertyId || currentProperty?.id
    const isEnabled = (options?.enabled ?? true) && !!propId && propId !== 'all'

    return useQuery({
        queryKey: ['knowledge-compliance', 'department', propId],
        queryFn: async (): Promise<DepartmentKnowledgeCompliance[]> => {
            const { data: departments } = await supabase
                .from('departments')
                .select('id, name')
                .eq('property_id', propId)

            if (!departments || departments.length === 0) return []

            const deptIds = departments.map(d => d.id)

            // Batch-fetch department memberships and required documents for ALL
            // departments in two round-trips instead of looping per department.
            const [{ data: allDeptUsers }, { data: allDeptDocs }] = await Promise.all([
                supabase
                    .from('user_departments')
                    .select('user_id, department_id')
                    .in('department_id', deptIds),
                supabase
                    .from('documents')
                    .select('id, department_id')
                    .in('department_id', deptIds)
                    .eq('status', 'PUBLISHED')
                    .eq('requires_acknowledgment', true)
            ])

            const usersByDept = new Map<string, Set<string>>()
            for (const row of allDeptUsers || []) {
                if (!row.department_id) continue
                const set = usersByDept.get(row.department_id) ?? new Set<string>()
                set.add(row.user_id)
                usersByDept.set(row.department_id, set)
            }

            const docsByDept = new Map<string, string[]>()
            const deptIdByDocId = new Map<string, string>()
            for (const doc of allDeptDocs || []) {
                if (!doc.department_id) continue
                const list = docsByDept.get(doc.department_id) ?? []
                list.push(doc.id)
                docsByDept.set(doc.department_id, list)
                deptIdByDocId.set(doc.id, doc.department_id)
            }

            const allDocIds = allDeptDocs?.map(d => d.id) || []

            // One more batched query for acknowledgments across every required
            // document, then aggregate the per-department counts client-side.
            const { data: allAcks } = allDocIds.length > 0
                ? await supabase
                    .from('document_acknowledgments')
                    .select('document_id, user_id')
                    .in('document_id', allDocIds)
                : { data: [] as Array<{ document_id: string; user_id: string }> }

            const acknowledgedCountByDept = new Map<string, number>()
            for (const ack of allAcks || []) {
                const deptId = deptIdByDocId.get(ack.document_id)
                if (!deptId) continue
                const deptUsers = usersByDept.get(deptId)
                if (!deptUsers || !deptUsers.has(ack.user_id)) continue
                acknowledgedCountByDept.set(deptId, (acknowledgedCountByDept.get(deptId) || 0) + 1)
            }

            const results: DepartmentKnowledgeCompliance[] = departments.map(dept => {
                const userIds = usersByDept.get(dept.id) ?? new Set<string>()
                const docIds = docsByDept.get(dept.id) ?? []
                const totalRequired = docIds.length * userIds.size
                const acknowledgedCount = acknowledgedCountByDept.get(dept.id) || 0

                return {
                    department_id: dept.id,
                    department_name: dept.name,
                    total_required: totalRequired,
                    acknowledged: acknowledgedCount,
                    compliance_rate: totalRequired > 0
                        ? Math.round((acknowledgedCount / totalRequired) * 100)
                        : 100
                }
            })

            return results.sort((a, b) => a.compliance_rate - b.compliance_rate)
        },
        enabled: isEnabled
    })
}
