import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleToken } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const defaultModel = "Qwen/Qwen2.5-72B-Instruct";

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
    const policySetName = body.policy_set ?? "default_workflow";
    const model =
      body.model || Deno.env.get("AI_OPTIMIZER_MODEL") || defaultModel;

    const { data: metricsSnapshot } = await supabase
      .from("ai_metrics_snapshots")
      .select("*")
      .order("window_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!metricsSnapshot) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No metrics snapshot found",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: policySet, error: policySetError } = await supabase
      .from("ai_policy_sets")
      .select("id, domain, active_version_id, name")
      .eq("name", policySetName)
      .single();

    if (policySetError || !policySet) {
      throw new Error(policySetError?.message || "Policy set not found");
    }

    const { data: activeVersion, error: versionError } = await supabase
      .from("ai_policy_versions")
      .select("version, policy_json")
      .eq("id", policySet.active_version_id)
      .single();

    if (versionError || !activeVersion) {
      throw new Error(
        versionError?.message || "Active policy version not found",
      );
    }

    const { data: optimizationPolicyRows } = await supabase.rpc(
      "get_active_policy",
      {
        p_domain: "optimization",
      },
    );
    const optimizationPolicy = optimizationPolicyRows?.[0]?.policy_json ?? {};

    const allowedChanges = Array.isArray(optimizationPolicy.allowed_changes)
      ? optimizationPolicy.allowed_changes
      : [];

    const systemPrompt = [
      "You are an autonomous operations optimizer.",
      "Return ONLY valid JSON matching the schema. No markdown. No extra text.",
      "You must propose changes ONLY within the allowed_changes list.",
      "If no safe change exists, return a JSON object with an empty changes array and risk_score 0.",
    ].join(" ");

    const userPrompt = JSON.stringify({
      schema: {
        decision_type: "workflow_optimization",
        policy_set: policySet.name,
        policy_version_base: activeVersion.version,
        changes: [
          {
            action: "adjust_escalation_hours",
            path: "escalation_rules.0.after_hours",
            value: 36,
            old: 48,
          },
        ],
        risk_score: 0.12,
        expected_outcomes: { cycle_time_reduction: 0.18 },
        rollback_conditions: { sla_breach_rate: ">0.05" },
      },
      context: {
        metrics_snapshot: metricsSnapshot.metrics_json,
        allowed_changes: allowedChanges,
        current_policy: activeVersion.policy_json,
      },
    });

    const hfToken = Deno.env.get("HUGGINGFACE_TOKEN") ?? "";
    if (!hfToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HUGGINGFACE_TOKEN missing",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          stream: false,
        }),
      },
    );

    const aiData = await aiResponse.json();
    if (aiData.error) {
      if (
        typeof aiData.error === "string" &&
        aiData.error.includes("loading")
      ) {
        throw new Error(
          "Hugging Face model is loading. Retry in 20-30 seconds.",
        );
      }
      throw new Error(
        aiData.error.message || aiData.error || "Hugging Face request failed",
      );
    }

    const rawOutput = aiData.choices?.[0]?.message?.content ?? "";
    let proposalJson: Record<string, unknown>;
    try {
      proposalJson = JSON.parse(rawOutput);
    } catch (_err) {
      await supabase.from("ai_audit_logs").insert({
        event_type: "optimizer_parse_failed",
        actor_type: "system",
        entity_type: "ai_proposals",
        details: { raw_output: rawOutput },
      });
      throw new Error("AI output was not valid JSON");
    }

    proposalJson.policy_set = policySet.name;
    proposalJson.policy_version_base = activeVersion.version;
    if (!Array.isArray(proposalJson.changes)) {
      proposalJson.changes = [];
    }

    const riskScore =
      typeof proposalJson.risk_score === "number" ? proposalJson.risk_score : 0;

    const { data: proposal, error: insertError } = await supabase
      .from("ai_proposals")
      .insert({
        proposal_type: "optimization",
        schema_version: "1.0",
        proposal_json: proposalJson,
        policy_set_id: policySet.id,
        base_version_id: policySet.active_version_id,
        status: "pending",
        risk_score: riskScore,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    await supabase.from("ai_audit_logs").insert({
      event_type: "proposal_created",
      actor_type: "system",
      entity_type: "ai_proposals",
      entity_id: proposal.id,
      details: { policy_set: policySet.name },
    });

    return new Response(JSON.stringify({ success: true, proposal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-optimizer error:", error);
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
