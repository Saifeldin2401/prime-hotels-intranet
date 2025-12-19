import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/types/supabase'

type Payslip = Database['public']['Tables']['payslips']['Row']

export function usePayslips() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['payslips', user?.id],
        queryFn: async () => {
            if (!user) return []
            const { data, error } = await supabase
                .from('payslips')
                .select('*')
                .eq('employee_id', user.id)
                .order('year', { ascending: false })
                .order('month', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!user,
    })
}
