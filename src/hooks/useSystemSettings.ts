import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface SystemSetting {
    id: string
    key: string
    value: unknown
    category: 'general' | 'security' | 'notifications' | 'branding' | 'hr' | 'operations'
    description: string | null
    updated_at: string
    updated_by: string | null
}

export function useSystemSettings(category?: string) {
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: settings = [], isLoading } = useQuery({
        queryKey: ['system-settings', category],
        queryFn: async () => {
            let query = supabase
                .from('system_settings')
                .select('*')
                .order('category')
                .order('key')

            if (category) {
                query = query.eq('category', category)
            }

            const { data, error } = await query
            if (error) throw error
            return data as SystemSetting[]
        },
    })

    const updateSetting = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    value: value as never,
                    updated_at: new Date().toISOString(),
                })
                .eq('key', key)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Setting updated', description: 'System setting has been saved.' })
            queryClient.invalidateQueries({ queryKey: ['system-settings'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to update', description: error.message, variant: 'destructive' })
        },
    })

    // Helper to get a specific setting value
    const getSetting = <T = unknown>(key: string, defaultValue?: T): T => {
        const setting = settings.find(s => s.key === key)
        if (!setting) return defaultValue as T
        return setting.value as T
    }

    // Group by category
    const groupedSettings = settings.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = []
        acc[s.category].push(s)
        return acc
    }, {} as Record<string, SystemSetting[]>)

    return {
        settings,
        groupedSettings,
        isLoading,
        updateSetting,
        getSetting,
    }
}
