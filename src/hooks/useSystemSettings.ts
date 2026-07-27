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

/**
 * Hook to retrieve a single system setting value reactively
 */
export function useSetting<T = unknown>(key: string, defaultValue?: T) {
    const { data: setting, isLoading } = useQuery({
        queryKey: ['system-setting', key],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', key)
                .maybeSingle()

            if (error) throw error
            return data ? (data.value as T) : (defaultValue as T)
        },
        staleTime: 60000,
    })

    return {
        value: setting ?? defaultValue,
        isLoading,
    }
}

/**
 * Hook for Maintenance Mode status
 */
export function useMaintenanceMode() {
    const { value: isMaintenance, isLoading } = useSetting<boolean>('maintenance_mode', false)
    return { isMaintenance: Boolean(isMaintenance), isLoading }
}

/**
 * Hook for App & Corporate Branding settings
 */
export function useAppBranding() {
    const { settings, isLoading } = useSystemSettings('branding')
    const { settings: generalSettings } = useSystemSettings('general')

    const appName = (settings.find(s => s.key === 'app_name')?.value as string) || 'Altus Advisory'
    const companyName = (settings.find(s => s.key === 'company_name')?.value as string) || 'Altus Advisory'
    const companyProfile = generalSettings.find(s => s.key === 'company_profile')?.value as {
        name?: string
        brand?: string
        tagline?: string
        support_email?: string
    } || {}

    return {
        appName,
        companyName,
        companyProfile,
        isLoading,
    }
}

/**
 * Hook for Security Settings
 */
export function useSecuritySettings() {
    const { settings, isLoading } = useSystemSettings('security')

    return {
        force2FA: Boolean(settings.find(s => s.key === 'force_2fa')?.value ?? false),
        maxLoginAttempts: Number(settings.find(s => s.key === 'max_login_attempts')?.value ?? 5),
        passwordExpiryDays: Number(settings.find(s => s.key === 'password_expiry_days')?.value ?? 90),
        passwordMinLength: Number(settings.find(s => s.key === 'password_min_length')?.value ?? 8),
        sessionTimeoutMinutes: Number(settings.find(s => s.key === 'session_timeout_minutes')?.value ?? 30),
        isLoading,
    }
}

/**
 * Hook for HR & Compliance Settings
 */
export function useHRSettings() {
    const { settings, isLoading } = useSystemSettings('hr')

    return {
        iqamaExpiryWarningDays: Number(settings.find(s => s.key === 'iqama_expiry_warning_days')?.value ?? 60),
        probationPeriodDays: Number(settings.find(s => s.key === 'probation_period_days')?.value ?? 90),
        autoApproveLeave: Boolean(settings.find(s => s.key === 'auto_approve_leave')?.value ?? false),
        isLoading,
    }
}
