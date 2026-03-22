import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface AuditTemplate {
  id: string
  name: string
  description?: string | null
  scope_type: 'global' | 'property' | 'department'
  property_id?: string | null
  department_id?: string | null
  frequency?: string | null
  next_run_at?: string | null
  last_run_at?: string | null
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface AuditItem {
  id: string
  template_id: string
  title: string
  category?: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  required: boolean
  order_index: number
}

export interface AuditRun {
  id: string
  template_id?: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  scheduled_for?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_by?: string | null
  created_at: string
}

export interface AuditFinding {
  id: string
  run_id: string
  item_id?: string | null
  status: 'pending' | 'pass' | 'fail' | 'na'
  notes?: string | null
  assigned_to?: string | null
  created_at: string
  updated_at: string
}

export function useAuditTemplates() {
  return useQuery({
    queryKey: ['audit-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as AuditTemplate[]
    }
  })
}

export function useUpdateAuditItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; template_id: string; updates: Partial<AuditItem> }) => {
      const { data, error } = await supabase
        .from('audit_items')
        .update(payload.updates)
        .eq('id', payload.id)
        .select()
        .single()

      if (error) throw error
      return data as AuditItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-items', variables.template_id] })
    }
  })
}

export function useDeleteAuditItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; template_id: string }) => {
      const { error } = await supabase
        .from('audit_items')
        .delete()
        .eq('id', payload.id)

      if (error) throw error
      return payload
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-items', variables.template_id] })
    }
  })
}

export function useDeleteAuditRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; template_id?: string | null }) => {
      const { error } = await supabase
        .from('audit_runs')
        .delete()
        .eq('id', payload.id)

      if (error) throw error
      return payload
    },
    onSuccess: (_data, variables) => {
      if (variables.template_id) {
        queryClient.invalidateQueries({ queryKey: ['audit-runs', variables.template_id] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['audit-runs'] })
      }
    }
  })
}

export function useUpdateAuditTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<AuditTemplate> }) => {
      const { data, error } = await supabase
        .from('audit_templates')
        .update(payload.updates)
        .eq('id', payload.id)
        .select()
        .single()

      if (error) throw error
      return data as AuditTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] })
    }
  })
}

export function useDeleteAuditTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('audit_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] })
    }
  })
}

export function useAuditItems(templateId?: string) {
  return useQuery({
    queryKey: ['audit-items', templateId],
    queryFn: async () => {
      let query = supabase
        .from('audit_items')
        .select('*')
        .order('order_index', { ascending: true })

      if (templateId) {
        query = query.eq('template_id', templateId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AuditItem[]
    },
    enabled: !!templateId
  })
}

export function useAuditRuns(templateId?: string) {
  return useQuery({
    queryKey: ['audit-runs', templateId],
    queryFn: async () => {
      let query = supabase
        .from('audit_runs')
        .select('*')
        .order('created_at', { ascending: false })

      if (templateId) {
        query = query.eq('template_id', templateId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AuditRun[]
    }
  })
}

export function useAuditFindings(runId?: string) {
  return useQuery({
    queryKey: ['audit-findings', runId],
    queryFn: async () => {
      let query = supabase
        .from('audit_findings')
        .select('*')
        .order('created_at', { ascending: false })

      if (runId) {
        query = query.eq('run_id', runId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as AuditFinding[]
    },
    enabled: !!runId
  })
}

export function useCreateAuditTemplate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: Omit<AuditTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'is_active'> & { is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('audit_templates')
        .insert({
          ...payload,
          created_by: user?.id || null,
          is_active: payload.is_active ?? true,
          next_run_at: payload.frequency ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (error) throw error
      return data as AuditTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-templates'] })
    }
  })
}

export function useCreateAuditItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<AuditItem, 'id'>) => {
      const { data, error } = await supabase
        .from('audit_items')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data as AuditItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-items', variables.template_id] })
    }
  })
}

export function useCreateAuditRun() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: { template_id: string; scheduled_for?: string | null }) => {
      const { data, error } = await supabase
        .from('audit_runs')
        .insert({
          template_id: payload.template_id,
          scheduled_for: payload.scheduled_for ?? null,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          created_by: user?.id || null
        })
        .select()
        .single()

      if (error) throw error
      return data as AuditRun
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-runs', variables.template_id] })
    }
  })
}
