import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

interface TriggerContext {
    event_type: string;
    payload: {
        user_id?: string;
        department_id?: string;
        source_id?: string;
        source_type?: string;
        affected_users?: string[];
        [key: string]: any;
    };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
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

        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { event_type, payload }: TriggerContext = await req.json();

        if (!event_type) {
            return new Response(JSON.stringify({ error: 'Missing event_type' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        console.log(`Processing event: ${event_type}`, payload);

        // 1. Fetch active rules for this event
        const { data: rules, error: rulesError } = await supabase
            .from('trigger_rules')
            .select('*')
            .eq('event_type', event_type)
            .eq('is_active', true);

        if (rulesError) throw rulesError;

        if (!rules || rules.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No rules found', results: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const results = [];

        // 2. Evaluate and Execute Rules
        for (const rule of rules) {
            try {
                if (matchesConditions(rule.conditions, payload)) {
                    console.log(`Rule matched: ${rule.name}`);
                    await executeAction(supabase, rule.action_type, rule.action_config, { ...payload, event_type }, authHeader);
                    results.push({ rule_id: rule.id, success: true });
                } else {
                    results.push({ rule_id: rule.id, success: false, reason: 'condition_mismatch' });
                }
            } catch (err) {
                console.error(`Error executing rule ${rule.id}:`, err);
                results.push({ rule_id: rule.id, success: false, error: err.message });
            }
        }

        // 3. Optional: apply auto-training rules for new hires or role changes
        try {
            await applyAutoTrainingIfEnabled(supabase, event_type, payload);
        } catch (err) {
            console.warn('Auto-training application failed:', err);
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Trigger error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper: Check conditions
function matchesConditions(conditions: any[], context: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
        const value = getContextValue(condition.field, context);
        const targetValue = condition.value;

        switch (condition.operator) {
            case 'equals':
                if (value != targetValue) return false;
                break;
            case 'not_equals':
                if (value == targetValue) return false;
                break;
            case 'contains':
                if (!String(value).includes(String(targetValue))) return false;
                break;
            case 'in':
                if (Array.isArray(targetValue) && !targetValue.includes(value)) return false;
                break;
            // Add other operators as needed
        }
    }
    return true;
}

function getContextValue(field: string, context: any) {
    if (field in context) return context[field];
    return context.metadata?.[field] || context[field]; // Fallback
}

// Helper: Execute Action
async function executeAction(supabase: any, type: string, config: any, context: any, authHeader: string) {
    const affectedUsers = context.affected_users || (context.user_id ? [context.user_id] : []);

    if (affectedUsers.length === 0) {
        console.warn("No affected users for action");
        return;
    }

    if (type === 'assign_training') {
        const assignments = affectedUsers.map((uid: string) => ({
            content_type: 'module',
            content_id: config.target_id,
            target_type: 'user',
            target_id: uid,
            status: 'assigned',
            due_date: config.due_days ? new Date(Date.now() + config.due_days * 86400000).toISOString() : null,
            created_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('learning_assignments').upsert(assignments);
        if (error) throw error;
    }

    else if (type === 'assign_quiz') {
        const assignments = affectedUsers.map((uid: string) => ({
            content_type: 'quiz',
            content_id: config.target_id,
            target_type: 'user',
            target_id: uid,
            status: 'assigned',
            due_date: config.due_days ? new Date(Date.now() + config.due_days * 86400000).toISOString() : null,
            created_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('learning_assignments').upsert(assignments);
        if (error) throw error;
    }

    else if (type === 'assign_required_reading') {
        const assignments = affectedUsers.map((uid: string) => ({
            document_id: config.target_id,
            user_id: uid,
            due_date: config.due_days ? new Date(Date.now() + config.due_days * 86400000).toISOString() : null,
            assigned_at: new Date().toISOString()
        }));
        const { error } = await supabase
            .from('knowledge_required_reading')
            .upsert(assignments, { onConflict: 'document_id,user_id' });
        if (error) throw error;
    }

    else if (type === 'send_notification') {
        const notifications = affectedUsers.map((uid: string) => ({
            user_id: uid,
            type: 'trigger_notification',
            title: config.title || `Event: ${context.event_type}`,
            message: config.message || 'A trigger event occurred',
            link: context.source_id ? `/${context.source_type}/${context.source_id}` : null
        }));
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
    }

    else if (type === 'start_workflow') {
        const workflowId = config.workflow_id;
        if (!workflowId) throw new Error('start_workflow requires workflow_id');

        const { data: execution, error: execError } = await supabase
            .from('workflow_executions')
            .insert({
                workflow_id: workflowId,
                status: 'pending',
                metadata: {
                    triggered_by: 'process-event',
                    event_type: context.event_type,
                    source_id: context.source_id,
                    source_type: context.source_type,
                    affected_users: affectedUsers,
                    ...context
                }
            })
            .select()
            .single();

        if (execError || !execution) {
            throw new Error(execError?.message || 'Failed to create workflow execution');
        }

        const { error } = await supabase.functions.invoke('workflow-engine', {
            body: { execution_id: execution.id },
            headers: { Authorization: authHeader }
        });

        if (error) {
            await supabase
                .from('workflow_executions')
                .update({
                    status: 'failed',
                    error: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', execution.id);
            throw error;
        }
    }
}

async function applyAutoTrainingIfEnabled(supabase: any, eventType: string, payload: any) {
    if (!['NEW_HIRE', 'ROLE_CHANGE'].includes(eventType)) return;

    const { data: configRow } = await supabase
        .from('system_automations_config')
        .select('is_enabled, config')
        .eq('id', 'auto_training')
        .single();

    if (!configRow?.is_enabled) return;

    const affectedUsers: string[] = payload.affected_users || (payload.user_id ? [payload.user_id] : []);
    if (affectedUsers.length === 0) return;

    const { data: rules, error: rulesError } = await supabase
        .from('training_assignment_rules')
        .select('*')
        .eq('is_active', true);

    if (rulesError || !rules || rules.length === 0) return;

    const defaultDueDays = configRow?.config?.default_due_days || 30;
    const dueDate = new Date(Date.now() + defaultDueDays * 86400000).toISOString();

    for (const userId of affectedUsers) {
        const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

        const { data: departments } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', userId);

        const { data: profile } = await supabase
            .from('profiles')
            .select('job_title_id')
            .eq('id', userId)
            .single();

        const roleSet = new Set((roles || []).map((r: any) => r.role));
        const deptSet = new Set((departments || []).map((d: any) => d.department_id));

        const matchingRules = rules.filter((rule: any) => {
            if (rule.target_role && !roleSet.has(rule.target_role)) return false;
            if (rule.target_department_id && !deptSet.has(rule.target_department_id)) return false;
            if (rule.job_title_id && profile?.job_title_id !== rule.job_title_id) return false;
            return !!rule.training_module_id;
        });

        if (matchingRules.length === 0) continue;

        const assignments = matchingRules.map((rule: any) => ({
            target_type: 'user',
            target_id: userId,
            content_type: 'module',
            content_id: rule.training_module_id,
            status: 'assigned',
            due_date: dueDate,
            assigned_by: rule.created_by || null,
            created_at: new Date().toISOString()
        }));

        await supabase
            .from('learning_assignments')
            .upsert(assignments, { onConflict: 'target_id,content_type,content_id' });
    }
}



