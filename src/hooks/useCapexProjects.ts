import { useToast } from '@/components/ui/use-toast'
import { useProperty } from '@/contexts/PropertyContext'
import { isConsolidatedPropertyId, isRealPropertyId } from '@/lib/propertyScope'
import { supabase } from '@/lib/supabase'
import type {
  CapexExpenditure,
  CapexMilestone,
  CapexProject,
  CapexProjectTemplate,
  CreateCapexExpenditureInput,
  CreateCapexMilestoneInput,
  CreateCapexProjectInput,
  CreatePreOpeningChecklistItemInput,
  PreOpeningChecklistItem,
  PreOpeningChecklistStatus,
} from '@/types/capex'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

type CapexProjectRow = CapexProject & {
  property?: { name?: string | null } | null
}

export function useCapexProjects(categoryFilter?: string) {
  const { currentProperty, propertyIds } = useProperty()
  const currentPropertyId = currentProperty?.id

  return useQuery({
    queryKey: ['capex-projects', currentPropertyId, propertyIds, categoryFilter],
    queryFn: async (): Promise<CapexProject[]> => {
      let query = supabase
        .from('capex_projects')
        .select('*, property:properties(name)')
        .order('created_at', { ascending: false })

      if (isRealPropertyId(currentPropertyId)) {
        query = query.or(`property_id.eq.${currentPropertyId},property_id.is.null`)
      } else if (propertyIds && propertyIds.length > 0) {
        query = query.or(`property_id.in.(${propertyIds.join(',')}),property_id.is.null`)
      } else if (!currentPropertyId || isConsolidatedPropertyId(currentPropertyId)) {
        query = query.is('property_id', null)
      }

      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return ((data || []) as CapexProjectRow[]).map((project) => ({
        ...project,
        property_name: project.property?.name,
      })) as CapexProject[]
    },
  })
}

export function useCreateCapexProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: CreateCapexProjectInput) => {
      const { data, error } = await supabase
        .from('capex_projects')
        .insert([{
          property_id: input.property_id || null,
          title: input.title,
          description: input.description || null,
          category: input.category,
          status: input.status || 'planning',
          priority: input.priority || 'medium',
          allocated_budget: input.allocated_budget,
          target_completion_date: input.target_completion_date || null,
          project_manager_id: input.project_manager_id || null,
          created_by: input.created_by,
        }])
        .select()
        .single()

      if (error) throw error
      return data as CapexProject
    },
    onSuccess: () => {
      toast({ title: 'Project Created', description: 'CAPEX project has been initialized.' })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })
}

export function useUpdateCapexProjectStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CapexProject['status'] }) => {
      const { error } = await supabase
        .from('capex_projects')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function useCapexMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ['capex-milestones', projectId],
    queryFn: async (): Promise<CapexMilestone[]> => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('capex_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      if (error) throw error
      return (data || []) as CapexMilestone[]
    },
    enabled: !!projectId,
  })
}

export function useCreateCapexMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCapexMilestoneInput) => {
      const { data, error } = await supabase
        .from('capex_milestones')
        .insert([{
          project_id: payload.project_id,
          title: payload.title,
          due_date: payload.due_date || null,
          status: payload.status || 'pending',
          owner_id: payload.owner_id || null,
          created_by: payload.created_by || null,
        }])
        .select()
        .single()

      if (error) throw error
      return data as CapexMilestone
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capex-milestones', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function useUpdateCapexMilestoneStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, project_id, status }: { id: string; project_id: string; status: CapexMilestone['status'] }) => {
      const { error } = await supabase
        .from('capex_milestones')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)

      if (error) throw error
      return { project_id }
    },
    onSuccess: ({ project_id }) => {
      queryClient.invalidateQueries({ queryKey: ['capex-milestones', project_id] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function useCapexExpenditures(projectId: string | null) {
  return useQuery({
    queryKey: ['capex-expenditures', projectId],
    queryFn: async (): Promise<CapexExpenditure[]> => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('capex_expenditures')
        .select('*')
        .eq('project_id', projectId)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return (data || []) as CapexExpenditure[]
    },
    enabled: !!projectId,
  })
}

export function useCreateCapexExpenditure() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCapexExpenditureInput) => {
      const { data, error } = await supabase
        .from('capex_expenditures')
        .insert([{
          project_id: payload.project_id,
          amount: payload.amount,
          vendor_name: payload.vendor_name || null,
          invoice_number: payload.invoice_number || null,
          expense_date: payload.expense_date || new Date().toISOString().slice(0, 10),
          notes: payload.notes || null,
          created_by: payload.created_by || null,
        }])
        .select()
        .single()

      if (error) throw error
      return data as CapexExpenditure
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['capex-expenditures', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function usePreOpeningChecklistItems(projectId: string | null) {
  return useQuery({
    queryKey: ['pre-opening-checklist-items', projectId],
    queryFn: async (): Promise<PreOpeningChecklistItem[]> => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('pre_opening_checklist_items')
        .select('*')
        .eq('project_id', projectId)
        .order('phase', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []) as PreOpeningChecklistItem[]
    },
    enabled: !!projectId,
  })
}

export function useCreatePreOpeningChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreatePreOpeningChecklistItemInput) => {
      const { data, error } = await supabase
        .from('pre_opening_checklist_items')
        .insert([{
          project_id: payload.project_id,
          phase: payload.phase,
          title: payload.title,
          description: payload.description || null,
          status: payload.status || 'not_started',
          priority: payload.priority || 'medium',
          assigned_to: payload.assigned_to || null,
          due_date: payload.due_date || null,
          created_by: payload.created_by || null,
        }])
        .select()
        .single()

      if (error) throw error
      return data as PreOpeningChecklistItem
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-checklist-items', variables.project_id] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function useUpdatePreOpeningChecklistItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, project_id, status }: { id: string; project_id: string; status: PreOpeningChecklistStatus }) => {
      const { error } = await supabase
        .from('pre_opening_checklist_items')
        .update({
          status,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', id)

      if (error) throw error
      return { project_id }
    },
    onSuccess: ({ project_id }) => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-checklist-items', project_id] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}

export function useCapexProjectTemplates() {
  return useQuery({
    queryKey: ['capex-project-templates'],
    queryFn: async (): Promise<CapexProjectTemplate[]> => {
      const { data, error } = await supabase
        .from('capex_project_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name')

      if (error) throw error
      return ((data || []) as unknown) as CapexProjectTemplate[]
    },
  })
}

export function useSeedChecklistFromTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, template, createdBy }: { projectId: string; template: CapexProjectTemplate; createdBy?: string | null }) => {
      const rows = template.default_checklist.map((item) => ({
        project_id: projectId,
        phase: item.phase,
        title: item.title,
        description: item.description || null,
        priority: item.priority || 'medium',
        created_by: createdBy || null,
      }))

      if (rows.length === 0) return []

      const { data, error } = await supabase
        .from('pre_opening_checklist_items')
        .insert(rows)
        .select()

      if (error) throw error
      return (data || []) as PreOpeningChecklistItem[]
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-checklist-items', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] })
    },
  })
}
