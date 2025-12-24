import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { NotificationPreference } from '@/lib/types'
import { toast } from 'sonner'

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
                    return newData as NotificationPreference
                }
                throw error
            }
            return data as NotificationPreference
        }
    })

    const updatePreferences = useMutation({
        mutationFn: async (newPreferences: Partial<NotificationPreference>) => {
            if (!user) return

            const { error } = await supabase
                .from('notification_preferences')
                .update(newPreferences)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] })
            toast.success('Preferences updated')
        }
    })

    return {
        preferences,
        isLoading,
        error,
        updatePreferences
    }
}
