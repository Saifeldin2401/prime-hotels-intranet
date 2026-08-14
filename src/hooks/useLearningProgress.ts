
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
                .from('training_progress')
                // training_progress stores the content reference as training_id / lp_content_type.
                // Alias them to the legacy content_id / content_type names this layer expects.
                .select(`
          *,
          content_id:training_id,
          content_type:lp_content_type,
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

            // training_progress.status uses the training_status enum; map it to the
            // learning_assignment_status values the UI renders. Every training_status
            // value is listed explicitly so the mapped result is always a valid
            // LearningProgress['status'] with no fallback to the raw DB value needed.
            const STATUS_MAP: Record<'not_started' | 'in_progress' | 'completed' | 'expired', LearningProgress['status']> = {
                not_started: 'assigned',
                in_progress: 'in_progress',
                completed: 'completed',
                expired: 'overdue'
            }

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
                status: STATUS_MAP[row.status],
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
            // profiles has no direct department_id/property_id FK -- department and
            // property membership live in the user_departments/user_properties
            // join tables, so those have to be embedded instead.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, user_departments(departments(name)), user_properties(properties(name))')
                .order('full_name')

            if (error) throw error
            return data || []
        }
    })
}
