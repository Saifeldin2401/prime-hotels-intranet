import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ===================================
        // SECURITY CHECK - Internal Crons Only
        // ===================================
        const authHeader = req.headers.get('Authorization')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        // Allow if Authorization matches Service Role Key (Internal Cron)
        if (authHeader !== `Bearer ${serviceRoleKey}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey, // Used for the client
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('Starting approval escalation workflow...')

        const now = new Date()
        const today = now.toISOString().split('T')[0]

        const { data: rules, error: rulesError } = await supabaseClient
            .from('escalation_rules')
            .select('action_type, threshold_hours, next_role, is_active')
            .eq('is_active', true)

        if (rulesError) throw rulesError

        const rulesByType = new Map<string, { threshold_hours: number; next_role: string }>()
        for (const r of rules || []) {
            rulesByType.set(r.action_type, { threshold_hours: r.threshold_hours, next_role: r.next_role })
        }

        let totalEscalated = 0

        const getCutoffIso = (hours: number) => {
            const cutoff = new Date(now)
            cutoff.setHours(cutoff.getHours() - hours)
            return cutoff.toISOString()
        }

        const ensureNotSentToday = async (entityType: string, entityId: string) => {
            const { data: existing, error } = await supabaseClient
                .from('scheduled_reminders')
                .select('id')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('reminder_type', 'escalation')
                .gte('sent_at', `${today}T00:00:00Z`)
                .maybeSingle()

            if (error) throw error
            return !existing
        }

        const markSent = async (entityType: string, entityId: string, userId: string) => {
            const { error } = await supabaseClient.from('scheduled_reminders').insert({
                entity_type: entityType,
                entity_id: entityId,
                user_id: userId,
                reminder_type: 'escalation',
                scheduled_for: now.toISOString(),
                sent_at: now.toISOString(),
                status: 'sent'
            })

            if (error) throw error
        }

        const notifyUsers = async (userIds: string[], type: string, title: string, message: string, meta: Record<string, unknown>) => {
            if (userIds.length === 0) return
            const payload = userIds.map(uid => ({
                user_id: uid,
                type,
                title,
                message,
                metadata: meta
            }))

            const { error } = await supabaseClient.from('notifications').insert(payload)
            if (error) throw error
        }

        // Document approvals escalation (action_type: document_approval)
        const docRule = rulesByType.get('document_approval')
        if (docRule) {
            const cutoffIso = getCutoffIso(docRule.threshold_hours)
            const { data: docApprovals, error: docError } = await supabaseClient
                .from('document_approvals')
                .select(`
          id,
          document_id,
          created_at,
          documents:document_id (id, title)
        `)
                .eq('status', 'pending')
                .eq('is_active', true)
                .lt('created_at', cutoffIso)

            if (docError) throw docError

            for (const approval of docApprovals || []) {
                const ok = await ensureNotSentToday('document_approval', approval.id)
                if (!ok) continue

                const { data: escalatedTo, error: escalatedToError } = await supabaseClient
                    .from('user_roles')
                    .select('user_id')
                    .eq('role', docRule.next_role)

                if (escalatedToError) throw escalatedToError

                const userIds = (escalatedTo || []).map((x: { user_id: string }) => x.user_id)
                await notifyUsers(
                    userIds,
                    'escalation_alert',
                    'Approval Escalated',
                    `Document "${approval.documents?.title ?? 'Document'}" is overdue for approval.`,
                    {
                        entity_type: 'document',
                        entity_id: approval.document_id,
                        link: '/approvals',
                        approval_id: approval.id,
                        escalated: true,
                        threshold_hours: docRule.threshold_hours,
                        next_role: docRule.next_role,
                    }
                )

                if (userIds.length > 0) {
                    await markSent('document_approval', approval.id, userIds[0])
                    totalEscalated += userIds.length
                }
            }
        }

        // Leave requests escalation (action_type: leave_request)
        const leaveRule = rulesByType.get('leave_request')
        if (leaveRule) {
            const cutoffIso = getCutoffIso(leaveRule.threshold_hours)
            const { data: leaveRequests, error: leaveError } = await supabaseClient
                .from('leave_requests')
                .select(`
          id,
          requester_id,
          type,
          created_at,
          profiles:requester_id (id, full_name)
        `)
                .eq('status', 'pending')
                .lt('created_at', cutoffIso)

            if (leaveError) throw leaveError

            for (const request of leaveRequests || []) {
                const ok = await ensureNotSentToday('leave_request', request.id)
                if (!ok) continue

                const { data: escalatedTo, error: escalatedToError } = await supabaseClient
                    .from('user_roles')
                    .select('user_id')
                    .eq('role', leaveRule.next_role)

                if (escalatedToError) throw escalatedToError

                const userIds = (escalatedTo || []).map((x: { user_id: string }) => x.user_id)
                await notifyUsers(
                    userIds,
                    'escalation_alert',
                    'Leave Request Escalated',
                    `Leave request from ${request.profiles?.full_name ?? 'an employee'} is overdue for approval.`,
                    {
                        entity_type: 'leave_request',
                        entity_id: request.id,
                        link: '/approvals',
                        escalated: true,
                        threshold_hours: leaveRule.threshold_hours,
                        next_role: leaveRule.next_role,
                    }
                )

                if (userIds.length > 0) {
                    await markSent('leave_request', request.id, userIds[0])
                    totalEscalated += userIds.length
                }
            }
        }

        console.log(`Escalated ${totalEscalated} approvals`)

        return new Response(
            JSON.stringify({
                success: true,
                approvals_escalated: totalEscalated
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in approval-escalation:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
