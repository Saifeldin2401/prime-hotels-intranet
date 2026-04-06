import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleToken } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const toIso = (value: Date) => value.toISOString();

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleToken = getServiceRoleToken(authHeader);
    if (!serviceRoleToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleToken,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const windowHours =
      typeof body.window_hours === "number" ? body.window_hours : 24;

    const windowEnd = new Date();
    const windowStart = new Date(
      windowEnd.getTime() - windowHours * 60 * 60 * 1000,
    );

    const { data: closedRequests } = await supabase
      .from("requests")
      .select("submitted_at, closed_at")
      .gte("closed_at", toIso(windowStart))
      .lte("closed_at", toIso(windowEnd));

    let avgCycleHours = 0;
    if (closedRequests && closedRequests.length > 0) {
      const totalMs = closedRequests.reduce((sum, req) => {
        if (!req.submitted_at || !req.closed_at) return sum;
        return (
          sum +
          (new Date(req.closed_at).getTime() -
            new Date(req.submitted_at).getTime())
        );
      }, 0);
      avgCycleHours = totalMs / closedRequests.length / (1000 * 60 * 60);
    }

    const { count: pendingRequests } = await supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending_supervisor_approval", "pending_hr_review"]);

    const { count: openTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["todo", "in_progress", "review"]);

    const cutoffDate = new Date();
    const cutoffDateString = cutoffDate.toISOString().split("T")[0];
    const { count: overdueTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["todo", "in_progress", "review"])
      .lt("due_date", cutoffDateString);

    const { count: pendingApprovals } = await supabase
      .from("document_approvals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("is_active", true);

    const slaBreachRate =
      openTasks && openTasks > 0 ? (overdueTasks ?? 0) / openTasks : 0;

    const metrics = {
      window_hours: windowHours,
      requests_pending: pendingRequests ?? 0,
      requests_avg_cycle_hours: Number(avgCycleHours.toFixed(2)),
      tasks_open: openTasks ?? 0,
      tasks_overdue: overdueTasks ?? 0,
      approvals_pending: pendingApprovals ?? 0,
      sla_breach_rate: Number(slaBreachRate.toFixed(4)),
    };

    const { data: snapshot, error: insertError } = await supabase
      .from("ai_metrics_snapshots")
      .insert({
        window_start: toIso(windowStart),
        window_end: toIso(windowEnd),
        metrics_json: metrics,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    await supabase.from("ai_audit_logs").insert({
      event_type: "metrics_snapshot",
      actor_type: "system",
      entity_type: "ai_metrics_snapshots",
      entity_id: snapshot.id,
      details: metrics,
    });

    return new Response(JSON.stringify({ success: true, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-metrics-collector error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
