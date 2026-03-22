import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type SIEMProvider = 
    | 'splunk' 
    | 'elastic' 
    | 'datadog' 
    | 'sumo_logic' 
    | 'azure_sentinel' 
    | 'google_chronicle' 
    | 'custom_webhook'

export type SIEMAuthType = 'none' | 'bearer' | 'basic' | 'api_key' | 'hmac'

export interface SIEMIntegration {
    id: string
    name: string
    description: string | null
    provider: SIEMProvider
    webhook_url: string
    auth_type: SIEMAuthType
    auth_config
    event_filter: {
        entity_types?: string[]
        actions?: string[]
        min_severity?: string
    }
    rate_limit_per_minute: number
    is_active: boolean
    last_success_at: string | null
    last_error_at: string | null
    last_error_message: string | null
    total_events_sent: number
    total_events_failed: number
    created_at: string
}

export type CreateSIEMIntegrationPayload = Omit<
    SIEMIntegration, 
    'id' | 'last_success_at' | 'last_error_at' | 'last_error_message' | 'total_events_sent' | 'total_events_failed' | 'created_at'
>

export function useSIEMIntegrations() {
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const queryKey = ['siem-integrations']

    const queries = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('siem_integrations')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as SIEMIntegration[]
        }
    })

    const createIntegration = useMutation({
        mutationFn: async (payload: CreateSIEMIntegrationPayload) => {
            const { data, error } = await supabase
                .from('siem_integrations')
                .insert([payload])
                .select()
                .single()

            if (error) throw error
            return data as SIEMIntegration
        },
        onSuccess: () => {
            toast({ title: 'Integration Created', description: 'The SIEM pipeline has been provisioned.' })
            queryClient.invalidateQueries({ queryKey })
        },
        onError: (error) => {
            console.error('Failed to create integration', error)
            toast({ title: 'Configuration Error', description: error.message, variant: 'destructive' })
        }
    })

    const updateIntegration = useMutation({
        mutationFn: async ({ id, ...payload }: Partial<CreateSIEMIntegrationPayload> & { id: string }) => {
            const { data, error } = await supabase
                .from('siem_integrations')
                .update(payload)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data as SIEMIntegration
        },
        onSuccess: () => {
            toast({ title: 'Integration Updated', description: 'The configuration was successfully saved.' })
            queryClient.invalidateQueries({ queryKey })
        },
        onError: (error) => {
            console.error('Failed to update integration', error)
            toast({ title: 'Update Error', description: error.message, variant: 'destructive' })
        }
    })

    const deleteIntegration = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('siem_integrations')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            toast({ title: 'Integration Deleted', description: 'The stream has been permanently removed.' })
            queryClient.invalidateQueries({ queryKey })
        },
        onError: (error) => {
            toast({ title: 'Deletion Error', description: error.message, variant: 'destructive' })
        }
    })

    const toggleStatus = useMutation({
        mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
            const { data, error } = await supabase
                .from('siem_integrations')
                .update({ is_active })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data as SIEMIntegration
        },
        onSuccess: (data) => {
            toast({ 
                title: data.is_active ? 'Integration Enabled' : 'Integration Paused', 
                description: `The stream is now ${data.is_active ? 'running' : 'stopped'}.` 
            })
            queryClient.invalidateQueries({ queryKey })
        }
    })

    return {
        data: queries.data,
        isLoading: queries.isLoading,
        error: queries.error,
        createIntegration,
        updateIntegration,
        deleteIntegration,
        toggleStatus
    }
}
