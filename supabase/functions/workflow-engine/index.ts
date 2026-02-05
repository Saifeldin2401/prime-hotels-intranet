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

        // 1. Get Execution & Definition
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

                    await executeAction(supabase, step.action, step.config, execution.metadata);
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
                    await executeAction(supabase, definition.action_config.action, definition.action_config, execution.metadata);
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

// Helper: Execute Action
async function executeAction(supabase: any, actionType: string, config: any, context: any) {
    console.log(`Executing action: ${actionType}`, config);

    // Stub implementation for stability
    switch (actionType) {
        case 'send_training_reminders':
        case 'send_notification':
            // In a real engine, this would query users and send notifications
            // For now, we log it to avoid crashing
            break;
        case 'assign_training':
            // Logic would go here
            break;
        default:
            console.warn(`Unknown action type: ${actionType}`);
    }

    // Simulate slight delay
    await new Promise(resolve => setTimeout(resolve, 100));
}
