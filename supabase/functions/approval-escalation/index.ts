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

        const timeoutHours = 48
        const cutoffTime = new Date()
        cutoffTime.setHours(cutoffTime.getHours() - timeoutHours)

        let totalEscalated = 0

        // Find pending document approvals
        const { data: docApprovals } = await supabaseClient
            .from('document_approvals')
            .select(`
        id,
        document_id,
        approver_role,
        created_at,
        documents:document_id (
          id,
          title,
          created_by
        )
      `)
            .eq('status', 'pending')
            .lt('created_at', cutoffTime.toISOString())

        if (docApprovals) {
            for (const approval of docApprovals) {
                // Check if already escalated today
                const today = new Date().toISOString().split('T')[0]
                const { data: existing } = await supabaseClient
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'document_approval')
                    .eq('entity_id', approval.id)
                    .eq('reminder_type', 'escalation')
                    .gte('sent_at', `${today}T00:00:00Z`)
                    .maybeSingle()

                if (existing) continue

                // Get users with the approver role
                const { data: approvers } = await supabaseClient
                    .from('user_roles')
                    .select('user_id')
                    .eq('role', approval.approver_role)

                if (approvers) {
                    for (const approver of approvers) {
                        await supabaseClient.from('notifications').insert({
                            user_id: approver.user_id,
                            type: 'approval_required',
                            title: 'Approval Overdue - Escalated',
                            message: `Document "${approval.documents?.title}" has been pending approval for over ${timeoutHours} hours. Please review urgently.`,
                            entity_type: 'document',
                            entity_id: approval.document_id,
                            link: '/approvals',
                            metadata: { escalated: true, hours_pending: timeoutHours }
                        })

                        totalEscalated++
                    }

                    // Mark as escalated
                    await supabaseClient.from('scheduled_reminders').insert({
                        entity_type: 'document_approval',
                        entity_id: approval.id,
                        user_id: approvers[0].user_id, // Just for tracking
                        reminder_type: 'escalation',
                        scheduled_for: new Date().toISOString(),
                        sent_at: new Date().toISOString(),
                        status: 'sent'
                    })
                }
            }
        }

        // Find pending leave requests
        const { data: leaveRequests } = await supabaseClient
            .from('leave_requests')
            .select(`
        id,
        requester_id,
        type,
        created_at,
        profiles:requester_id (
          id,
          full_name
        )
      `)
            .eq('status', 'pending')
            .lt('created_at', cutoffTime.toISOString())

        if (leaveRequests) {
            for (const request of leaveRequests) {
                const today = new Date().toISOString().split('T')[0]
                const { data: existing } = await supabaseClient
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'leave_request')
                    .eq('entity_id', request.id)
                    .eq('reminder_type', 'escalation')
                    .gte('sent_at', `${today}T00:00:00Z`)
                    .maybeSingle()

                if (existing) continue

                // Get managers/approvers
                const { data: managers } = await supabaseClient
                    .from('user_roles')
                    .select('user_id')
                    .in('role', ['regional_admin', 'regional_hr', 'property_manager'])

                if (managers) {
                    for (const manager of managers) {
                        await supabaseClient.from('notifications').insert({
                            user_id: manager.user_id,
                            type: 'approval_required',
                            title: 'Leave Request Overdue - Escalated',
                            message: `Leave request from ${request.profiles?.full_name} has been pending for over ${timeoutHours} hours. Please review urgently.`,
                            entity_type: 'leave_request',
                            entity_id: request.id,
                            link: '/approvals',
                            metadata: { escalated: true, hours_pending: timeoutHours }
                        })

                        totalEscalated++
                    }

                    await supabaseClient.from('scheduled_reminders').insert({
                        entity_type: 'leave_request',
                        entity_id: request.id,
                        user_id: managers[0].user_id,
                        reminder_type: 'escalation',
                        scheduled_for: new Date().toISOString(),
                        sent_at: new Date().toISOString(),
                        status: 'sent'
                    })
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
