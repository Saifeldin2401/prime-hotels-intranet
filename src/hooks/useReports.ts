import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface ReportDefinition {
  id: string
  name: string
  description?: string | null
  scope_type: 'global' | 'property' | 'department'
  property_id?: string | null
  department_id?: string | null
  report_type: string
  filters?: Record<string, any> | null
  schedule_cron?: string | null
  schedule_frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | null
  next_run_at?: string | null
  last_run_at?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ReportRun {
  id: string
  report_id: string
  status: 'queued' | 'running' | 'success' | 'failed'
  started_at?: string | null
  finished_at?: string | null
  output_url?: string | null
  row_count?: number | null
  triggered_by?: string | null
  created_at: string
}

export function useReportDefinitions() {
  return useQuery({
    queryKey: ['report-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_definitions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ReportDefinition[]
    }
  })
}

export function useReportRuns(reportId?: string) {
  return useQuery({
    queryKey: ['report-runs', reportId],
    queryFn: async () => {
      let query = supabase
        .from('report_runs')
        .select('*')
        .order('created_at', { ascending: false })

      if (reportId) {
        query = query.eq('report_id', reportId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ReportRun[]
    }
  })
}

export function useCreateReportDefinition() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: Omit<ReportDefinition, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_active'> & { is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('report_definitions')
        .insert({
          ...payload,
          created_by: user?.id || null,
          is_active: payload.is_active ?? true,
          next_run_at: payload.schedule_frequency ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (error) throw error
      return data as ReportDefinition
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions'] })
    }
  })
}

export function useUpdateReportDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Partial<ReportDefinition> & { id: string }) => {
      const { data, error } = await supabase
        .from('report_definitions')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single()

      if (error) throw error
      return data as ReportDefinition
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions'] })
    }
  })
}

export function useDeleteReportDefinition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_definitions')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-definitions'] })
    }
  })
}

export function useCreateReportRun() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: {
      report_id: string
      status?: ReportRun['status']
      row_count?: number | null
      output_url?: string | null
    }) => {
      const { data, error } = await supabase
        .from('report_runs')
        .insert({
          report_id: payload.report_id,
          status: payload.status ?? 'queued',
          row_count: payload.row_count ?? null,
          output_url: payload.output_url ?? null,
          started_at: new Date().toISOString(),
          finished_at: payload.status === 'success' ? new Date().toISOString() : null,
          triggered_by: user?.id || null
        })
        .select()
        .single()

      if (error) throw error
      return data as ReportRun
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-runs'] })
    }
  })
}
