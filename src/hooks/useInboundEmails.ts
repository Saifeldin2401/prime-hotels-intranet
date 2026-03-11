import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type InboundEmailRow = {
  id: string
  email_id: string | null
  message_id: string | null
  from: string | null
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string | null
  created_at: string
  webhook_created_at: string | null
  received_created_at: string | null
  content_fetched_at: string | null
  content_fetch_error: string | null
  html: string | null
  text: string | null
  attachment_downloads: unknown
  raw_download_url: string | null
  raw_expires_at: string | null
}

export function useInboundEmails() {
  return useQuery({
    queryKey: ['inbound-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      return (data || []) as InboundEmailRow[]
    },
  })
}

export function useFetchInboundEmailContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (emailId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-fetch-inbound-email', {
        body: { emailId },
      })

      if (error) {
        throw new Error(error.message || 'Failed to fetch inbound email content')
      }

      if (data && typeof data === 'object' && 'error' in data) {
        const err = (data as { error?: string }).error
        if (err) throw new Error(err)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-emails'] })
    },
  })
}
