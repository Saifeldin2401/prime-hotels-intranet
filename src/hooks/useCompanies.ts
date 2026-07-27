import { supabase } from '@/lib/supabase'
import type { Company } from '@/lib/types/profile'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useCompanies() {
    return useQuery({
        queryKey: ['companies'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('is_deleted', false)
                .order('name')

            if (error) throw error
            return data as Company[]
        }
    })
}

export function useCreateCompany() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { name: string; name_ar?: string; code?: string }) => {
            const { data, error } = await supabase
                .from('companies')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Company
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
        }
    })
}

export function useUpdateCompany() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...payload }: { id: string; name?: string; name_ar?: string; code?: string; is_active?: boolean }) => {
            const { error } = await supabase
                .from('companies')
                .update(payload)
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
        }
    })
}

export function useDeleteCompany() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('companies')
                .update({ is_deleted: true, is_active: false })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['companies'] })
        }
    })
}

export function useBrands(companyId?: string) {
    return useQuery({
        queryKey: ['brands', companyId],
        queryFn: async () => {
            let query = supabase
                .from('brands')
                .select('*')
                .eq('is_deleted', false)
                .order('name')

            if (companyId) {
                query = query.eq('company_id', companyId)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
        enabled: companyId !== undefined
    })
}

export function useCreateBrand() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: { company_id: string; name: string; name_ar?: string; code?: string }) => {
            const { data, error } = await supabase
                .from('brands')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['brands'] })
        }
    })
}
