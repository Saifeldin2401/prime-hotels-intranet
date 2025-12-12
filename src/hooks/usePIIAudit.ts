import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PIIAccessLog, PIIAccessSummary, PIIAccessPolicy } from '@/lib/types'

// PII Access Logs Hooks
export function usePIIAccessLogs(filters?: {
  user_id?: string
  resource_type?: string
  access_type?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['pii-access-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('pii_access_logs')
        .select(`
          *,
          user:profiles(full_name, email),
          accessed_by_profile:profiles(full_name, email),
          approved_by_profile:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type)
      }
      if (filters?.access_type) {
        query = query.eq('access_type', filters.access_type)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data as PIIAccessLog[]
    }
  })
}

export function usePIIAccessSummary(dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['pii-access-summary', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pii_access_summary', {
        date_from: dateRange?.from,
        date_to: dateRange?.to
      })

      if (error) throw error
      return data as PIIAccessSummary
    }
  })
}

export function usePIIAccessPolicies() {
  return useQuery({
    queryKey: ['pii-access-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pii_access_policies')
        .select(`
          *,
          created_by_profile:profiles(full_name, email)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as PIIAccessPolicy[]
    }
  })
}

export function useCreatePIIAccessLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (logData: Omit<PIIAccessLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pii_access_logs')
        .insert(logData)
        .select()
        .single()

      if (error) throw error
      return data as PIIAccessLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

export function useApprovePIIAccess() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ logId, approvedBy, justification }: {
      logId: string
      approvedBy: string
      justification: string
    }) => {
      const { data, error } = await supabase
        .from('pii_access_logs')
        .update({
          approved_by: approvedBy,
          justification
        })
        .eq('id', logId)
        .select()
        .single()

      if (error) throw error
      return data as PIIAccessLog
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

export function useDeletePIIAccessLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('pii_access_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pii-access-logs'] })
      queryClient.invalidateQueries({ queryKey: ['pii-access-summary'] })
    }
  })
}

export function useExportPIIAccessLogs() {
  return useMutation({
    mutationFn: async (filters?: {
      user_id?: string
      resource_type?: string
      access_type?: string
      date_from?: string
      date_to?: string
    }) => {
      const { data, error } = await supabase.rpc('export_pii_access_logs', {
        filters: filters || {}
      })

      if (error) throw error
      return data
    }
  })
}

// Helper function to log PII access automatically
export function logPIIAccess(accessData: {
  user_id: string
  accessed_by: string
  resource_type: PIIAccessLog['resource_type']
  resource_id: string
  access_type: PIIAccessLog['access_type']
  pii_fields: string[]
  ip_address: string
  user_agent: string
  session_id: string
  justification?: string
}) {
  return supabase.from('pii_access_logs').insert({
    ...accessData,
    justification: accessData.justification || null
  })
}
