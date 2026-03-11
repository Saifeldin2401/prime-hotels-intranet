
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LearningProgressDept {
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
    created_at: string
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
              departments ( name )
            ),
            user_properties (
              properties ( name )
            )
          ),
          training_modules:training_module_id (
            id,
            title,
            description
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as LearningProgress[]
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

