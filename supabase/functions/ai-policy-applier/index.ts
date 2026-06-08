import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleToken } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const encoder = new TextEncoder();

const sha256Hex = async (value: string) => {
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const parsePath = (path: string) =>
  path
    .split(".")
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      const asNumber = Number(segment);
      return Number.isInteger(asNumber) && segment === asNumber.toString()
        ? asNumber
        : segment;
    });

const getByPath = (obj: unknown, path: string) => {
  const parts = parsePath(path);
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part as any];
  }
  return current;
};

const applyPatch = (
  obj: Record<string, unknown>,
  change: Record<string, unknown>,
) => {
  const path = String(change.path ?? "");
  if (!path) throw new Error("Change path is required");

  const operation = String(change.operation ?? "set");
  const parts = parsePath(path);
  if (parts.length === 0) throw new Error("Invalid change path");

  let target: any = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (target[key] === undefined || target[key] === null) {
      const nextKey = parts[i + 1];
      target[key] = typeof nextKey === "number" ? [] : {};
    }
    target = target[key];
  }

  const lastKey = parts[parts.length - 1];
  if (change.old !== undefined) {
    const currentValue = target[lastKey as any];
    if (JSON.stringify(currentValue) !== JSON.stringify(change.old)) {
      throw new Error(`Change old value mismatch at path ${path}`);
    }
  }

  if (operation === "append") {
    if (!Array.isArray(target[lastKey as any])) {
      target[lastKey as any] = [];
    }
    target[lastKey as any].push(change.value);
    return;
  }

  if (operation === "remove") {
    if (Array.isArray(target)) {
      target.splice(lastKey as number, 1);
    } else {
      delete target[lastKey as any];
    }
    return;
  }

  target[lastKey as any] = change.value;
};

const applyProposal = async (supabase: any, proposal: any) => {
  if (!["validated"].includes(proposal.status)) {
    throw new Error(
      `Proposal status ${proposal.status} is not eligible for apply`,
    );
  }

  let policySetQuery = supabase
    .from("ai_policy_sets")
    .select("id, active_version_id");

  if (proposal.policy_set_id) {
    policySetQuery = policySetQuery.eq("id", proposal.policy_set_id);
  } else if (proposal.proposal_json?.policy_set) {
    policySetQuery = policySetQuery.eq(
      "name",
      proposal.proposal_json.policy_set,
    );
  } else {
    throw new Error("Proposal missing policy_set_id and policy_set name");
  }

  const { data: policySet, error: policySetError } =
    await policySetQuery.single();

  if (policySetError || !policySet) {
    throw new Error(policySetError?.message || "Policy set not found");
  }

  const { data: activeVersion, error: versionError } = await supabase
    .from("ai_policy_versions")
    .select("*")
    .eq("id", policySet.active_version_id)
    .single();

  if (versionError || !activeVersion) {
    throw new Error(versionError?.message || "Active policy version not found");
  }

  const updatedPolicy = JSON.parse(
    JSON.stringify(activeVersion.policy_json || {}),
  );
  const changes = Array.isArray(proposal.proposal_json?.changes)
    ? proposal.proposal_json.changes
    : [];

  for (const change of changes) {
    applyPatch(updatedPolicy, change);
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const newVersionLabel = `${activeVersion.version}-auto-${timestamp}`;
  const policyHash = await sha256Hex(JSON.stringify(updatedPolicy));

  const { data: newVersion, error: insertError } = await supabase
    .from("ai_policy_versions")
    .insert({
      policy_set_id: policySet.id,
      version: newVersionLabel,
      policy_json: updatedPolicy,
      hash: policyHash,
      status: "active",
    })
    .select()
    .single();

  if (insertError || !newVersion) {
    throw new Error(
      insertError?.message || "Failed to create new policy version",
    );
  }

  await supabase
    .from("ai_policy_versions")
    .update({ status: "superseded" })
    .eq("id", activeVersion.id);

  await supabase
    .from("ai_policy_sets")
    .update({ active_version_id: newVersion.id })
    .eq("id", policySet.id);

  await supabase.from("ai_policy_changes").insert({
    policy_set_id: policySet.id,
    from_version_id: activeVersion.id,
    to_version_id: newVersion.id,
    proposal_id: proposal.id,
    risk_score:
      proposal.risk_score ?? proposal.proposal_json?.risk_score ?? null,
    applied_at: new Date().toISOString(),
  });

  await supabase
    .from("ai_proposals")
    .update({
      status: "applied",
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id);

  const decisionPayload = {
    proposal_id: proposal.id,
    status: "applied",
    from_version_id: activeVersion.id,
    to_version_id: newVersion.id,
  };

  await supabase.from("ai_decisions").insert({
    proposal_id: proposal.id,
    decision_json: decisionPayload,
    status: "applied",
    applied_at: new Date().toISOString(),
  });

  await supabase.from("ai_audit_logs").insert({
    event_type: "policy_applied",
    actor_type: "system",
    entity_type: "ai_policy_versions",
    entity_id: newVersion.id,
    details: decisionPayload,
  });

  return {
    proposal_id: proposal.id,
    new_version: newVersionLabel,
    policy_set_id: policySet.id,
  };
};

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

    const { proposal_id, apply_all } = await req.json();

    if (apply_all) {
      const { data: thresholds } = await supabase
        .from("ai_risk_thresholds")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      const autoApplyMax =
        typeof thresholds?.auto_apply_max === "number"
          ? thresholds.auto_apply_max
          : 0.2;

      const { data: proposals } = await supabase
        .from("ai_proposals")
        .select("*")
        .eq("status", "validated")
        .lte("risk_score", autoApplyMax)
        .order("created_at", { ascending: true });

      const results = [];
      for (const proposal of proposals || []) {
        try {
          const result = await applyProposal(supabase, proposal);
          results.push({ proposal_id: proposal.id, success: true, result });
        } catch (err) {
          results.push({
            proposal_id: proposal.id,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!proposal_id) {
      return new Response(JSON.stringify({ error: "Missing proposal_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("ai_proposals")
      .select("*")
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      throw new Error(proposalError?.message || "Proposal not found");
    }

    const result = await applyProposal(supabase, proposal);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-policy-applier error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
