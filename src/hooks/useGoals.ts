import { useProperty } from '@/contexts/PropertyContext'
import { isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'


export function useGoals(employeeId?: string) {
    const { user } = useAuth()
    const { currentProperty } = useProperty()
    const targetId = employeeId || user?.id

    return useQuery({
        queryKey: ['goals', targetId, currentProperty?.id],
        queryFn: async () => {
            if (!targetId) return []

            if (isRealPropertyId(currentProperty?.id)) {
                const { data: membership, error: membershipError } = await supabase
                    .from('organization_memberships')
                    .select('id')
                    .eq('user_id', targetId)
                    .eq('hotel_id', currentProperty.id)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle()

                if (membershipError) throw membershipError
                if (!membership) return []
            }

        queryFn: async () => {
            return []
        },
        enabled: false, // DEPRECATED: goals table removed
    })
}

export function useUpdateGoal() {
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            throw new Error('DEPRECATED: goals table removed')
        }
    })
}

export function useCreateGoal() {
    return useMutation({
        mutationFn: async (goal: any) => {
            throw new Error('DEPRECATED: goals table removed')
        }
    })
}
