import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
                    await executeAction(supabase, rule.action_type, rule.action_config, payload);
                    results.push({ rule_id: rule.id, success: true });
                } else {
                    results.push({ rule_id: rule.id, success: false, reason: 'condition_mismatch' });
                }
            } catch (err) {
                console.error(`Error executing rule ${rule.id}:`, err);
                results.push({ rule_id: rule.id, success: false, error: err.message });
            }
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
async function executeAction(supabase: any, type: string, config: any, context: any) {
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

    else if (type === 'send_notification') {
        const notifications = affectedUsers.map((uid: string) => ({
            user_id: uid,
            type: 'trigger_notification',
            title: config.title || `Event: ${context.event_type}`,
            message: config.message || 'A trigger event occurred',
            link: context.source_id ? `/${context.source_type}/${context.source_id}` : null,
            is_read: false
        }));
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
    }
}
