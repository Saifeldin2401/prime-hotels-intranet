
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
    } | null
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

            // training_progress columns are mostly nullable at the DB level (many with
            // defaults like now()/0 that make them effectively always-populated), while
            // LearningProgress models the shape the UI actually consumes. Normalize
            // null -> the interface's declared optional/undefined or a sane default here
            // instead of casting past the mismatch.
            return (data || []).map((row): LearningProgress => {
                const rawProfile = row.profiles as unknown as {
                    full_name: string | null
                    email: string
                    avatar_url: string | null
                    user_departments?: Array<{ departments: LearningProgressDept | null }> | null
                    user_properties?: Array<{ properties: { name: string } | null }> | null
                } | null

                const trainingModule = row.content_type === 'module'
                    ? modulesById.get(row.content_id)
                    : null

                return {
                    id: row.id,
                    user_id: row.user_id,
                    assignment_id: row.assignment_id ?? undefined,
                    content_type: row.content_type || '',
                    content_id: row.content_id,
                    status: STATUS_MAP[row.status],
                    progress_percentage: row.progress_percentage ?? 0,
                    score_percentage: row.score_percentage ?? undefined,
                    passed: row.passed ?? undefined,
                    completed_at: row.completed_at ?? undefined,
                    last_accessed_at: row.last_accessed_at ?? undefined,
                    last_block_index: row.last_block_index,
                    last_block_id: row.last_block_id,
                    time_spent_seconds: row.time_spent_seconds,
                    // metadata is a Json column with a known object shape in practice.
                    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
                    created_at: row.created_at || new Date().toISOString(),
                    updated_at: row.updated_at || new Date().toISOString(),
                    profiles: rawProfile
                        ? {
                            full_name: rawProfile.full_name || 'Unknown',
                            email: rawProfile.email,
                            avatar_url: rawProfile.avatar_url ?? undefined,
                            user_departments: rawProfile.user_departments ?? undefined,
                            user_properties: rawProfile.user_properties ?? undefined
                        }
                        : undefined,
                    training_modules: trainingModule
                        ? {
                            id: trainingModule.id,
                            title: trainingModule.title,
                            description: trainingModule.description ?? undefined
                        }
                        : null
                }
            })
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
