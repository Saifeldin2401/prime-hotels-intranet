import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('Starting daily workflows execution...')

        // Get all active scheduled workflows that should run daily
        const { data: workflows, error: workflowError } = await supabaseClient
            .from('workflow_definitions')
            .select('*')
            .eq('is_active', true)
            .eq('type', 'scheduled')

        if (workflowError) {
            throw workflowError
        }

        const results = []

        for (const workflow of workflows || []) {
            const triggerConfig = workflow.trigger_config || {}

            // Check if this workflow should run daily
            if (triggerConfig.cron && triggerConfig.cron.includes('* * *')) {
                console.log(`Executing workflow: ${workflow.name}`)

                const startTime = Date.now()

                // Create execution record
                const { data: execution, error: execError } = await supabaseClient
                    .from('workflow_executions')
                    .insert({
                        workflow_id: workflow.id,
                        status: 'running',
                        metadata: { triggered_by: 'edge_function', function: 'daily-workflows' }
                    })
                    .select()
                    .single()

                if (execError) {
                    console.error(`Failed to create execution for ${workflow.name}:`, execError)
                    continue
                }

                try {
                    // Execute the workflow action
                    const result = await executeWorkflowAction(supabaseClient, workflow)

                    // Update execution as completed
                    const executionTime = Date.now() - startTime
                    await supabaseClient
                        .from('workflow_executions')
                        .update({
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            result,
                            execution_time_ms: executionTime
                        })
                        .eq('id', execution.id)

                    results.push({
                        workflow: workflow.name,
                        status: 'completed',
                        result,
                        execution_time_ms: executionTime
                    })

                    console.log(`Completed workflow: ${workflow.name}`, result)
                } catch (error) {
                    // Update execution as failed
                    const executionTime = Date.now() - startTime
                    await supabaseClient
                        .from('workflow_executions')
                        .update({
                            status: 'failed',
                            completed_at: new Date().toISOString(),
                            error: error instanceof Error ? error.message : String(error),
                            execution_time_ms: executionTime
                        })
                        .eq('id', execution.id)

                    results.push({
                        workflow: workflow.name,
                        status: 'failed',
                        error: error instanceof Error ? error.message : String(error)
                    })

                    console.error(`Failed workflow: ${workflow.name}`, error)
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                executed: results.length,
                results
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in daily-workflows:', error)
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

async function executeWorkflowAction(supabaseClient: any, workflow: any) {
    const { action_config } = workflow

    switch (action_config.action) {
        case 'send_training_reminders':
            return await sendTrainingReminders(supabaseClient, action_config)

        case 'notify_overdue_tasks':
            return await notifyOverdueTasks(supabaseClient, action_config)

        case 'send_leave_balance_alerts':
            return await sendLeaveBalanceAlerts(supabaseClient, action_config)

        default:
            throw new Error(`Unknown workflow action: ${action_config.action}`)
    }
}

async function sendTrainingReminders(supabaseClient: any, config: any) {
    const daysBeforeArray = config.days_before || [3, 1]
    let totalSent = 0

    for (const daysBefore of daysBeforeArray) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + daysBefore)
        targetDate.setHours(23, 59, 59, 999)

        const { data: assignments } = await supabaseClient
            .from('learning_assignments')
            .select(`
        id,
        content_id,
        target_type,
        target_id,
        due_date,
        training_modules:content_id (
          id,
          title
        )
      `)
            .eq('content_type', 'module')
            .not('due_date', 'is', null)
            .gte('due_date', new Date().toISOString())
            .lte('due_date', targetDate.toISOString())

        if (!assignments) continue

        for (const assignment of assignments) {
            const userIds = await resolveAssignmentTargets(supabaseClient, assignment.target_type, assignment.target_id)
            const moduleTitle = assignment.training_modules?.title || 'Training Module'

            for (const userId of userIds) {
                // Check if already sent
                const { data: existing } = await supabaseClient
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'training_assignment')
                    .eq('entity_id', assignment.id)
                    .eq('user_id', userId)
                    .eq('reminder_type', `${daysBefore}_days_before`)
                    .eq('status', 'sent')
                    .maybeSingle()

                if (existing) continue

                // Create notification
                await supabaseClient.from('notifications').insert({
                    user_id: userId,
                    type: 'training_deadline',
                    title: 'Training Deadline Approaching',
                    message: `Your training "${moduleTitle}" is due in ${daysBefore} day${daysBefore > 1 ? 's' : ''}. Please complete it soon.`,
                    entity_type: 'training_assignment',
                    entity_id: assignment.id,
                    link: '/training/my-learning',
                    metadata: { days_remaining: daysBefore }
                })

                // Mark as sent
                await supabaseClient.from('scheduled_reminders').insert({
                    entity_type: 'training_assignment',
                    entity_id: assignment.id,
                    user_id: userId,
                    reminder_type: `${daysBefore}_days_before`,
                    scheduled_for: new Date().toISOString(),
                    sent_at: new Date().toISOString(),
                    status: 'sent'
                })

                totalSent++
            }
        }
    }

    return { reminders_sent: totalSent }
}

async function notifyOverdueTasks(supabaseClient: any, config: any) {
    const now = new Date().toISOString()
    let totalNotified = 0

    const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('id, title, assigned_to_id, due_date')
        .eq('status', 'open')
        .not('due_date', 'is', null)
        .lt('due_date', now)
        .eq('is_deleted', false)

    if (!tasks) return { tasks_notified: 0 }

    for (const task of tasks) {
        if (!task.assigned_to_id) continue

        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabaseClient
            .from('scheduled_reminders')
            .select('id')
            .eq('entity_type', 'task')
            .eq('entity_id', task.id)
            .eq('user_id', task.assigned_to_id)
            .eq('reminder_type', 'overdue_daily')
            .gte('sent_at', `${today}T00:00:00Z`)
            .maybeSingle()

        if (existing) continue

        await supabaseClient.from('notifications').insert({
            user_id: task.assigned_to_id,
            type: 'task_overdue',
            title: 'Task Overdue',
            message: `Your task "${task.title}" is overdue. Please complete it as soon as possible.`,
            entity_type: 'task',
            entity_id: task.id,
            link: '/tasks',
            metadata: { due_date: task.due_date }
        })

        await supabaseClient.from('scheduled_reminders').insert({
            entity_type: 'task',
            entity_id: task.id,
            user_id: task.assigned_to_id,
            reminder_type: 'overdue_daily',
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            status: 'sent'
        })

        totalNotified++
    }

    return { tasks_notified: totalNotified }
}

async function sendLeaveBalanceAlerts(supabaseClient: any, config: any) {
    // Placeholder for leave balance alerts
    return { alerts_sent: 0 }
}

async function resolveAssignmentTargets(supabaseClient: any, targetType: string, targetId: string | null): Promise<string[]> {
    const userIds: string[] = []

    switch (targetType) {
        case 'everyone':
            const { data: allUsers } = await supabaseClient.from('profiles').select('id')
            if (allUsers) userIds.push(...allUsers.map((u: any) => u.id))
            break

        case 'user':
            if (targetId) userIds.push(targetId)
            break

        case 'department':
            if (targetId) {
                const { data: deptUsers } = await supabaseClient
                    .from('user_departments')
                    .select('user_id')
                    .eq('department_id', targetId)
                if (deptUsers) userIds.push(...deptUsers.map((u: any) => u.user_id))
            }
            break

        case 'property':
            if (targetId) {
                const { data: propUsers } = await supabaseClient
                    .from('user_properties')
                    .select('user_id')
                    .eq('property_id', targetId)
                if (propUsers) userIds.push(...propUsers.map((u: any) => u.user_id))
            }
            break
    }

    return [...new Set(userIds)]
}
