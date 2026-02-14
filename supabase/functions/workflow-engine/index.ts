import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ===================================
        // SECURITY CHECK - AUTH REQUIRED
        // ===================================
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // 1. Create Client with User Auth to Validated JWT
        const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Only if Valid, Proceed with Service Role for Workflow Execution
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { execution_id } = await req.json();

        if (!execution_id) {
            return new Response(JSON.stringify({ error: 'Missing execution_id' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`Executing workflow: ${execution_id}`);

        // 1. Load active workflow policy (config-driven governance)
        const { data: policyRows, error: policyError } = await supabase
            .rpc('get_active_policy', { p_domain: 'workflow' });

        if (policyError) {
            console.warn('Failed to load workflow policy:', policyError.message);
        }

        const workflowPolicy = policyRows?.[0]?.policy_json ?? null;

        // 2. Get Execution & Definition
        const { data: execution, error: execError } = await supabase
            .from('workflow_executions')
            .select('*, workflow_definitions(*)')
            .eq('id', execution_id)
            .single();

        if (execError || !execution) throw new Error('Execution not found');

        const definition = execution.workflow_definitions;

        // Update status to running
        await supabase
            .from('workflow_executions')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', execution_id);


        // 2. Check for Steps
        const { data: steps } = await supabase
            .from('workflow_steps')
            .select('*')
            .eq('workflow_id', definition.id)
            .order('step_order', { ascending: true });

        const results = [];
        let success = true;

        if (steps && steps.length > 0) {
            // Execute Steps
            for (const step of steps) {
                try {
                    // Log step start
                    await supabase
                        .from('workflow_executions')
                        .update({ current_step_id: step.id })
                        .eq('id', execution_id);

                    await executeAction(supabase, step.action, step.config, execution.metadata, workflowPolicy);
                    results.push({ step_id: step.id, success: true });
                } catch (err) {
                    console.error(`Step ${step.id} failed:`, err);
                    results.push({ step_id: step.id, success: false, error: err.message });
                    success = false;
                    break; // Stop on failure
                }
            }
        } else {
            // Execute Single Action from Definition
            if (definition.action_config && definition.action_config.action) {
                try {
                    await executeAction(supabase, definition.action_config.action, definition.action_config, execution.metadata, workflowPolicy);
                    results.push({ success: true, type: 'single_action' });
                } catch (err) {
                    results.push({ success: false, error: err.message });
                    success = false;
                }
            } else {
                results.push({ success: true, message: 'No actions defined' });
            }
        }

        // 3. Update Final Status
        const finalStatus = success ? 'completed' : 'failed';
        await supabase
            .from('workflow_executions')
            .update({
                status: finalStatus,
                completed_at: new Date().toISOString(),
                result: { steps: results }
            })
            .eq('id', execution_id);

        return new Response(JSON.stringify({ success, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Workflow Engine error:", error);
        // Try to mark as failed

        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper: Execute Action - Real implementations
async function executeAction(supabase: any, actionType: string, config: any, context: any, policy: any) {
    const actionOverrides = policy?.action_overrides?.[actionType];
    const effectiveConfig = actionOverrides ? { ...config, ...actionOverrides } : config;

    console.log(`Executing action: ${actionType}`, effectiveConfig);

    switch (actionType) {
        case 'send_notification': {
            // Create a notification for the specified user
            const userId = effectiveConfig.user_id || context?.user_id;
            if (!userId) {
                throw new Error('send_notification requires user_id');
            }

            const { error } = await supabase.from('notifications').insert({
                user_id: userId,
                type: effectiveConfig.notification_type || 'announcement_new',
                title: effectiveConfig.title || 'Notification',
                message: effectiveConfig.message || 'You have a new notification',
                metadata: { ...context, workflow_triggered: true }
            });

            if (error) throw error;
            console.log(`✅ Sent notification to user ${userId}`);
            break;
        }

        case 'send_training_reminders': {
            // Query overdue training assignments and send reminders
            const { data: overdueAssignments, error: fetchError } = await supabase
                .from('learning_assignments')
                .select('id, content_id, target_type, target_id, due_date, status')
                .eq('content_type', 'module')
                .eq('is_deleted', false)
                .eq('target_type', 'user') // avoid exploding reminders for group-scoped assignments
                .not('due_date', 'is', null)
                .lt('due_date', new Date().toISOString())
                .not('status', 'in', '(completed,cancelled)');

            if (fetchError) throw fetchError;

            let remindersSent = 0;
            for (const assignment of overdueAssignments || []) {
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: assignment.target_id,
                    type: 'training_deadline',
                    title: 'Training Overdue',
                    message: 'You have an overdue training assignment. Please complete it as soon as possible.',
                    metadata: {
                        content_id: assignment.content_id,
                        assignment_id: assignment.id,
                        workflow_triggered: true
                    }
                });

                if (!notifError) remindersSent++;
            }

            console.log(`✅ Sent ${remindersSent} training reminders`);
            break;
        }

        case 'assign_training': {
            // Create a learning assignment for the specified user
            const userId = effectiveConfig.user_id || context?.user_id;
            const moduleId = effectiveConfig.module_id || effectiveConfig.content_id;

            if (!userId || !moduleId) {
                throw new Error('assign_training requires user_id and module_id');
            }

            const dueDate = effectiveConfig.due_date || effectiveConfig.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const { error } = await supabase
                .from('learning_assignments')
                .upsert({
                    target_type: 'user',
                    target_id: userId,
                    content_id: moduleId,
                    content_type: 'module',
                    status: 'assigned',
                    due_date: dueDate,
                    assigned_by: context?.triggered_by || null,
                    created_at: new Date().toISOString()
                }, { onConflict: 'target_id,content_type,content_id' });

            if (error) throw error;

            // Also send a notification about the assignment
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'training_assigned',
                title: 'New Training Assigned',
                message: effectiveConfig.message || 'You have been assigned a new training module.',
                metadata: { content_id: moduleId, workflow_triggered: true }
            });

            console.log(`✅ Assigned training ${moduleId} to user ${userId}`);
            break;
        }

        case 'escalate_approval': {
            // Escalate an approval request by switching its current approver.
            // NOTE: The legacy approval_chain_entries/approval_chains tables do not exist in this schema.
            const approvalRequestId =
                effectiveConfig.approval_request_id ||
                effectiveConfig.approval_id ||
                context?.approval_request_id ||
                context?.approval_id;

            if (!approvalRequestId) {
                throw new Error('escalate_approval requires approval_request_id');
            }

            const escalatedTo = effectiveConfig.escalate_to;
            if (!escalatedTo) {
                // Fallback: run centralized escalation routine (processes all approvals).
                await supabase.rpc('check_and_escalate_approvals');
                console.log('OK Escalation routine executed for approvals');
                break;
            }

            const { data: approvalReq, error: fetchError } = await supabase
                .from('approval_requests')
                .select('id, current_approver_id')
                .eq('id', approvalRequestId)
                .single();

            if (fetchError || !approvalReq) throw new Error('Approval request not found');

            const { error: updateError } = await supabase
                .from('approval_requests')
                .update({
                    current_approver_id: escalatedTo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', approvalRequestId);

            if (updateError) throw updateError;

            await supabase.from('approval_history').insert({
                approval_request_id: approvalRequestId,
                approver_id: escalatedTo,
                action: 'escalated',
                original_approver_id: approvalReq.current_approver_id
            });

            await supabase.from('notifications').insert({
                user_id: escalatedTo,
                type: 'escalation_alert',
                title: 'Approval Escalated to You',
                message: 'An approval has been escalated and requires your attention.',
                metadata: { approval_request_id: approvalRequestId, workflow_triggered: true }
            });

            console.log(`OK Escalated approval request ${approvalRequestId}`);
            break;
        }

        case 'create_task': {
            // Create a task
            const { error } = await supabase.from('tasks').insert({
                title: effectiveConfig.title || 'Workflow Task',
                description: effectiveConfig.description || '',
                status: 'todo',
                priority: effectiveConfig.priority || 'medium',
                assigned_to_id: effectiveConfig.assigned_to_id || context?.user_id,
                property_id: effectiveConfig.property_id || context?.property_id,
                department_id: effectiveConfig.department_id || context?.department_id,
                due_date: effectiveConfig.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                created_by_id: context?.triggered_by || null
            });

            if (error) throw error;
            console.log(`✅ Created task: ${effectiveConfig.title}`);
            break;
        }

        default:
            console.warn(`⚠️ Unknown action type: ${actionType} - skipping`);
    }

    // Small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
}
