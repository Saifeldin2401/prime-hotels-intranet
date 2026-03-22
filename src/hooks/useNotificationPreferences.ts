import { supabase } from '@/lib/supabase'
import type { NotificationPreference } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

const isAuthError = (error: unknown) => {
    if (!error || typeof error !== 'object') return false
    const candidate = error as { code?: string | number; status?: number }
    const code = String(candidate.code ?? '')
    const status = Number(candidate.status ?? 0)
    return status === 401 || code === '401' || code === 'PGRST301' || code === 'PGRST302'
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
                .limit(1)

            if (error) {
                throw error
            }

            const existingPreferences = Array.isArray(data) ? data[0] : null

            if (existingPreferences) {
                return existingPreferences as NotificationPreference
            }

            // No row exists yet for this user: create defaults in an idempotent way.
            const defaultPreferences = {
                user_id: user!.id,
                email_enabled: true,
                approval_email: true,
                training_email: true,
                announcement_email: true,
                maintenance_email: true,
                browser_push_enabled: false,
                approval_push: false,
                training_push: false,
                announcement_push: false,
                maintenance_push: false,
                quiet_hours_enabled: false,
                quiet_hours_start: '22:00:00',
                quiet_hours_end: '08:00:00',
                daily_digest_enabled: false,
                notification_sounds_enabled: true
            }

            const { error: createError } = await supabase
                .from('notification_preferences')
                .upsert(defaultPreferences, { onConflict: 'user_id' })

            if (createError) throw createError

            const { data: createdRows, error: loadCreatedError } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', user!.id)
                .limit(1)

            if (loadCreatedError) throw loadCreatedError
            const createdPreferences = Array.isArray(createdRows) ? createdRows[0] : null

            if (!createdPreferences) {
                return defaultPreferences as NotificationPreference
            }
            return createdPreferences as NotificationPreference
        },
        retry: (failureCount, queryError) => !isAuthError(queryError) && failureCount < 2
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
