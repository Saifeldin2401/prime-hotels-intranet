import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { globalRateLimiter, generateRequestId, isValidUuid } from "../_shared/utils.ts";

// ===================================
// TypeScript Interfaces (replacing any)
// ===================================

interface TriggerContext {
  event_type: string;
  payload: {
    user_id?: string;
    department_id?: string;
    source_id?: string;
    source_type?: string;
    affected_users?: string[];
    property_id?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: unknown;
}

interface Rule {
  id: string;
  name: string;
  event_type: string;
  conditions: RuleCondition[];
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
}

interface RuleExecutionResult {
  rule_id: string;
  success: boolean;
  reason?: string;
  error?: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  metadata?: Record<string, unknown>;
}

type AppRole =
  | "corporate_admin"
  | "regional_admin"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "department_head"
  | "manager"
  | "staff";

// ===================================
// Zod Schemas for Validation
// ===================================

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'gt', 'lt', 'gte', 'lte']),
  value: z.unknown(),
});

const payloadSchema = z.object({
  user_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  source_id: z.string().optional(),
  source_type: z.string().optional(),
  affected_users: z.array(z.string().uuid()).optional(),
  property_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
}).catchall(z.unknown());

const processEventSchema = z.object({
  event_type: z.string().min(1, "event_type is required"),
  payload: payloadSchema.default({}),
});

type ProcessEventRequest = z.infer<typeof processEventSchema>;

// ===================================
// Constants
// ===================================

const ALLOWED_CALLER_ROLES = new Set<AppRole>([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
  "department_head",
]);

const HIGH_PRIVILEGE_ROLES = new Set<AppRole>([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
]);

// ===================================
// Type Guards
// ===================================

const isAppRole = (value: unknown): value is AppRole => {
  return typeof value === "string" && ALLOWED_CALLER_ROLES.has(value as AppRole);
};

const isUuid = (value: string): boolean => {
  return isValidUuid(value);
};

// ===================================
// Helper Functions
// ===================================

const normalizeUserIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && isUuid(id)),
    ),
  );
};

const filterAffectedUsersByScope = async (
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  propertyIds: string[],
  departmentIds: string[],
): Promise<string[]> => {
  if (userIds.length === 0) return [];
  const allowed = new Set<string>();

  if (propertyIds.length > 0) {
    const { data: propRows } = await supabase
      .from("user_properties")
      .select("user_id")
      .in("property_id", propertyIds)
      .in("user_id", userIds);
    propRows?.forEach((row) => allowed.add(row.user_id));
  }

  if (departmentIds.length > 0) {
    const { data: deptRows } = await supabase
      .from("user_departments")
      .select("user_id")
      .in("department_id", departmentIds)
      .in("user_id", userIds);
    deptRows?.forEach((row) => allowed.add(row.user_id));
  }

  return userIds.filter((id) => allowed.has(id));
};

// ===================================
// Condition Matching with Type Safety
// ===================================

function getContextValue(field: string, context: Record<string, unknown>): unknown {
  if (field in context) return context[field];
  const metadata = context.metadata as Record<string, unknown> | undefined;
  return metadata?.[field] ?? context[field];
}

function matchesConditions(
  conditions: RuleCondition[],
  context: Record<string, unknown>,
): boolean {
  if (!conditions || conditions.length === 0) return true;

  for (const condition of conditions) {
    const value = getContextValue(condition.field, context);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        if (value !== targetValue) return false;
        break;
      case 'not_equals':
        if (value === targetValue) return false;
        break;
      case 'contains':
        if (!String(value).includes(String(targetValue))) return false;
        break;
      case 'in':
        if (Array.isArray(targetValue) && !targetValue.includes(value)) return false;
        break;
      case 'gt':
        if (!(typeof value === 'number' && typeof targetValue === 'number' && value > targetValue)) return false;
        break;
      case 'lt':
        if (!(typeof value === 'number' && typeof targetValue === 'number' && value < targetValue)) return false;
        break;
      case 'gte':
        if (!(typeof value === 'number' && typeof targetValue === 'number' && value >= targetValue)) return false;
        break;
      case 'lte':
        if (!(typeof value === 'number' && typeof targetValue === 'number' && value <= targetValue)) return false;
        break;
    }
  }
  return true;
}

// ===================================
// Action Execution with Type Safety
// ===================================

interface ActionContext {
  event_type: string;
  affected_users: string[];
  user_id?: string;
  department_id?: string;
  source_id?: string;
  source_type?: string;
  property_id?: string;
  triggered_by?: string;
  metadata?: Record<string, unknown>;
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  type: string,
  config: Record<string, unknown>,
  context: ActionContext,
  authHeader: string,
): Promise<void> {
  const affectedUsers = context.affected_users || (context.user_id ? [context.user_id] : []);

  if (affectedUsers.length === 0) {
    console.warn("No affected users for action");
    return;
  }

  if (type === 'assign_training') {
    const targetId = String(config.target_id ?? '');
    const dueDays = typeof config.due_days === 'number' ? config.due_days : null;
    
    const assignments = affectedUsers.map((uid) => ({
      content_type: 'module' as const,
      content_id: targetId,
      target_type: 'user' as const,
      target_id: uid,
      status: 'assigned' as const,
      due_date: dueDays ? new Date(Date.now() + dueDays * 86400000).toISOString() : null,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('learning_assignments').upsert(assignments);
    if (error) throw error;
  }

  else if (type === 'assign_quiz') {
    const targetId = String(config.target_id ?? '');
    const dueDays = typeof config.due_days === 'number' ? config.due_days : null;
    
    const assignments = affectedUsers.map((uid) => ({
      content_type: 'quiz' as const,
      content_id: targetId,
      target_type: 'user' as const,
      target_id: uid,
      status: 'assigned' as const,
      due_date: dueDays ? new Date(Date.now() + dueDays * 86400000).toISOString() : null,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('learning_assignments').upsert(assignments);
    if (error) throw error;
  }

  else if (type === 'assign_required_reading') {
    const targetId = String(config.target_id ?? '');
    const dueDays = typeof config.due_days === 'number' ? config.due_days : null;
    
    const assignments = affectedUsers.map((uid) => ({
      document_id: targetId,
      user_id: uid,
      due_date: dueDays ? new Date(Date.now() + dueDays * 86400000).toISOString() : null,
      assigned_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('knowledge_required_reading')
      .upsert(assignments, { onConflict: 'document_id,user_id' });
    if (error) throw error;
  }

  else if (type === 'send_notification') {
    const title = String(config.title ?? `Event: ${context.event_type}`);
    const message = String(config.message ?? 'A trigger event occurred');
    
    const notifications = affectedUsers.map((uid) => ({
      user_id: uid,
      type: 'trigger_notification' as const,
      title,
      message,
      link: context.source_id ? `/${context.source_type}/${context.source_id}` : null,
    }));
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;
  }

  else if (type === 'create_task') {
    const title = String(config.title ?? `Action required: ${context.event_type}`);
    const priority = (config.priority as string) || 'medium';
    const dueDays = typeof config.due_days === 'number' ? config.due_days : 1;
    const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString();
    const assignedRole = config.assigned_role as string | undefined;

    let assigneeId: string | null = affectedUsers[0] ?? null;
    if (assignedRole) {
      const propertyId = context.property_id;
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', assignedRole);
      
      if (roleRows && roleRows.length > 0) {
        if (propertyId) {
          const { data: propUser } = await supabase
            .from('user_properties')
            .select('user_id')
            .eq('property_id', propertyId)
            .in('user_id', roleRows.map((r) => r.user_id))
            .limit(1)
            .maybeSingle();
          if (propUser?.user_id) assigneeId = propUser.user_id;
        } else {
          assigneeId = roleRows[0].user_id;
        }
      }
    }

    const { error } = await supabase.from('tasks').insert({
      title,
      description: (config.description as string) || null,
      status: 'todo',
      priority,
      assigned_to_id: assigneeId,
      assigned_to: assigneeId,
      property_id: context.property_id ?? null,
      department_id: context.department_id ?? null,
      due_date: dueDate,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  else if (type === 'start_workflow') {
    const workflowId = String(config.workflow_id ?? '');
    if (!workflowId) throw new Error('start_workflow requires workflow_id');

    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        metadata: {
          triggered_by: context.triggered_by || 'process-event',
          event_type: context.event_type,
          source_id: context.source_id,
          source_type: context.source_type,
          affected_users: affectedUsers,
          ...context,
        },
      })
      .select()
      .single() as { data: WorkflowExecution | null; error: Error | null };

    if (execError || !execution) {
      throw new Error(execError?.message || 'Failed to create workflow execution');
    }

    const { error } = await supabase.functions.invoke('workflow-engine', {
      body: { execution_id: execution.id },
      headers: { Authorization: authHeader },
    });

    if (error) {
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);
      throw error;
    }
  }
}

// ===================================
// Auto-training with Type Safety
// ===================================

interface TrainingRule {
  id: string;
  target_role?: string;
  target_department_id?: string;
  job_title_id?: string;
  training_module_id?: string;
  created_by?: string;
  is_active: boolean;
}

async function applyAutoTrainingIfEnabled(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: { affected_users?: string[]; user_id?: string },
): Promise<void> {
  if (!['NEW_HIRE', 'ROLE_CHANGE'].includes(eventType)) return;

  const { data: configRow } = await supabase
    .from('system_automations_config')
    .select('is_enabled, config')
    .eq('id', 'auto_training')
    .single();

  if (!configRow?.is_enabled) return;

  const affectedUsers = payload.affected_users || (payload.user_id ? [payload.user_id] : []);
  if (affectedUsers.length === 0) return;

  const { data: rules, error: rulesError } = await supabase
    .from('training_assignment_rules')
    .select('*')
    .eq('is_active', true) as { data: TrainingRule[] | null; error: Error | null };

  if (rulesError || !rules || rules.length === 0) return;

  const configRecord = configRow.config as Record<string, unknown> | undefined;
  const defaultDueDays = typeof configRecord?.default_due_days === 'number' ? configRecord.default_due_days : 30;
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

    const roleSet = new Set((roles || []).map((r) => r.role));
    const deptSet = new Set((departments || []).map((d) => d.department_id));

    const matchingRules = rules.filter((rule) => {
      if (rule.target_role && !roleSet.has(rule.target_role)) return false;
      if (rule.target_department_id && !deptSet.has(rule.target_department_id)) return false;
      if (rule.job_title_id && profile?.job_title_id !== rule.job_title_id) return false;
      return !!rule.training_module_id;
    });

    if (matchingRules.length === 0) continue;

    const assignments = matchingRules.map((rule) => ({
      target_type: 'user' as const,
      target_id: userId,
      content_type: 'module' as const,
      content_id: rule.training_module_id!,
      status: 'assigned' as const,
      due_date: dueDate,
      assigned_by: rule.created_by || null,
      created_at: new Date().toISOString(),
    }));

    await supabase
      .from('learning_assignments')
      .upsert(assignments, { onConflict: 'target_id,content_type,content_id' });
  }
}

// ===================================
// Main Handler
// ===================================

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const corsHeaders = buildCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===================================
    // Rate Limiting Check
    // ===================================
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    const rateLimitKey = `process-event:${clientIp}`;
    const rateLimitResult = globalRateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.resetAt / 1000)),
        },
      });
    }

    // ===================================
    // SECURITY CHECK - AUTH REQUIRED
    // ===================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ===================================
    // Zod Schema Validation for Request Body
    // ===================================
    let body: ProcessEventRequest;
    try {
      const rawBody = await req.json();
      const parseResult = processEventSchema.safeParse(rawBody);
      
      if (!parseResult.success) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request body',
          details: parseResult.error.errors,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = parseResult.data;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_type, payload } = body;

    // ===================================
    // Role Authorization
    // ===================================
    const { data: callerRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      return new Response(JSON.stringify({ error: "Failed to verify caller permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = (callerRoles || []).map((row) => row.role).filter(isAppRole);
    const hasPermission = roles.some((role) => ALLOWED_CALLER_ROLES.has(role));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient privileges" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isHighPrivilege = roles.some((role) => HIGH_PRIVILEGE_ROLES.has(role));

    const { data: callerProperties } = await supabase
      .from("user_properties")
      .select("property_id")
      .eq("user_id", user.id);
    const { data: callerDepartments } = await supabase
      .from("user_departments")
      .select("department_id")
      .eq("user_id", user.id);

    const propertyIds = (callerProperties || []).map((row) => row.property_id);
    const departmentIds = (callerDepartments || []).map((row) => row.department_id);

    const rawAffectedUsers = normalizeUserIds(payload.affected_users);
    const payloadUserId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
    const requestedUsers = rawAffectedUsers.length > 0
      ? rawAffectedUsers
      : (payloadUserId && isUuid(payloadUserId) ? [payloadUserId] : []);

    let scopedAffectedUsers = requestedUsers;
    if (!isHighPrivilege && requestedUsers.length > 0) {
      scopedAffectedUsers = await filterAffectedUsersByScope(
        supabase,
        requestedUsers,
        propertyIds,
        departmentIds,
      );

      if (scopedAffectedUsers.length !== requestedUsers.length) {
        return new Response(JSON.stringify({ error: "Forbidden: affected users outside your scope" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[${requestId}] Processing event: ${event_type}`, payload);

    // ===================================
    // Fetch and Execute Rules
    // ===================================
    const { data: rules, error: fetchRulesError } = await supabase
      .from('trigger_rules')
      .select('*')
      .eq('event_type', event_type)
      .eq('is_active', true) as { data: Rule[] | null; error: Error | null };

    if (fetchRulesError) throw fetchRulesError;

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No rules found', results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      });
    }

    const results: RuleExecutionResult[] = [];

    const safePayload: Record<string, unknown> = {
      ...payload,
      affected_users: scopedAffectedUsers,
      triggered_by: user.id,
    };

    for (const rule of rules) {
      try {
        // Validate and cast conditions
        const conditions: RuleCondition[] = Array.isArray(rule.conditions) 
          ? rule.conditions.map((c: unknown) => ({
              field: String((c as Record<string, unknown>).field ?? ''),
              operator: String((c as Record<string, unknown>).operator ?? 'equals') as RuleCondition['operator'],
              value: (c as Record<string, unknown>).value,
            }))
          : [];
        
        const actionConfig = (rule.action_config || {}) as Record<string, unknown>;

        if (matchesConditions(conditions, safePayload)) {
          console.log(`[${requestId}] Rule matched: ${rule.name}`);
          
          const actionContext: ActionContext = {
            event_type,
            affected_users: scopedAffectedUsers,
            user_id: payload.user_id,
            department_id: payload.department_id,
            source_id: payload.source_id,
            source_type: payload.source_type,
            property_id: payload.property_id,
            triggered_by: user.id,
            metadata: payload.metadata,
          };
          
          await executeAction(supabase, rule.action_type, actionConfig, actionContext, authHeader);
          results.push({ rule_id: rule.id, success: true });
        } else {
          results.push({ rule_id: rule.id, success: false, reason: 'condition_mismatch' });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[${requestId}] Error executing rule ${rule.id}:`, err);
        results.push({ rule_id: rule.id, success: false, error: errorMessage });
      }
    }

    // ===================================
    // Auto-training
    // ===================================
    try {
      await applyAutoTrainingIfEnabled(supabase, event_type, safePayload);
    } catch (err) {
      console.warn(`[${requestId}] Auto-training application failed:`, err);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Trigger error:`, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
    });
  }
});
