import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/lib/types/procurement'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('is_active', true)
                .order('supplier_name')

            if (error) throw error
            return data as Supplier[]
        }
    })
}

export function useCreateSupplier() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: {
            supplier_name: string
            category?: string
            contact_name?: string
            contact_email?: string
            contact_phone?: string
            created_by: string
        }) => {
            const { data, error } = await supabase
                .from('suppliers')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as Supplier
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
        }
    })
}
