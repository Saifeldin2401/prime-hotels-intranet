import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/lib/constants'
import type { OnboardingProcess, OnboardingTask, OnboardingTaskDefinition, OnboardingTemplate } from '@/lib/types'
import type { Json } from '@/types/database.generated'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// onboarding_templates.role is the full DB app_role enum (includes 'super_admin'), but
// AppRole intentionally excludes it (see src/lib/constants.ts) since super_admin is a
// system role, not a template-targetable one. A template stored against that DB-only
// value has no meaningful role restriction in the UI.
function normalizeTemplateRole(role: string | null): AppRole | null {
    return role === 'super_admin' ? null : (role as AppRole | null)
}

type OnboardingTemplateRow = {
    id: string
    title: string
    role: string | null
    job_title: string | null
    department_id: string | null
    tasks: Json
    required_training_ids: string[] | null
    is_active: boolean | null
    created_at: string
    updated_at: string
}

function mapOnboardingTemplateRow(row: OnboardingTemplateRow): OnboardingTemplate {
    return {
        id: row.id,
        title: row.title,
        role: normalizeTemplateRole(row.role),
        job_title: row.job_title,
        department_id: row.department_id,
        // tasks is a jsonb column with a known array-of-task-definition shape.
        tasks: ((row.tasks as unknown as OnboardingTaskDefinition[]) || []),
        required_training_ids: row.required_training_ids || [],
        is_active: row.is_active ?? true,
        created_at: row.created_at,
        updated_at: row.updated_at
    }
}

// OnboardingTaskDefinition's optional properties make it structurally incompatible with
// the strict Json type even though the runtime shape is exactly what's stored in the
// jsonb `tasks` column, so the write payload casts that one field through Json.
function toOnboardingTemplateWriteData<T extends Partial<OnboardingTemplate>>(input: T) {
    const { tasks, ...rest } = input
    return {
        ...rest,
        ...(tasks !== undefined ? { tasks: tasks as unknown as Json } : {})
    }
}

export function useMyOnboarding() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['onboarding', 'my', user?.id],
        queryFn: async () => {
            if (!user) return null

            const { data, error } = await supabase
                .from('onboarding_process')
                .select(`
          *,
          template:onboarding_templates(title),
          tasks:onboarding_tasks(*)
        `)
                .eq('user_id', user.id)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) {
                if (error.code === 'PGRST116') return null // No onboarding found
                throw error
            }

            return data as OnboardingProcess
        },
        enabled: !!user,
    })
}

export function useUpdateOnboardingTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
            const { data, error } = await supabase
                .from('onboarding_tasks')
                .update({
                    is_completed: isCompleted,
                    status: isCompleted ? 'completed' : 'pending',
                    completed_at: isCompleted ? new Date().toISOString() : null,
                })
                .eq('id', taskId)
                .select()

            if (error) throw error

            if (!data || data.length === 0) {
                throw new Error('Permission denied or task not found (RLS)')
            }

            return data[0]
        },
        onSuccess: (_) => {
            queryClient.invalidateQueries({ queryKey: ['onboarding'] })
        },
    })
}

// Template Management Hooks
export function useOnboardingTemplates() {
    return useQuery({
        queryKey: ['onboarding', 'templates'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('onboarding_templates')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []).map(mapOnboardingTemplateRow)
        }
    })
}

export function useCreateOnboardingTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (template: Partial<OnboardingTemplate> & Pick<OnboardingTemplate, 'title'>) => {
            const { data, error } = await supabase
                .from('onboarding_templates')
                .insert(toOnboardingTemplateWriteData(template))
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'templates'] })
        }
    })
}

export function useDeleteOnboardingTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('onboarding_templates')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'templates'] })
        }
    })
}

export function useOnboardingTemplate(id: string | undefined) {
    return useQuery({
        queryKey: ['onboarding', 'template', id],
        queryFn: async () => {
            if (!id) return null
            const { data, error } = await supabase
                .from('onboarding_templates')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data ? mapOnboardingTemplateRow(data) : null
        },
        enabled: !!id
    })
}

export function useUpdateOnboardingTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<OnboardingTemplate> }) => {
            const { data, error } = await supabase
                .from('onboarding_templates')
                .update(toOnboardingTemplateWriteData(updates))
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'templates'] })
            queryClient.invalidateQueries({ queryKey: ['onboarding', 'template'] })
        }
    })
}

export function useOnboardingTasks(processId: string | undefined) {
    return useQuery({
        queryKey: ['onboarding', 'tasks', processId],
        queryFn: async () => {
            if (!processId) return []
            const { data, error } = await supabase
                .from('onboarding_tasks')
                .select('*')
                .eq('process_id', processId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as OnboardingTask[]
        },
        enabled: !!processId
    })
}

