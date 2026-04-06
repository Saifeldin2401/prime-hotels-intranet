import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleToken } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const safeNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

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

    const { data: optimizationPolicyRows } = await supabase.rpc(
      "get_active_policy",
      {
        p_domain: "optimization",
      },
    );
    const optimizationPolicy = optimizationPolicyRows?.[0]?.policy_json ?? {};
    const rollbackConditions = optimizationPolicy.rollback_conditions ?? {};

    const slaBreachThreshold = safeNumber(
      rollbackConditions.sla_breach_rate_gt,
      0.05,
    );
    const cycleIncreaseThreshold = safeNumber(
      rollbackConditions.cycle_time_increase_gt,
      0.1,
    );

    const { data: pendingChanges } = await supabase
      .from("ai_policy_changes")
      .select("*")
      .is("rolled_back_at", null)
      .order("applied_at", { ascending: false })
      .limit(10);

    if (!pendingChanges || pendingChanges.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No changes to evaluate" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results = [];

    for (const change of pendingChanges) {
      if (
        !change.applied_at ||
        !change.from_version_id ||
        !change.to_version_id
      ) {
        continue;
      }

      const { data: existingEvaluation } = await supabase
        .from("ai_change_evaluations")
        .select("id")
        .eq("policy_change_id", change.id)
        .maybeSingle();

      if (existingEvaluation) {
        continue;
      }

      const { data: baselineSnapshot } = await supabase
        .from("ai_metrics_snapshots")
        .select("*")
        .lte("window_end", change.applied_at)
        .order("window_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: postSnapshot } = await supabase
        .from("ai_metrics_snapshots")
        .select("*")
        .gte("window_start", change.applied_at)
        .order("window_start", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!baselineSnapshot || !postSnapshot) {
        continue;
      }

      const baselineMetrics = baselineSnapshot.metrics_json ?? {};
      const postMetrics = postSnapshot.metrics_json ?? {};

      const baselineSla = safeNumber(baselineMetrics.sla_breach_rate, 0);
      const postSla = safeNumber(postMetrics.sla_breach_rate, 0);
      const baselineCycle = safeNumber(
        baselineMetrics.requests_avg_cycle_hours,
        0,
      );
      const postCycle = safeNumber(postMetrics.requests_avg_cycle_hours, 0);

      const slaDegraded = postSla > slaBreachThreshold && postSla > baselineSla;
      const cycleDegraded =
        baselineCycle > 0
          ? (postCycle - baselineCycle) / baselineCycle > cycleIncreaseThreshold
          : false;

      let result = "neutral";
      let rolledBack = false;

      if (slaDegraded || cycleDegraded) {
        result = "degraded";

        const { data: policySet } = await supabase
          .from("ai_policy_sets")
          .select("id, active_version_id")
          .eq("id", change.policy_set_id)
          .single();

        if (policySet && policySet.active_version_id === change.to_version_id) {
          await supabase
            .from("ai_policy_sets")
            .update({ active_version_id: change.from_version_id })
            .eq("id", change.policy_set_id);

          await supabase
            .from("ai_policy_versions")
            .update({ status: "rolled_back" })
            .eq("id", change.to_version_id);

          await supabase
            .from("ai_policy_versions")
            .update({ status: "active" })
            .eq("id", change.from_version_id);

          await supabase
            .from("ai_policy_changes")
            .update({ rolled_back_at: new Date().toISOString() })
            .eq("id", change.id);

          rolledBack = true;
        }
      } else if (postSla < baselineSla || postCycle < baselineCycle) {
        result = "improved";
      }

      await supabase.from("ai_change_evaluations").insert({
        policy_change_id: change.id,
        baseline_metrics: baselineMetrics,
        post_metrics: postMetrics,
        result,
        rolled_back: rolledBack,
      });

      await supabase.from("ai_audit_logs").insert({
        event_type: "change_evaluated",
        actor_type: "system",
        entity_type: "ai_policy_changes",
        entity_id: change.id,
        details: { result, rolled_back: rolledBack },
      });

      results.push({
        change_id: change.id,
        result,
        rolled_back: rolledBack,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-rollback-engine error:", error);
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
