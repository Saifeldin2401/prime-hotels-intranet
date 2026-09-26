import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { membershipToAppRole } from '@/lib/membershipRoles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types for organization data
interface OrgNode {
    id: string
    full_name: string
    job_title: string | null
    email: string
    reporting_to: string | null
    manager_name: string | null
    depth: number
    path: string[]
    path_names: string[]
}

interface ReportingChainNode {
    id: string
    full_name: string
    job_title: string | null
    level: number
}

// Fetch entire organizational hierarchy
export function useOrgHierarchy() {
    return useQuery({
        queryKey: ['org-hierarchy'],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_org_hierarchy', { p_root_user_id: null })

            if (error) throw error
            return data as OrgNode[]
        }
    })
}

// Fetch hierarchy starting from a specific user
// Fetch direct reports for a manager
// Fetch reporting chain (path to top)
export function useReportingChain(employeeId: string) {
    return useQuery({
        queryKey: ['reporting-chain', employeeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_reporting_chain', { p_employee_id: employeeId })

            if (error) throw error
            return data as ReportingChainNode[]
        },
        enabled: !!employeeId
    })
}

// Fetch all potential managers for assignment dropdown
export function usePotentialManagers(excludeUserId?: string) {
    return useQuery({
        queryKey: ['potential-managers', excludeUserId],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          job_title,
          organization_memberships(role, is_active)
        `)
                .eq('is_active', true)
                .order('full_name')

            // Exclude the user being edited (can't report to self)
            if (excludeUserId) {
                query = query.neq('id', excludeUserId)
            }

            const { data, error } = await query

            if (error) throw error

            // Managers/supervisors only: someone holding more than a learner membership.
            // `user_roles` keeps the shape ManagerSelect renders (roles derive from memberships).
            return (data || [])
                .map((p) => ({
                    ...p,
                    user_roles: (p.organization_memberships || [])
                        .filter((m) => m.is_active !== false)
                        .map((m) => ({ role: membershipToAppRole(m.role) }))
                        .filter((r) => r.role !== 'learner'),
                }))
                .filter((p) => p.user_roles.length > 0) as unknown as (Profile & { user_roles: { role: string }[] })[]
        }
    })
}

// Update reporting line
export function useUpdateReportingLine() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            employeeId,
            newManagerId
        }: {
            employeeId: string
            newManagerId: string | null
        }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ reporting_to: newManagerId })
                .eq('id', employeeId)

            if (error) {
                // Handle circular reporting error from trigger
                if (error.message.includes('Circular')) {
                    throw new Error('Cannot assign this manager: it would create a circular reporting chain.')
                }
                throw error
            }
        },
        onSuccess: () => {
            toast.success('Reporting line updated successfully')
            queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] })
            queryClient.invalidateQueries({ queryKey: ['direct-reports'] })
            queryClient.invalidateQueries({ queryKey: ['reporting-chain'] })
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update reporting line')
        }
    })
}

// Build tree structure from flat hierarchy
export function buildOrgTree(nodes: OrgNode[]): OrgTreeNode[] {
    const nodeMap = new Map<string, OrgTreeNode>()
    const roots: OrgTreeNode[] = []

    // Create tree nodes
    nodes.forEach(node => {
        nodeMap.set(node.id, {
            ...node,
            children: []
        })
    })

    // Link children to parents
    nodes.forEach(node => {
        const treeNode = nodeMap.get(node.id)!
        if (node.reporting_to && nodeMap.has(node.reporting_to)) {
            nodeMap.get(node.reporting_to)!.children.push(treeNode)
        } else if (node.depth === 0) {
            roots.push(treeNode)
        }
    })

    return roots
}

export interface OrgTreeNode extends OrgNode {
    children: OrgTreeNode[]
}
