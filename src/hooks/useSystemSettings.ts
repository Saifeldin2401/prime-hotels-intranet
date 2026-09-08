import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'

export interface SystemSetting {
    id: string
    key: string
    value: unknown
    category: 'general' | 'security' | 'notifications' | 'branding' | 'hr' | 'operations'
    description: string | null
    organization_id?: string | null
    is_override?: boolean
    updated_at: string
    updated_by: string | null
}

export function useSystemSettings(category?: string, explicitOrgId?: string | null) {
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const { currentOrganization } = useTenant()

    const targetOrgId = explicitOrgId !== undefined ? explicitOrgId : (currentOrganization?.id ?? null)

    const { data: settings = [], isLoading } = useQuery({
        queryKey: ['system-settings', category, targetOrgId],
        queryFn: async () => {
            // 1. Fetch global platform defaults (organization_id IS NULL)
            let globalQuery = (supabase as any)
                .from('system_settings')
                .select('*')
                .is('organization_id', null)
                .order('category')
                .order('key')

            if (category) {
                globalQuery = globalQuery.eq('category', category)
            }

            const { data: globalData, error: globalErr } = await globalQuery
            if (globalErr) throw globalErr

            const baseSettings = (globalData || []) as SystemSetting[]

            // If no target tenant, return global platform defaults
            if (!targetOrgId) {
                return baseSettings.map(s => ({ ...s, is_override: false }))
            }

            // 2. Fetch tenant-specific overrides (organization_id = targetOrgId)
            let tenantQuery = (supabase as any)
                .from('system_settings')
                .select('*')
                .eq('organization_id', targetOrgId)
                .order('category')
                .order('key')

            if (category) {
                tenantQuery = tenantQuery.eq('category', category)
            }

            const { data: tenantData, error: tenantErr } = await tenantQuery
            if (tenantErr) throw tenantErr

            const tenantOverrides = (tenantData || []) as SystemSetting[]
            const overrideMap = new Map<string, SystemSetting>()
            for (const t of tenantOverrides) {
                overrideMap.set(t.key, t)
            }

            // 3. Merge: tenant overrides take precedence over global defaults
            const merged: SystemSetting[] = []
            const seenKeys = new Set<string>()

            for (const base of baseSettings) {
                seenKeys.add(base.key)
                if (overrideMap.has(base.key)) {
                    const ov = overrideMap.get(base.key)!
                    merged.push({
                        ...base,
                        id: ov.id,
                        value: ov.value,
                        organization_id: targetOrgId,
                        is_override: true,
                        updated_at: ov.updated_at,
                        updated_by: ov.updated_by
                    })
                } else {
                    merged.push({
                        ...base,
                        is_override: false
                    })
                }
            }

            // Any extra tenant-only settings not in global base
            for (const ov of tenantOverrides) {
                if (!seenKeys.has(ov.key)) {
                    merged.push({
                        ...ov,
                        is_override: true
                    })
                }
            }

            return merged
        },
    })

    const updateSetting = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
            const currentSetting = settings.find(s => s.key === key)
            const cat = currentSetting?.category || category || 'general'
            const desc = currentSetting?.description || null

            if (targetOrgId) {
                // Tenant-scoped save: check if tenant override already exists
                const { data: existing } = await (supabase as any)
                    .from('system_settings')
                    .select('id')
                    .eq('organization_id', targetOrgId)
                    .eq('key', key)
                    .maybeSingle()

                if (existing) {
                    const { error } = await (supabase as any)
                        .from('system_settings')
                        .update({
                            value: value as never,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id)

                    if (error) throw error
                } else {
                    const { error } = await (supabase as any)
                        .from('system_settings')
                        .insert({
                            organization_id: targetOrgId,
                            key,
                            value: value as never,
                            category: cat,
                            description: desc,
                            updated_at: new Date().toISOString(),
                        })

                    if (error) throw error
                }
            } else {
                // Platform global save (organization_id IS NULL)
                const { error } = await (supabase as any)
                    .from('system_settings')
                    .update({
                        value: value as never,
                        updated_at: new Date().toISOString(),
                    })
                    .is('organization_id', null)
                    .eq('key', key)

                if (error) throw error
            }
        },
        onSuccess: () => {
            toast({ title: 'Setting updated', description: 'System setting has been saved.' })
            queryClient.invalidateQueries({ queryKey: ['system-settings'] })
            queryClient.invalidateQueries({ queryKey: ['system-setting'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to update', description: error.message, variant: 'destructive' })
        },
    })

    const resetSetting = useMutation({
        mutationFn: async (key: string) => {
            if (!targetOrgId) return
            const { error } = await (supabase as any)
                .from('system_settings')
                .delete()
                .eq('organization_id', targetOrgId)
                .eq('key', key)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Reverted to Default', description: 'Setting reverted to platform default.' })
            queryClient.invalidateQueries({ queryKey: ['system-settings'] })
            queryClient.invalidateQueries({ queryKey: ['system-setting'] })
        },
        onError: (error: Error) => {
            toast({ title: 'Reset failed', description: error.message, variant: 'destructive' })
        }
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
        resetSetting,
        getSetting,
        targetOrgId,
    }
}

/**
 * Hook to retrieve a single system setting value reactively via get_setting RPC
 */
export function useSetting<T = unknown>(key: string, defaultValue?: T, explicitOrgId?: string | null) {
    const { currentOrganization } = useTenant()
    const targetOrgId = explicitOrgId !== undefined ? explicitOrgId : (currentOrganization?.id ?? null)

    const { data: setting, isLoading } = useQuery({
        queryKey: ['system-setting', key, targetOrgId],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_setting', {
                p_org_id: targetOrgId,
                p_key: key
            })

            if (error) {
                // Fallback to direct query if RPC unavailable
                const { data: row } = await (supabase as any)
                    .from('system_settings')
                    .select('value')
                    .eq('key', key)
                    .maybeSingle()
                return row ? (row.value as T) : (defaultValue as T)
            }

            return data !== null && data !== undefined ? (data as T) : (defaultValue as T)
        },
        staleTime: 60000,
    })

    return {
        value: setting ?? defaultValue,
        isLoading,
    }
}

/**
 * Hook for Maintenance Mode status (strictly platform-global)
 */
export function useMaintenanceMode() {
    const { value: isMaintenance, isLoading } = useSetting<boolean>('maintenance_mode', false, null)
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
