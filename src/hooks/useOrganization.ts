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
            const normalizedPropertyId = propertyId && propertyId !== 'all'
                ? propertyId
                : null
            const { data, error } = await supabase
                .rpc('get_org_hierarchy', {
                    p_root_user_id: null,
                    p_property_id: normalizedPropertyId
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
            const normalizedPropertyId = propertyId && propertyId !== 'all'
                ? propertyId
                : undefined
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
            if (normalizedPropertyId) {
                query = query.eq('user_properties.property_id', normalizedPropertyId)
            }

            // Exclude the user being edited (can't report to self)
            if (excludeUserId) {
                query = query.neq('id', excludeUserId)
            }

            const { data, error } = await query

            if (error) throw error

            // Filter to managers/supervisors only (not staff)
            const filtered = (data || []).filter((p: any) => {
                const role = p.user_roles?.[0]?.role
                return role && role !== 'staff'
            })
            return filtered as unknown as (Profile & { user_roles: { role: string }[] })[]
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
            // Use atomic RPC function to ensure all updates succeed or none do
            const updatePayload = updates.map(u => ({
                employee_id: u.employeeId,
                new_manager_id: u.newManagerId
            }))

            const { data, error } = await supabase.rpc('bulk_update_reporting_lines', {
                p_updates: updatePayload
            })

            if (error) {
                // Extract more specific error message from Postgres
                const circularMatch = error.message.match(/circular reporting chain/i)
                if (circularMatch) {
                    throw new Error('Cannot complete update: would create a circular reporting chain.')
                }
                throw new Error(`Failed to update reporting lines: ${error.message}`)
            }

            return data
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
