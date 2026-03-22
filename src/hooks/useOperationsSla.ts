import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface OperationsSlaBreach {
  id: string
  entity_type: string
  entity_id: string
  rule_id?: string | null
  severity?: string | null
  breached_at: string
  resolved_at?: string | null
}

export function useOperationsSlaBreaches() {
  return useQuery({
    queryKey: ['operations-sla-breaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations_sla_breaches')
        .select('*')
        .order('breached_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as OperationsSlaBreach[]
    }
  })
}
