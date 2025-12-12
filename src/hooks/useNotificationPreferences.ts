import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface NotificationPreferences {
    id: string
    user_id: string
    email_enabled: boolean
    approval_email: boolean
    training_email: boolean
    announcement_email: boolean
    maintenance_email: boolean
    created_at: string
    updated_at: string
}

export function useNotificationPreferences() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const { data: preferences, isLoading, error } = useQuery({
        queryKey: ['notification-preferences', user?.id],
        enabled: !!user,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user!.id)
                .single()

            if (error) {
                // If not found, create default preferences
                if (error.code === 'PGRST116') {
                    const { data: newData, error: createError } = await supabase
                        .from('notification_preferences')
                        .insert({
                            user_id: user!.id,
                            email_enabled: true,
                            approval_email: true,
                            training_email: true,
                            announcement_email: true,
                            maintenance_email: true
                        })
                        .select()
                        .single()

                    if (createError) throw createError
                    return newData as NotificationPreferences
                }
                throw error
            }
            return data as NotificationPreferences
        }
    })

    const updatePreferences = useMutation({
        mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
            if (!user) return

            const { error } = await supabase
                .from('notification_preferences')
                .update(newPreferences)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] })
        }
    })

    return {
        preferences,
        isLoading,
        error,
        updatePreferences
    }
}
