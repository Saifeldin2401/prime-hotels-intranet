import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ===================================
    // SECURITY CHECK - Internal Crons Only
    // ===================================
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleJwt = getServiceRoleToken(authHeader);

    if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleJwt ?? serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log("Starting approval escalation workflow...");

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: slaPolicyRows, error: slaPolicyError } =
      await supabaseClient.rpc("get_active_policy", { p_domain: "sla" });

    if (slaPolicyError) {
      console.warn("Failed to load SLA policy:", slaPolicyError.message);
    }

    const policyEscalations = Array.isArray(
      slaPolicyRows?.[0]?.policy_json?.escalation_rules,
    )
      ? slaPolicyRows?.[0]?.policy_json?.escalation_rules
      : [];

    let rulesByType = new Map<
      string,
      { threshold_hours: number; next_role: string }
    >();

    if (policyEscalations.length > 0) {
      for (const r of policyEscalations) {
        if (!r?.action_type || !r?.threshold_hours || !r?.next_role) continue;
        rulesByType.set(r.action_type, {
          threshold_hours: Number(r.threshold_hours),
          next_role: String(r.next_role),
        });
      }
    } else {
      const { data: rules, error: rulesError } = await supabaseClient
        .from("escalation_rules")
        .select("action_type, threshold_hours, next_role, is_active")
        .eq("is_active", true);

      if (rulesError) throw rulesError;

      for (const r of rules || []) {
        rulesByType.set(r.action_type, {
          threshold_hours: r.threshold_hours,
          next_role: r.next_role,
        });
      }
    }

    let totalEscalated = 0;
    let emailsSent = 0;

    const getCutoffIso = (hours: number) => {
      const cutoff = new Date(now);
      cutoff.setHours(cutoff.getHours() - hours);
      return cutoff.toISOString();
    };

    const ensureNotSentToday = async (entityType: string, entityId: string) => {
      const { data: existing, error } = await supabaseClient
        .from("scheduled_reminders")
        .select("id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("reminder_type", "escalation")
        .gte("sent_at", `${today}T00:00:00Z`)
        .maybeSingle();

      if (error) throw error;
      return !existing;
    };

    const markSent = async (
      entityType: string,
      entityId: string,
      userId: string,
    ) => {
      const { error } = await supabaseClient
        .from("scheduled_reminders")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          reminder_type: "escalation",
          scheduled_for: now.toISOString(),
          sent_at: now.toISOString(),
          status: "sent",
        });

      if (error) throw error;
    };

    const notifyUsers = async (
      userIds: string[],
      type: string,
      title: string,
      message: string,
      meta: Record<string, unknown>,
    ) => {
      if (userIds.length === 0) return;
      const payload = userIds.map((uid) => ({
        user_id: uid,
        type,
        title,
        message,
        metadata: meta,
      }));

      const { error } = await supabaseClient
        .from("notifications")
        .insert(payload);
      if (error) throw error;

      // Trigger Email for these users
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profiles) {
        for (const profile of profiles) {
          if (!profile.email) continue;

          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: profile.email,
                templateKey: "approval_escalated",
                title: `Escalation Required: ${title}`,
                variables: {
                  recipient_name: profile.full_name || "Executive",
                  title: title,
                  message: message,
                  original_approver_name:
                    meta.original_approver_name || "Assigned Approver",
                  time_overdue: meta.days_overdue
                    ? `${meta.days_overdue} days`
                    : "Exceeded SLA",
                  action_url: meta.link || "/approvals",
                },
                businessDomain: "management",
                notificationType: "escalation",
              }),
            });

            if (!res.ok) {
              const body = await res.text().catch(() => "");
              console.error(
                `Failed to send escalation email to ${profile.email}:`,
                res.status,
                body,
              );
              continue;
            }

            emailsSent++;
          } catch (e) {
            console.error(
              `Failed to send escalation email to ${profile.email}:`,
              e,
            );
          }
        }
      }
    };

    // Document approvals escalation (action_type: document_approval)
    const docRule = rulesByType.get("document_approval");
    if (docRule) {
      const cutoffIso = getCutoffIso(docRule.threshold_hours);
      const { data: docApprovals, error: docError } = await supabaseClient
        .from("document_approvals")
        .select(
          `
          id,
          document_id,
          created_at,
          documents:document_id (id, title)
        `,
        )
        .eq("status", "pending")
        .eq("is_active", true)
        .lt("created_at", cutoffIso);

      if (docError) throw docError;

      for (const approval of docApprovals || []) {
        const ok = await ensureNotSentToday("document_approval", approval.id);
        if (!ok) continue;

        const { data: escalatedTo, error: escalatedToError } =
          await supabaseClient
            .from("user_roles")
            .select("user_id")
            .eq("role", docRule.next_role);

        if (escalatedToError) throw escalatedToError;

        const userIds = (escalatedTo || []).map(
          (x: { user_id: string }) => x.user_id,
        );
        await notifyUsers(
          userIds,
          "escalation_alert",
          "Document Approval Overdue",
          `Document "${approval.documents?.title ?? "Document"}" is overdue for approval.`,
          {
            entity_type: "document",
            entity_id: approval.document_id,
            link: "/approvals",
            approval_id: approval.id,
            escalated: true,
            days_overdue: Math.floor(docRule.threshold_hours / 24),
            next_role: docRule.next_role,
          },
        );

        if (userIds.length > 0) {
          await markSent("document_approval", approval.id, userIds[0]);
          totalEscalated += userIds.length;
        }
      }
    }

    // Leave requests escalation (action_type: leave_request)
    const leaveRule = rulesByType.get("leave_request");
    if (leaveRule) {
      const cutoffIso = getCutoffIso(leaveRule.threshold_hours);
      const { data: leaveRequests, error: leaveError } = await supabaseClient
        .from("leave_requests")
        .select(
          `
          id,
          requester_id,
          type,
          created_at,
          profiles:requester_id (id, full_name)
        `,
        )
        .eq("status", "pending")
        .lt("created_at", cutoffIso);

      if (leaveError) throw leaveError;

      for (const request of leaveRequests || []) {
        const ok = await ensureNotSentToday("leave_request", request.id);
        if (!ok) continue;

        const { data: escalatedTo, error: escalatedToError } =
          await supabaseClient
            .from("user_roles")
            .select("user_id")
            .eq("role", leaveRule.next_role);

        if (escalatedToError) throw escalatedToError;

        const userIds = (escalatedTo || []).map(
          (x: { user_id: string }) => x.user_id,
        );
        await notifyUsers(
          userIds,
          "escalation_alert",
          "Leave Request Overdue",
          `Leave request from ${request.profiles?.full_name ?? "an employee"} is overdue for approval.`,
          {
            entity_type: "leave_request",
            entity_id: request.id,
            link: "/approvals",
            escalated: true,
            days_overdue: Math.floor(leaveRule.threshold_hours / 24),
            next_role: leaveRule.next_role,
          },
        );

        if (userIds.length > 0) {
          await markSent("leave_request", request.id, userIds[0]);
          totalEscalated += userIds.length;
        }
      }
    }

    console.log(
      `Escalated ${totalEscalated} approvals. Emails triggered: ${emailsSent}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        approvals_escalated: totalEscalated,
        emails_triggered: emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in approval-escalation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
