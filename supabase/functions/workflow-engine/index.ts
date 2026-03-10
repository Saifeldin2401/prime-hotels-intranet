import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

type AppRole =
  | "corporate_admin"
  | "regional_admin"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "department_head"
  | "manager"
  | "staff";

const PRIVILEGED_ROLES = new Set<AppRole>([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
]);

const isAppRole = (value: unknown): value is AppRole => {
  return typeof value === "string" && (PRIVILEGED_ROLES.has(value as AppRole) || value === "property_manager" || value === "property_hr" || value === "department_head" || value === "manager" || value === "staff");
};

type CompensationPlan =
  | { kind: "delete_notifications"; notification_ids: string[] }
  | { kind: "delete_learning_assignment"; assignment_id: string }
  | {
      kind: "restore_learning_assignment";
      assignment_id: string;
      snapshot: {
        due_date: string | null;
        status?: string | null;
        assigned_by?: string | null;
        is_deleted?: boolean | null;
      };
    }
  | { kind: "soft_delete_task"; task_id: string }
  | {
      kind: "restore_request_assignment";
      request_id: string;
      previous_assignee_id: string | null;
      step_id?: string | null;
      previous_step_assignee_id?: string | null;
    };

type ActionExecutionResult = {
  action: string;
  summary?: Record<string, unknown>;
  compensations: CompensationPlan[];
};

type WorkflowStepResult = {
  step_id?: string;
  action: string;
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
};

type CompensationExecutionResult = {
  action: string;
  compensation_kind: CompensationPlan["kind"];
  success: boolean;
  error?: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  let executionIdForFailure: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { execution_id } = await req.json();
    if (!execution_id) {
      return new Response(JSON.stringify({ error: "Missing execution_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    executionIdForFailure = execution_id;
    console.log(`Executing workflow: ${execution_id}`);

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (roleRows || []).map((row) => row.role).filter(isAppRole);
    const isPrivilegedCaller = roles.some((role) => PRIVILEGED_ROLES.has(role));

    const { data: policyRows, error: policyError } = await supabase.rpc("get_active_policy", {
      p_domain: "workflow",
    });

    if (policyError) {
      console.warn("Failed to load workflow policy:", policyError.message);
    }

    const workflowPolicy = policyRows?.[0]?.policy_json ?? null;

    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .select("*, workflow_definitions(*)")
      .eq("id", execution_id)
      .single();

    if (execError || !execution) throw new Error("Execution not found");
    const definition = execution.workflow_definitions;

    const metadata = (execution.metadata || {}) as Record<string, unknown>;
    const triggeredBy = typeof metadata.triggered_by === "string" ? metadata.triggered_by : null;

    if (!isPrivilegedCaller) {
      if (!triggeredBy || triggeredBy !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: not authorized to execute this workflow" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: callerProps } = await supabase
        .from("user_properties")
        .select("property_id")
        .eq("user_id", user.id);
      const { data: callerDepts } = await supabase
        .from("user_departments")
        .select("department_id")
        .eq("user_id", user.id);

      const propertyIds = new Set((callerProps || []).map((row) => row.property_id));
      const departmentIds = new Set((callerDepts || []).map((row) => row.department_id));
      const metadataPropertyId = typeof metadata.property_id === "string" ? metadata.property_id : null;
      const metadataDepartmentId = typeof metadata.department_id === "string" ? metadata.department_id : null;

      if (metadataPropertyId && !propertyIds.has(metadataPropertyId)) {
        return new Response(JSON.stringify({ error: "Forbidden: property scope mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (metadataDepartmentId && !departmentIds.has(metadataDepartmentId)) {
        return new Response(JSON.stringify({ error: "Forbidden: department scope mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase
      .from("workflow_executions")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", execution_id);

    const { data: steps } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", definition.id)
      .order("step_order", { ascending: true });

    const stepResults: WorkflowStepResult[] = [];
    const executedActions: ActionExecutionResult[] = [];
    let compensationResults: CompensationExecutionResult[] = [];
    let success = true;
    let failureReason: string | null = null;

    if (steps && steps.length > 0) {
      for (const step of steps) {
        try {
          await supabase
            .from("workflow_executions")
            .update({ current_step_id: step.id })
            .eq("id", execution_id);

          const actionResult = await executeAction(
            supabase,
            step.action,
            step.config,
            execution.metadata,
            workflowPolicy,
          );
          executedActions.push(actionResult);
          stepResults.push({
            step_id: step.id,
            action: actionResult.action,
            success: true,
            details: actionResult.summary,
          });
        } catch (error) {
          const message = getErrorMessage(error);
          console.error(`Step ${step.id} failed:`, message);
          stepResults.push({
            step_id: step.id,
            action: step.action,
            success: false,
            error: message,
          });

          success = false;
          failureReason = message;
          compensationResults = await compensateExecutedActions(supabase, executedActions);
          break;
        }
      }
    } else if (definition.action_config?.action) {
      try {
        const actionResult = await executeAction(
          supabase,
          definition.action_config.action,
          definition.action_config,
          execution.metadata,
          workflowPolicy,
        );
        executedActions.push(actionResult);
        stepResults.push({
          action: actionResult.action,
          success: true,
          details: actionResult.summary,
        });
      } catch (error) {
        const message = getErrorMessage(error);
        stepResults.push({
          action: definition.action_config.action,
          success: false,
          error: message,
        });

        success = false;
        failureReason = message;
        compensationResults = await compensateExecutedActions(supabase, executedActions);
      }
    } else {
      stepResults.push({
        action: "noop",
        success: true,
        details: { message: "No actions defined" },
      });
    }

    const finalStatus = success ? "completed" : "failed";
    await supabase
      .from("workflow_executions")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        error: failureReason,
        result: {
          steps: stepResults,
          compensation: compensationResults,
          rolled_back: compensationResults.some((item) => item.success),
          failed: !success,
        },
      })
      .eq("id", execution_id);

    return new Response(
      JSON.stringify({
        success,
        results: stepResults,
        compensation: compensationResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Workflow Engine error:", message);

    if (supabase && executionIdForFailure) {
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error: message,
        })
        .eq("id", executionIdForFailure);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function compensateExecutedActions(
  supabase: ReturnType<typeof createClient>,
  executedActions: ActionExecutionResult[],
): Promise<CompensationExecutionResult[]> {
  const compensationResults: CompensationExecutionResult[] = [];
  const reverseExecutedActions = [...executedActions].reverse();

  for (const executed of reverseExecutedActions) {
    const compensationQueue = [...executed.compensations].reverse();

    for (const compensation of compensationQueue) {
      try {
        await applyCompensation(supabase, compensation);
        compensationResults.push({
          action: executed.action,
          compensation_kind: compensation.kind,
          success: true,
        });
      } catch (error) {
        compensationResults.push({
          action: executed.action,
          compensation_kind: compensation.kind,
          success: false,
          error: getErrorMessage(error),
        });
      }
    }
  }

  return compensationResults;
}

async function applyCompensation(
  supabase: ReturnType<typeof createClient>,
  compensation: CompensationPlan,
) {
  switch (compensation.kind) {
    case "delete_notifications": {
      if (!compensation.notification_ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", compensation.notification_ids);
      if (error) throw error;
      return;
    }

    case "delete_learning_assignment": {
      const { error } = await supabase
        .from("learning_assignments")
        .update({ is_deleted: true })
        .eq("id", compensation.assignment_id);
      if (error) throw error;
      return;
    }

    case "restore_learning_assignment": {
      const { error } = await supabase
        .from("learning_assignments")
        .update({
          due_date: compensation.snapshot.due_date,
          status: compensation.snapshot.status ?? "assigned",
          assigned_by: compensation.snapshot.assigned_by ?? null,
          is_deleted: compensation.snapshot.is_deleted ?? false,
        })
        .eq("id", compensation.assignment_id);
      if (error) throw error;
      return;
    }

    case "soft_delete_task": {
      const { error } = await supabase
        .from("tasks")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", compensation.task_id);
      if (error) throw error;
      return;
    }

    case "restore_request_assignment": {
      const { error: requestError } = await supabase
        .from("requests")
        .update({
          current_assignee_id: compensation.previous_assignee_id,
          last_action_at: new Date().toISOString(),
        })
        .eq("id", compensation.request_id);

      if (requestError) throw requestError;

      if (compensation.step_id) {
        const { error: stepError } = await supabase
          .from("request_steps")
          .update({
            assignee_id: compensation.previous_step_assignee_id ?? compensation.previous_assignee_id,
          })
          .eq("id", compensation.step_id);

        if (stepError) throw stepError;
      }
      return;
    }

    default:
      return;
  }
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  actionType: string,
  config: Record<string, unknown>,
  context: Record<string, unknown> | null,
  policy: Record<string, any> | null,
): Promise<ActionExecutionResult> {
  const actionOverrides = policy?.action_overrides?.[actionType];
  const effectiveConfig = actionOverrides ? { ...config, ...actionOverrides } : config;

  console.log(`Executing action: ${actionType}`, effectiveConfig);

  switch (actionType) {
    case "send_notification": {
      const userId = String(
        effectiveConfig.user_id ?? context?.user_id ?? "",
      );
      if (!userId) throw new Error("send_notification requires user_id");

      const { data: createdNotification, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: String(effectiveConfig.notification_type ?? "announcement_new"),
          title: String(effectiveConfig.title ?? "Notification"),
          message: String(effectiveConfig.message ?? "You have a new notification"),
          metadata: { ...(context || {}), workflow_triggered: true },
        })
        .select("id")
        .single();

      if (error) throw error;

      return {
        action: actionType,
        summary: { user_id: userId },
        compensations: createdNotification?.id
          ? [{ kind: "delete_notifications", notification_ids: [createdNotification.id] }]
          : [],
      };
    }

    case "send_training_reminders": {
      const { data: overdueAssignments, error: fetchError } = await supabase
        .from("learning_assignments")
        .select("id, content_id, target_id, due_date, status")
        .eq("content_type", "module")
        .eq("is_deleted", false)
        .eq("target_type", "user")
        .not("due_date", "is", null)
        .lt("due_date", new Date().toISOString())
        .not("status", "in", "(completed,cancelled)");

      if (fetchError) throw fetchError;

      let remindersSent = 0;
      const notificationIds: string[] = [];

      for (const assignment of overdueAssignments || []) {
        const { data: createdNotification, error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: assignment.target_id,
            type: "training_deadline",
            title: "Training Overdue",
            message:
              "You have an overdue training assignment. Please complete it as soon as possible.",
            metadata: {
              content_id: assignment.content_id,
              assignment_id: assignment.id,
              workflow_triggered: true,
            },
          })
          .select("id")
          .single();

        if (!notifError) {
          remindersSent += 1;
          if (createdNotification?.id) notificationIds.push(createdNotification.id);
        }
      }

      return {
        action: actionType,
        summary: { reminders_sent: remindersSent },
        compensations: notificationIds.length
          ? [{ kind: "delete_notifications", notification_ids: notificationIds }]
          : [],
      };
    }

    case "assign_training": {
      const userId = String(effectiveConfig.user_id ?? context?.user_id ?? "");
      const moduleId = String(effectiveConfig.module_id ?? effectiveConfig.content_id ?? "");

      if (!userId || !moduleId) {
        throw new Error("assign_training requires user_id and module_id");
      }

      const dueDate = String(
        effectiveConfig.due_date ??
          effectiveConfig.deadline ??
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      );

      const { data: existingAssignment } = await supabase
        .from("learning_assignments")
        .select("id,due_date,status,assigned_by,is_deleted")
        .eq("target_type", "user")
        .eq("target_id", userId)
        .eq("content_type", "module")
        .eq("content_id", moduleId)
        .maybeSingle();

      const { error: upsertError } = await supabase
        .from("learning_assignments")
        .upsert(
          {
            target_type: "user",
            target_id: userId,
            content_id: moduleId,
            content_type: "module",
            status: "assigned",
            due_date: dueDate,
            assigned_by: context?.triggered_by ?? null,
            is_deleted: false,
            created_at: new Date().toISOString(),
          },
          { onConflict: "target_id,content_type,content_id" },
        );

      if (upsertError) throw upsertError;

      const { data: currentAssignment, error: assignmentError } = await supabase
        .from("learning_assignments")
        .select("id")
        .eq("target_type", "user")
        .eq("target_id", userId)
        .eq("content_type", "module")
        .eq("content_id", moduleId)
        .maybeSingle();

      if (assignmentError || !currentAssignment) {
        throw new Error(assignmentError?.message || "Unable to resolve assignment row");
      }

      const { data: createdNotification, error: notificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "training_assigned",
          title: "New Training Assigned",
          message:
            String(effectiveConfig.message ?? "You have been assigned a new training module."),
          metadata: { content_id: moduleId, workflow_triggered: true },
        })
        .select("id")
        .single();

      if (notificationError) throw notificationError;

      const compensations: CompensationPlan[] = [];
      if (existingAssignment?.id) {
        compensations.push({
          kind: "restore_learning_assignment",
          assignment_id: existingAssignment.id,
          snapshot: {
            due_date: existingAssignment.due_date,
            status: existingAssignment.status,
            assigned_by: existingAssignment.assigned_by,
            is_deleted: existingAssignment.is_deleted,
          },
        });
      } else {
        compensations.push({
          kind: "delete_learning_assignment",
          assignment_id: currentAssignment.id,
        });
      }

      if (createdNotification?.id) {
        compensations.push({
          kind: "delete_notifications",
          notification_ids: [createdNotification.id],
        });
      }

      return {
        action: actionType,
        summary: {
          user_id: userId,
          module_id: moduleId,
          assignment_id: currentAssignment.id,
          reused_existing_assignment: !!existingAssignment?.id,
        },
        compensations,
      };
    }

    case "escalate_approval": {
      const requestId = String(
        effectiveConfig.request_id ??
          effectiveConfig.approval_request_id ??
          effectiveConfig.approval_id ??
          context?.request_id ??
          context?.approval_request_id ??
          context?.approval_id ??
          "",
      );

      if (!requestId) throw new Error("escalate_approval requires request_id");

      const escalatedTo =
        effectiveConfig.escalate_to ? String(effectiveConfig.escalate_to) : "";
      if (!escalatedTo) {
        await supabase.rpc("check_and_escalate_requests");
        return {
          action: actionType,
          summary: { request_id: requestId, mode: "auto_escalation_routine" },
          compensations: [],
        };
      }

      const { data: request, error: fetchReqError } = await supabase
        .from("requests")
        .select("id, current_assignee_id, request_no, entity_type")
        .eq("id", requestId)
        .single();

      if (fetchReqError || !request) throw new Error("Request not found");

      const { data: currentStep } = await supabase
        .from("request_steps")
        .select("id, assignee_id")
        .eq("request_id", requestId)
        .eq("status", "pending")
        .order("step_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (currentStep?.id) {
        const { error: stepUpdateError } = await supabase
          .from("request_steps")
          .update({
            assignee_id: escalatedTo,
            escalated_at: new Date().toISOString(),
          })
          .eq("id", currentStep.id);

        if (stepUpdateError) throw stepUpdateError;
      }

      const { error: requestUpdateError } = await supabase
        .from("requests")
        .update({
          current_assignee_id: escalatedTo,
          last_action_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (requestUpdateError) throw requestUpdateError;

      await supabase.from("request_events").insert({
        request_id: requestId,
        event_type: "forwarded",
        payload: {
          escalated: true,
          old_assignee_id: request.current_assignee_id,
          new_assignee_id: escalatedTo,
          note: "System automated escalation",
        },
      });

      await supabase.from("audit_logs").insert({
        action: "escalate",
        entity_type: request.entity_type || "request",
        entity_id: requestId,
        new_values: {
          old_assignee_id: request.current_assignee_id,
          new_assignee_id: escalatedTo,
        },
      });

      const notificationIds: string[] = [];
      const { data: targetNotification, error: targetNotificationError } = await supabase
        .from("notifications")
        .insert({
          user_id: escalatedTo,
          type: "escalation_alert",
          title: "Request Escalated to You",
          message: `Request #${request.request_no || "Unknown"} has been escalated and requires your attention.`,
          metadata: { request_id: requestId, workflow_triggered: true },
        })
        .select("id")
        .single();

      if (targetNotificationError) throw targetNotificationError;
      if (targetNotification?.id) notificationIds.push(targetNotification.id);

      if (request.current_assignee_id) {
        const { data: previousNotification, error: previousNotificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: request.current_assignee_id,
            type: "escalation_alert",
            title: "Request Escalated",
            message: `Request #${request.request_no || "Unknown"} has been escalated to another approver.`,
            metadata: { request_id: requestId, workflow_triggered: true },
          })
          .select("id")
          .single();

        if (previousNotificationError) throw previousNotificationError;
        if (previousNotification?.id) notificationIds.push(previousNotification.id);
      }

      const compensations: CompensationPlan[] = [
        {
          kind: "restore_request_assignment",
          request_id: requestId,
          previous_assignee_id: request.current_assignee_id,
          step_id: currentStep?.id ?? null,
          previous_step_assignee_id: currentStep?.assignee_id ?? null,
        },
      ];

      if (notificationIds.length) {
        compensations.push({
          kind: "delete_notifications",
          notification_ids: notificationIds,
        });
      }

      return {
        action: actionType,
        summary: { request_id: requestId, escalated_to: escalatedTo },
        compensations,
      };
    }

    case "create_task": {
      const { data: createdTask, error } = await supabase
        .from("tasks")
        .insert({
          title: String(effectiveConfig.title ?? "Workflow Task"),
          description: String(effectiveConfig.description ?? ""),
          status: "todo",
          priority: String(effectiveConfig.priority ?? "medium"),
          assigned_to_id: effectiveConfig.assigned_to_id ?? context?.user_id ?? null,
          property_id: effectiveConfig.property_id ?? context?.property_id ?? null,
          department_id: effectiveConfig.department_id ?? context?.department_id ?? null,
          due_date:
            effectiveConfig.due_date ??
            new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_by_id: context?.triggered_by ?? null,
        })
        .select("id")
        .single();

      if (error || !createdTask?.id) {
        throw new Error(error?.message || "Failed to create task");
      }

      return {
        action: actionType,
        summary: { task_id: createdTask.id },
        compensations: [{ kind: "soft_delete_task", task_id: createdTask.id }],
      };
    }

    default:
      return {
        action: actionType,
        summary: { skipped: true, reason: "Unknown action type" },
        compensations: [],
      };
  }
}
