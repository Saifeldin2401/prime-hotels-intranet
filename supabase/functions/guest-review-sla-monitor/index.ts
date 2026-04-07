import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type ResponsibilityCode =
  | "general_manager"
  | "area_general_manager"
  | "corporate_reputation_owner"
  | "rooms_manager"
  | "housekeeping_manager"
  | "fnb_manager"
  | "maintenance_manager"
  | "it_manager";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };
}

function timingSafeBearerMatch(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function nextEscalation(code: ResponsibilityCode): ResponsibilityCode | null {
  if (code === "corporate_reputation_owner") return null;
  if (code === "area_general_manager") return "corporate_reputation_owner";
  if (code === "general_manager") return "area_general_manager";
  return "general_manager";
}

async function resolveOwner(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  responsibilityCode: ResponsibilityCode,
) {
  const { data: mapRow } = await supabase
    .from("property_review_owner_mappings")
    .select("primary_profile_id")
    .eq("property_id", propertyId)
    .eq("responsibility_code", responsibilityCode)
    .eq("is_active", true)
    .maybeSingle();
  if (mapRow?.primary_profile_id) return String(mapRow.primary_profile_id);

  const fallbackRole =
    responsibilityCode === "general_manager"
      ? "property_manager"
      : responsibilityCode === "area_general_manager"
        ? "regional_admin"
        : responsibilityCode === "corporate_reputation_owner"
          ? "corporate_admin"
          : null;
  if (!fallbackRole) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", fallbackRole)
    .limit(20);
  for (const rr of roleRows ?? []) {
    if (fallbackRole === "property_manager") {
      const { data: propRows } = await supabase
        .from("user_properties")
        .select("property_id")
        .eq("user_id", rr.user_id)
        .eq("property_id", propertyId)
        .limit(1);
      if (!propRows || propRows.length === 0) continue;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", rr.user_id)
      .maybeSingle();
    if (profile?.id) return String(profile.id);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: vaultServiceSecret } = await supabase
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .filter("name", "eq", "service_role_key")
      .limit(1)
      .maybeSingle();
    const isInternal =
      timingSafeBearerMatch(authHeader, serviceRoleKey) ||
      (typeof vaultServiceSecret?.decrypted_secret === "string" &&
        timingSafeBearerMatch(authHeader, vaultServiceSecret.decrypted_secret));
    if (!isInternal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appBaseUrl =
      Deno.env.get("APP_BASE_URL") ?? "https://phg-connect.com";

    const nowIso = new Date().toISOString();
    const { data: overdueAssignments, error: fetchErr } = await supabase
      .from("guest_review_assignments")
      .select(
        "id, review_id, property_id, responsibility_code, assignee_profile_id, due_at, escalation_level, guest_reviews!inner(id,platform,review_url,summary_en,rating_normalized_10)",
      )
      .in("status", ["pending_ack", "acknowledged", "action_in_progress"])
      .lte("due_at", nowIso)
      .order("due_at", { ascending: true });
    if (fetchErr) throw fetchErr;

    const escalations: Array<Record<string, unknown>> = [];
    for (const assignment of overdueAssignments ?? []) {
      const currentCode = String(
        assignment.responsibility_code,
      ) as ResponsibilityCode;
      const nextCode = nextEscalation(currentCode);

      await supabase
        .from("guest_review_assignments")
        .update({
          status: "escalated",
          escalated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", assignment.id);

      if (!nextCode) {
        escalations.push({
          assignment_id: assignment.id,
          review_id: assignment.review_id,
          status: "terminal",
        });
        continue;
      }

      const nextOwnerProfileId = await resolveOwner(
        supabase,
        String(assignment.property_id),
        nextCode,
      );
      const nextDueAt = new Date(
        Date.now() + 12 * 60 * 60 * 1000,
      ).toISOString();
      const { data: createdEscalation, error: createErr } = await supabase
        .from("guest_review_assignments")
        .insert({
          review_id: assignment.review_id,
          property_id: assignment.property_id,
          responsibility_code: nextCode,
          assignee_profile_id: nextOwnerProfileId,
          status: "pending_ack",
          escalation_level: Number(assignment.escalation_level ?? 0) + 1,
          due_at: nextDueAt,
          routing_reason: "sla_escalation",
        })
        .select("id")
        .single();
      if (createErr) throw createErr;

      const actionUrl = `${appBaseUrl.replace(/\/+$/, "")}/reviews?reviewId=${assignment.review_id}`;
      await supabase.from("guest_review_notification_queue").insert({
        review_id: assignment.review_id,
        assignment_id: createdEscalation.id,
        notification_kind: "escalation_alert",
        channel: "email",
        payload: {
          templateKey: "review_escalation_alert",
          propertyName: "PHG Property",
          platform: assignment.guest_reviews?.platform ?? "Unknown",
          summaryEn: assignment.guest_reviews?.summary_en ?? "",
          escalationLevel: Number(assignment.escalation_level ?? 0) + 1,
          actionUrl,
        },
      });

      await supabase.from("guest_review_audit_events").insert({
        property_id: assignment.property_id,
        review_id: assignment.review_id,
        assignment_id: createdEscalation.id,
        event_type: "assignment_escalated",
        event_payload: {
          from: currentCode,
          to: nextCode,
          previous_assignment_id: assignment.id,
          due_at: nextDueAt,
        },
      });

      escalations.push({
        assignment_id: assignment.id,
        escalated_assignment_id: createdEscalation.id,
        review_id: assignment.review_id,
        from: currentCode,
        to: nextCode,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: (overdueAssignments ?? []).length,
        escalations,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("guest-review-sla-monitor failed:", error);
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
