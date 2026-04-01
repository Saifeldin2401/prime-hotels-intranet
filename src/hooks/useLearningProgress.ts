
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export interface LearningProgressDept {
    id?: string
    name: string
}

export interface LearningProgress {
    id: string
    user_id: string
    assignment_id?: string
    content_type: string
    content_id: string
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'excused'
    progress_percentage: number
    score_percentage?: number
    passed?: boolean
    completed_at?: string
    last_accessed_at?: string
    last_block_index?: number | null
    last_block_id?: string | null
    time_spent_seconds?: number | null
    metadata?: Record<string, unknown> | null
    created_at: string
    updated_at: string
    // Joined fields
    profiles?: {
        full_name: string
        email: string
        avatar_url?: string
        user_departments?: Array<{ departments: LearningProgressDept | null }>
        user_properties?: Array<{ properties: { name: string } | null }>
    }
    training_modules?: {
        id: string
        title: string
        description?: string
    }
}

export function useLearningProgress() {
    return useQuery({
        queryKey: ['learning-progress'],
        staleTime: 0, // Disable stale time - always fetch fresh data
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('learning_progress')
                .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            user_departments (
              departments ( id, name )
            ),
            user_properties (
              properties ( id, name )
            )
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const moduleIds = Array.from(new Set(
                (data || [])
                    .filter((row) => row.content_type === 'module' && typeof row.content_id === 'string')
                    .map((row) => row.content_id)
            ))

            let modulesById = new Map<string, LearningProgress['training_modules']>()
            if (moduleIds.length > 0) {
                const { data: modules, error: modulesError } = await supabase
                    .from('training_modules')
                    .select('id, title, description')
                    .in('id', moduleIds)

                if (modulesError) throw modulesError
                modulesById = new Map((modules || []).map((module) => [module.id, module]))
            }

            return (data || []).map((row) => ({
                ...row,
                training_modules: row.content_type === 'module'
                    ? (modulesById.get(row.content_id) || null)
                    : null
            })) as LearningProgress[]
        }
    })
}

export function useOrgUsers() {
    return useQuery({
        queryKey: ['org-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, department:departments(name), property:properties(name)')
                .order('full_name')

            if (error) throw error
            return data || []
        }
    })
}
