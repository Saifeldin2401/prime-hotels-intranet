import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OnboardingProcess, OnboardingTask, OnboardingTemplate } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

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
                .eq('status', 'active')
                .single()

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
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
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
            return data as OnboardingTemplate[]
        }
    })
}

export function useCreateOnboardingTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (template: Partial<OnboardingTemplate>) => {
            const { data, error } = await supabase
                .from('onboarding_templates')
                .insert(template)
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
            return data as OnboardingTemplate
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
                .update(updates)
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

