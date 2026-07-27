import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ScopableAdmin {
    user_id: string
    full_name: string | null
    email: string | null
    role: string
}

const SCOPABLE_ROLES = ['corporate_admin', 'regional_admin', 'regional_hr'] as const

/** Every user holding a company-scopable admin role (corporate_admin/regional_admin/regional_hr). */
export function useScopableAdmins() {
    return useQuery({
        queryKey: ['scopable_admins'],
        queryFn: async () => {
            const { data: roleRows, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('role', SCOPABLE_ROLES as unknown as string[])

            if (roleError) throw roleError
            if (!roleRows || roleRows.length === 0) return []

            const userIds = Array.from(new Set(roleRows.map((r) => r.user_id)))
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds)

            if (profileError) throw profileError

            return roleRows.map((r) => {
                const profile = profiles?.find((p) => p.id === r.user_id)
                return {
                    user_id: r.user_id,
                    full_name: profile?.full_name ?? null,
                    email: profile?.email ?? null,
                    role: r.role
                } as ScopableAdmin
            })
        }
    })
}

/** Which company IDs a given user is scoped to. Empty array = global access (unscoped). */
export function useUserCompanyGrants(userId?: string) {
    return useQuery({
        queryKey: ['user_companies', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_companies')
                .select('company_id')
                .eq('user_id', userId as string)

            if (error) throw error
            return (data || []).map((r) => r.company_id as string)
        },
        enabled: !!userId
    })
}

/** All company scope grants for a given company (used to list "who is scoped here"). */
export function useCompanyScopedUsers(companyId?: string) {
    return useQuery({
        queryKey: ['company_scoped_users', companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_companies')
                .select('user_id')
                .eq('company_id', companyId as string)

            if (error) throw error
            return (data || []).map((r) => r.user_id as string)
        },
        enabled: !!companyId
    })
}

export function useGrantCompanyAccess() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
            const { error } = await supabase
                .from('user_companies')
                .insert([{ user_id: userId, company_id: companyId }])

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_companies'] })
            queryClient.invalidateQueries({ queryKey: ['company_scoped_users'] })
        }
    })
}

export function useRevokeCompanyAccess() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
            const { error } = await supabase
                .from('user_companies')
                .delete()
                .eq('user_id', userId)
                .eq('company_id', companyId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_companies'] })
            queryClient.invalidateQueries({ queryKey: ['company_scoped_users'] })
        }
    })
}
