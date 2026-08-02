// ============================================================================
// ACTION REGISTRY EDGE FUNCTION
// ============================================================================
// Provides API endpoints for the Universal Action Registry:
// - List all actions
// - Get action details with effective config
// - Enable/disable actions by scope
// - Execute actions
// - Query execution history
//
// Endpoints:
//   POST /list          - List actions with filters
//   POST /get           - Get single action details
//   POST /enable        - Enable action for scope
//   POST /disable       - Disable action for scope
//   POST /execute       - Execute an action
//   POST /history       - Query execution history
//   POST /config        - Get effective config for action
//
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
function getSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

// Requires the caller to be authenticated. The client is built with the
// service-role key (needed for privileged writes further down), so unlike a
// normal anon/authenticated client, nothing here is implicitly RLS-gated --
// every handler MUST call this (or requireAdmin) before touching data.
async function requireAuth(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, errorResponse: jsonResponse({ error: "Unauthorized" }, 401) };
  }
  return { user, errorResponse: null };
}

// Requires the caller to hold an admin role, matching the check already
// used by enableAction/disableAction.
async function requireAdmin(supabase: any) {
  const { user, errorResponse } = await requireAuth(supabase);
  if (errorResponse) return { user: null, errorResponse };

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["regional_admin", "corporate_admin"]);

  if (!roles || roles.length === 0) {
    return { user: null, errorResponse: jsonResponse({ error: "Admin permission required" }, 403) };
  }
  return { user, errorResponse: null };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = getSupabaseClient(authHeader);

    // Parse request body
    const { action, ...params } = await req.json();

    // Route to handler
    switch (action) {
      case "list":
        return await listActions(supabase, params);
      case "get":
        return await getAction(supabase, params);
      case "enable":
        return await enableAction(supabase, params);
      case "disable":
        return await disableAction(supabase, params);
      case "execute":
        return await executeAction(supabase, params);
      case "history":
        return await getExecutionHistory(supabase, params);
      case "config":
        return await getEffectiveConfig(supabase, params);
      case "categories":
        return await getCategories(supabase);
      default:
        return jsonResponse({ error: "Unknown action" }, 400);
    }
  } catch (error) {
    console.error("Action Registry Error:", error);
    return jsonResponse(
      { error: error.message || "Internal server error" },
      500,
    );
  }
});

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

async function listActions(supabase: any, params: any) {
  const { errorResponse } = await requireAuth(supabase);
  if (errorResponse) return errorResponse;

  const { category, is_system, search, limit = 50, offset = 0 } = params;

  let query = supabase
    .from("action_definitions")
    .select("*", { count: "exact" });

  if (category) {
    query = query.eq("action_category", category);
  }
  if (is_system !== undefined) {
    query = query.eq("is_system", is_system);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("action_category", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return jsonResponse({
    actions: data,
    total: count,
    limit,
    offset,
  });
}

async function getAction(supabase: any, params: any) {
  const { errorResponse } = await requireAuth(supabase);
  if (errorResponse) return errorResponse;

  const { action_type, scope_type = "global", scope_id = null } = params;

  // Get action definition
  const { data: action, error: actionError } = await supabase
    .from("action_definitions")
    .select("*")
    .eq("action_type", action_type)
    .single();

  if (actionError) throw actionError;
  if (!action) return jsonResponse({ error: "Action not found" }, 404);

  // Get effective config
  const { data: configData, error: configError } = await supabase.rpc(
    "get_action_config",
    {
      p_action_type: action_type,
      p_scope_type: scope_type,
      p_scope_id: scope_id,
    },
  );

  // Get enablement status
  const { data: enabledData, error: enabledError } = await supabase.rpc(
    "is_action_enabled",
    {
      p_action_type: action_type,
      p_scope_type: scope_type,
      p_scope_id: scope_id,
    },
  );

  // Get all scope enablements for this action
  const { data: enablements, error: enablementsError } = await supabase
    .from("action_enablements")
    .select("*")
    .eq("action_type", action_type)
    .order("created_at", { ascending: false });

  return jsonResponse({
    action,
    effective_config: configData || {},
    is_enabled: enabledData !== false,
    enablements: enablements || [],
  });
}

async function enableAction(supabase: any, params: any) {
  const {
    action_type,
    scope_type = "global",
    scope_id = null,
    config_override = {},
    reason = "",
    expires_at = null,
  } = params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  // Check admin permission
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["regional_admin", "corporate_admin"]);

  if (!roles || roles.length === 0) {
    return jsonResponse({ error: "Admin permission required" }, 403);
  }

  // Upsert enablement
  const { data, error } = await supabase
    .from("action_enablements")
    .upsert(
      {
        action_type,
        scope_type,
        scope_id,
        is_enabled: true,
        enabled_by: user.id,
        enabled_at: new Date().toISOString(),
        config_override,
        reason,
        expires_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "action_type,scope_type,scope_id" },
    )
    .select()
    .single();

  if (error) throw error;

  // Log the change
  await supabase.from("system_events").insert({
    action: "action_enabled",
    entity_type: "action_definition",
    entity_id: action_type,
    user_id: user.id,
    new_values: {
      scope_type,
      scope_id,
      config_override,
      reason,
    },
  });

  return jsonResponse({
    success: true,
    enablement: data,
  });
}

async function disableAction(supabase: any, params: any) {
  const {
    action_type,
    scope_type = "global",
    scope_id = null,
    reason = "",
  } = params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  // Check admin permission
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["regional_admin", "corporate_admin"]);

  if (!roles || roles.length === 0) {
    return jsonResponse({ error: "Admin permission required" }, 403);
  }

  // Upsert disablement
  const { data, error } = await supabase
    .from("action_enablements")
    .upsert(
      {
        action_type,
        scope_type,
        scope_id,
        is_enabled: false,
        disabled_by: user.id,
        disabled_at: new Date().toISOString(),
        reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "action_type,scope_type,scope_id" },
    )
    .select()
    .single();

  if (error) throw error;

  // Log the change
  await supabase.from("system_events").insert({
    action: "action_disabled",
    entity_type: "action_definition",
    entity_id: action_type,
    user_id: user.id,
    new_values: {
      scope_type,
      scope_id,
      reason,
    },
  });

  return jsonResponse({
    success: true,
    enablement: data,
  });
}

async function executeAction(supabase: any, params: any) {
  const {
    action_type,
    config = {},
    target_type = null,
    target_id = null,
    sync = false,
  } = params;

  // Executing an action can send real emails / inject notifications, so it
  // requires the same admin role enable/disable already require -- not just
  // "is logged in".
  const { user, errorResponse } = await requireAdmin(supabase);
  if (errorResponse) return errorResponse;

  // Check if action is enabled
  const { data: isEnabled, error: enabledError } = await supabase.rpc(
    "is_action_enabled",
    {
      p_action_type: action_type,
      p_scope_type: target_type || "global",
      p_scope_id: target_id,
    },
  );

  if (!isEnabled) {
    return jsonResponse(
      { error: `Action ${action_type} is disabled for this scope` },
      403,
    );
  }

  // Get action definition
  const { data: action, error: actionError } = await supabase
    .from("action_definitions")
    .select("*")
    .eq("action_type", action_type)
    .single();

  if (actionError || !action) {
    return jsonResponse({ error: "Action not found" }, 404);
  }

  // Merge configs: default <- stored <- provided
  const { data: effectiveConfig } = await supabase.rpc("get_action_config", {
    p_action_type: action_type,
    p_scope_type: target_type || "global",
    p_scope_id: target_id,
  });

  const mergedConfig = {
    ...(effectiveConfig || {}),
    ...config,
  };

  // Create execution record
  const executionId = await supabase.rpc("log_action_execution", {
    p_action_type: action_type,
    p_triggered_by: "api",
    p_trigger_id: user.id,
    p_target_type: target_type,
    p_target_id: target_id,
    p_config: mergedConfig,
    p_status: "pending",
  });

  // If sync execution requested, route to appropriate handler
  if (sync) {
    try {
      const result = await executeActionHandler(
        supabase,
        action_type,
        mergedConfig,
        executionId,
      );

      // Update execution record
      await supabase
        .from("action_executions")
        .update({
          status: "completed",
          result: result,
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      return jsonResponse({
        success: true,
        execution_id: executionId,
        result,
      });
    } catch (error) {
      // Update execution record with error
      await supabase
        .from("action_executions")
        .update({
          status: "failed",
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionId);

      throw error;
    }
  }

  // Async execution - return immediately
  return jsonResponse({
    success: true,
    execution_id: executionId,
    status: "pending",
    message: "Action queued for execution",
  });
}

async function executeActionHandler(
  supabase: any,
  actionType: string,
  config: any,
  executionId: string,
) {
  // Route to specific action handlers
  switch (actionType) {
    case "send_email":
      return await handleSendEmail(supabase, config, executionId);
    case "send_slack":
      return await handleSendSlack(supabase, config, executionId);
    case "send_in_app":
      return await handleSendInApp(supabase, config, executionId);
    case "create_task":
      return await handleCreateTask(supabase, config, executionId);
    case "request_approval":
      return await handleRequestApproval(supabase, config, executionId);
    default:
      // For actions without specific handlers, log and return
      console.log(`Action ${actionType} executed with config:`, config);
      return { executed: true, action_type: actionType };
  }
}

async function handleSendEmail(
  supabase: any,
  config: any,
  executionId: string,
) {
  const { to, template, subject, body, variables } = config;

  // Validate required fields
  if (!to) throw new Error("Email recipient (to) is required");

  // Get recipient user ID if email provided
  let userId = config.user_id;
  if (!userId && to) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", to)
      .single();
    if (profile) userId = profile.id;
  }

  // Call existing send-email edge function
  const { error } = await supabase.functions.invoke("send-email", {
    body: {
      to,
      userId,
      subject: subject || "Notification",
      title: subject || "Notification",
      message: body || "",
      templateKey: template || "system_generic_alert",
      actionUrl: config.link || "/",
      variables: variables || {},
    },
  });

  if (error) throw error;

  return {
    channel: "email",
    recipient: to,
    template,
  };
}

async function handleSendSlack(
  supabase: any,
  config: any,
  executionId: string,
) {
  // Implementation for Slack integration
  // This would call a slack-webhook edge function or similar
  console.log("Slack send would be implemented here", config);
  return { channel: "slack", status: "not_implemented" };
}

async function handleSendInApp(
  supabase: any,
  config: any,
  executionId: string,
) {
  const { user_id, title, message, link, type = "system" } = config;

  if (!user_id) throw new Error("user_id is required for in-app notification");

  const { data, error } = await supabase.from("notifications").insert({
    user_id,
    type,
    title,
    message,
    link,
    metadata: {
      execution_id: executionId,
      triggered_by: "action_registry",
    },
  });

  if (error) throw error;

  return { channel: "in_app", notification_id: data?.[0]?.id };
}

async function handleCreateTask(
  supabase: any,
  config: any,
  executionId: string,
) {
  const {
    title,
    description,
    assignee_id,
    property_id,
    department_id,
    priority = "medium",
    due_date,
  } = config;

  if (!title) throw new Error("Task title is required");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      assigned_to_id: assignee_id,
      property_id,
      department_id,
      priority,
      due_date,
      status: "todo",
      created_by_id: executionId,
    })
    .select()
    .single();

  if (error) throw error;

  return { task_id: data.id, status: "created" };
}

async function handleRequestApproval(
  supabase: any,
  config: any,
  executionId: string,
) {
  const {
    entity_type,
    entity_id,
    approver_id,
    title,
    description,
    priority = "normal",
  } = config;

  if (!entity_type || !entity_id || !approver_id) {
    throw new Error("entity_type, entity_id, and approver_id are required");
  }

  // Create approval request using existing system
  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      entity_type,
      entity_id,
      current_approver_id: approver_id,
      status: "pending",
      metadata: {
        title,
        description,
        priority,
        execution_id,
      },
    })
    .select()
    .single();

  if (error) throw error;

  // Send notification to approver
  await supabase.functions.invoke("send-email", {
    body: {
      to: approver_id, // Would need to resolve to email
      subject: `Approval Required: ${title}`,
      templateKey: "approval_request_new",
      variables: {
        entity_type,
        title,
        description,
        priority,
      },
    },
  });

  return { request_id: data.id, status: "pending" };
}

async function getExecutionHistory(supabase: any, params: any) {
  // Execution history can include config/result payloads with PII, target
  // user IDs, and email bodies -- admin-only, same as enable/disable/execute.
  const { errorResponse } = await requireAdmin(supabase);
  if (errorResponse) return errorResponse;

  const {
    action_type,
    status,
    target_type,
    target_id,
    limit = 50,
    offset = 0,
    since,
    until,
  } = params;

  let query = supabase
    .from("action_executions")
    .select("*", { count: "exact" });

  if (action_type) query = query.eq("action_type", action_type);
  if (status) query = query.eq("status", status);
  if (target_type) query = query.eq("target_type", target_type);
  if (target_id) query = query.eq("target_id", target_id);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return jsonResponse({
    executions: data,
    total: count,
    limit,
    offset,
  });
}

async function getEffectiveConfig(supabase: any, params: any) {
  const { errorResponse } = await requireAuth(supabase);
  if (errorResponse) return errorResponse;

  const { action_type, scope_type = "global", scope_id = null } = params;

  const { data, error } = await supabase.rpc("get_action_config", {
    p_action_type: action_type,
    p_scope_type: scope_type,
    p_scope_id: scope_id,
  });

  if (error) throw error;

  return jsonResponse({
    action_type,
    scope_type,
    scope_id,
    effective_config: data,
  });
}

async function getCategories(supabase: any) {
  const { errorResponse } = await requireAuth(supabase);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("action_definitions")
    .select("action_category, color, icon")
    .order("action_category");

  if (error) throw error;

  // Get unique categories with counts
  const categories = data.reduce((acc: any, item: any) => {
    if (!acc[item.action_category]) {
      acc[item.action_category] = {
        category: item.action_category,
        color: item.color,
        icon: item.icon,
        count: 0,
      };
    }
    acc[item.action_category].count++;
    return acc;
  }, {});

  return jsonResponse({
    categories: Object.values(categories),
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
