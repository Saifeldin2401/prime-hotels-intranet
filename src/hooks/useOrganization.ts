import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { Profile, Property, Department } from '@/lib/types'

// Types for organization data
export interface OrgNode {
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

export interface DirectReport {
    id: string
    full_name: string
    job_title: string | null
    email: string
}

export interface ReportingChainNode {
    id: string
    full_name: string
    job_title: string | null
    level: number
}

// Fetch entire organizational hierarchy
export function useOrgHierarchy(propertyId?: string) {
    return useQuery({
        queryKey: ['org-hierarchy', propertyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_org_hierarchy', {
                    p_root_user_id: null,
                    p_property_id: propertyId || null
                })

            if (error) throw error
            return data as OrgNode[]
        }
    })
}

// Fetch hierarchy starting from a specific user
export function useOrgSubtree(rootUserId: string) {
    return useQuery({
        queryKey: ['org-subtree', rootUserId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_org_hierarchy', {
                    p_root_user_id: rootUserId,
                    p_property_id: null
                })

            if (error) throw error
            return data as OrgNode[]
        },
        enabled: !!rootUserId
    })
}

// Fetch direct reports for a manager
export function useDirectReports(managerId: string) {
    return useQuery({
        queryKey: ['direct-reports', managerId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_direct_reports', { p_manager_id: managerId })

            if (error) throw error
            return data as DirectReport[]
        },
        enabled: !!managerId
    })
}

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
export function usePotentialManagers(propertyId?: string, excludeUserId?: string) {
    return useQuery({
        queryKey: ['potential-managers', propertyId, excludeUserId],
        queryFn: async () => {
            let query = supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          job_title,
          user_roles!inner(role),
          user_properties(property_id)
        `)
                .eq('is_active', true)
                .order('full_name')

            // Filter by property if specified
            if (propertyId) {
                query = query.eq('user_properties.property_id', propertyId)
            }

            // Exclude the user being edited (can't report to self)
            if (excludeUserId) {
                query = query.neq('id', excludeUserId)
            }

            const { data, error } = await query

            if (error) throw error

            // Filter to managers/supervisors only (not staff)
            return (data || []).filter((p: any) => {
                const role = p.user_roles?.[0]?.role
                return role && role !== 'staff'
            }) as (Profile & { user_roles: { role: string }[] })[]
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

// Bulk update reporting lines
export function useBulkUpdateReportingLines() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (updates: { employeeId: string; newManagerId: string | null }[]) => {
            // Process updates sequentially to catch circular errors
            for (const update of updates) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ reporting_to: update.newManagerId })
                    .eq('id', update.employeeId)

                if (error) {
                    throw new Error(`Failed to update ${update.employeeId}: ${error.message}`)
                }
            }
        },
        onSuccess: () => {
            toast.success('Reporting lines updated successfully')
            queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] })
            queryClient.invalidateQueries({ queryKey: ['direct-reports'] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
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
