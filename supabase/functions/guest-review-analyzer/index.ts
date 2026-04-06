import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { isValidUuid, generateRequestId, fetchWithRetry } from "../_shared/utils.ts";

type ResponsibilityCode =
  | "general_manager"
  | "area_general_manager"
  | "corporate_reputation_owner"
  | "rooms_manager"
  | "housekeeping_manager"
  | "fnb_manager"
  | "maintenance_manager"
  | "it_manager";

type IssueCategory =
  | "cleanliness"
  | "staff_behavior"
  | "room_issues"
  | "maintenance"
  | "food_beverage"
  | "internet_tech"
  | "check_in_out"
  | "reservation_billing"
  | "noise"
  | "safety_security"
  | "amenities"
  | "location"
  | "value"
  | "other";

type Sentiment = "positive" | "neutral" | "negative" | "mixed";
type Severity = "low" | "medium" | "high" | "critical";

const MANUAL_ALLOWED_ROLES = new Set([
  "corporate_admin",
  "regional_admin",
  "regional_hr",
  "property_manager",
  "property_hr",
]);

// Zod schema for request body validation
const analyzeRequestSchema = z.object({
  review_id: z.string().min(1, "review_id is required"),
  force: z.boolean().optional().default(false),
});

type AnalyzeRequestBody = z.infer<typeof analyzeRequestSchema>;

const CATEGORY_KEYWORDS: Record<IssueCategory, string[]> = {
  cleanliness: ["clean", "dirty", "smell", "bathroom", "linen", "housekeeping"],
  staff_behavior: ["staff", "service", "rude", "friendly", "attitude", "behavior"],
  room_issues: ["room", "bed", "check in", "check-in", "check out", "checkout"],
  maintenance: ["ac", "air conditioning", "broken", "repair", "leak", "elevator", "hot water"],
  food_beverage: ["food", "breakfast", "restaurant", "buffet", "coffee", "dinner"],
  internet_tech: ["wifi", "wi-fi", "internet", "network", "tv", "key card"],
  check_in_out: ["check in", "check-in", "check out", "check-out", "arrival", "departure"],
  reservation_billing: ["reservation", "booking", "billing", "charge", "refund", "invoice"],
  noise: ["noise", "noisy", "loud", "disturbance"],
  safety_security: ["unsafe", "security", "danger", "harassment", "abuse", "discrimination"],
  amenities: ["pool", "gym", "spa", "parking", "amenities"],
  location: ["location", "distance", "area", "access"],
  value: ["value", "price", "expensive", "worth"],
  other: [],
};

const CATEGORY_RESPONSIBILITY: Record<IssueCategory, ResponsibilityCode[]> = {
  cleanliness: ["housekeeping_manager"],
  staff_behavior: ["general_manager"],
  room_issues: ["rooms_manager"],
  maintenance: ["maintenance_manager"],
  food_beverage: ["fnb_manager"],
  internet_tech: ["it_manager"],
  check_in_out: ["rooms_manager"],
  reservation_billing: ["rooms_manager"],
  noise: ["general_manager"],
  safety_security: ["general_manager", "maintenance_manager"],
  amenities: ["rooms_manager"],
  location: ["general_manager"],
  value: ["general_manager"],
  other: ["general_manager"],
};

function timingSafeBearerMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function isServiceRoleJwt(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function normalizeRating10(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num <= 5) return Number((num * 2).toFixed(2));
  if (num <= 10) return Number(num.toFixed(2));
  return null;
}

function detectCategories(text: string): IssueCategory[] {
  const lower = text.toLowerCase();
  const categories: IssueCategory[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[IssueCategory, string[]]>) {
    if (category === "other") continue;
    if (keywords.some((k) => lower.includes(k))) categories.push(category);
  }
  return categories.length > 0 ? categories : ["other"];
}

function buildAnalysis(review: Record<string, unknown>) {
  const rating10 = normalizeRating10(review.rating_normalized_10 ?? review.original_rating);
  const text = cleanText(`${review.review_title ?? ""} ${review.review_text ?? ""}`);
  const lower = text.toLowerCase();
  const categories = detectCategories(text);
  const negativeHits = ["dirty", "rude", "bad", "poor", "broken", "problem", "issue", "complaint"].filter((w) =>
    lower.includes(w)
  ).length;
  const positiveHits = ["great", "excellent", "amazing", "friendly", "clean", "helpful", "perfect"].filter((w) =>
    lower.includes(w)
  ).length;

  let sentiment: Sentiment = "neutral";
  if ((rating10 ?? 7) <= 6 || negativeHits > positiveHits) sentiment = "negative";
  if ((rating10 ?? 7) >= 8.5 && positiveHits >= negativeHits) sentiment = "positive";
  if (negativeHits > 0 && positiveHits > 0) sentiment = "mixed";

  let severity: Severity = "medium";
  if ((rating10 ?? 7) <= 4 || categories.includes("safety_security")) severity = "critical";
  else if ((rating10 ?? 7) <= 6 || categories.length > 1) severity = "high";
  else if ((rating10 ?? 7) >= 8.5) severity = "low";

  const critical = Boolean(
    severity === "critical" ||
      review.vip_flag === true ||
      categories.includes("safety_security") ||
      /harassment|abuse|discrimination/.test(lower),
  );

  const summaryEn = sentiment === "positive"
    ? `Guest feedback is largely positive. ${summarize(text)}`
    : `Guest feedback highlights service concerns. ${summarize(text)}`;
  const summaryAr = sentiment === "positive"
    ? "التقييم إيجابي بشكل عام مع إشادة بتجربة الضيف."
    : "يتضمن التقييم ملاحظات تشغيلية تحتاج إلى متابعة سريعة.";

  const managerBriefEn = critical
    ? "Critical review detected. Immediate manager follow-up required."
    : "Review categorized and routed for operational follow-up.";
  const managerBriefAr = critical
    ? "تم رصد تقييم حرج ويتطلب متابعة إدارية فورية."
    : "تم تصنيف التقييم وتوجيهه للجهة المسؤولة للمتابعة.";

  const draftResponseEn = sentiment === "positive"
    ? "Thank you for sharing your positive feedback. We are delighted your stay met expectations and look forward to welcoming you again."
    : "Thank you for sharing your feedback. We are sorry some aspects did not meet expectations, and the responsible team is already following up.";
  const draftResponseAr = sentiment === "positive"
    ? "شكرًا لمشاركتكم هذا التقييم الإيجابي، ويسعدنا أن إقامتكم كانت موفقة. نتطلع لاستقبالكم مجددًا."
    : "شكرًا لملاحظاتكم، ونعتذر عن الجوانب التي لم ترتقِ لتوقعاتكم. قام الفريق المعني بالمتابعة الفورية.";

  return {
    sentiment,
    severity,
    critical,
    categories,
    summaryEn,
    summaryAr,
    managerBriefEn,
    managerBriefAr,
    draftResponseEn,
    draftResponseAr,
    recommendedActions: categories.map((c) => `Follow up on ${c.replace(/_/g, " ")} issue`),
  };
}

async function getManualCallerContext(
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  serviceClient: ReturnType<typeof createClient>,
) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return null;
  const userId = authData.user.id;

  const [{ data: roles }, { data: props }] = await Promise.all([
    serviceClient.from("user_roles").select("role").eq("user_id", userId),
    serviceClient.from("user_properties").select("property_id").eq("user_id", userId),
  ]);

  const roleValues = (roles ?? []).map((r) => r.role);
  if (!roleValues.some((r) => MANUAL_ALLOWED_ROLES.has(r))) return null;

  return {
    userId,
    roles: roleValues,
    propertyIds: (props ?? []).map((p) => String(p.property_id)),
  };
}

async function getVaultServiceRoleSecret(serviceClient: ReturnType<typeof createClient>): Promise<string | null> {
  // Check env first
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
  if (envKey && envKey.trim()) return envKey.trim();
  
  // Check vault for both naming conventions
  const { data: data1 } = await serviceClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", "service_role_key")
    .limit(1)
    .maybeSingle();
  
  if (data1?.decrypted_secret) return String(data1.decrypted_secret);
  
  const { data: data2 } = await serviceClient
    .from("vault.decrypted_secrets")
    .select("decrypted_secret")
    .filter("name", "eq", "SERVICE_ROLE_KEY")
    .limit(1)
    .maybeSingle();
  
  return typeof data2?.decrypted_secret === "string" ? data2.decrypted_secret : null;
}

async function resolveOwner(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  responsibilityCode: ResponsibilityCode,
) {
  const { data: mapRow } = await supabase
    .from("property_review_owner_mappings")
    .select("primary_profile_id, backup_profile_id")
    .eq("property_id", propertyId)
    .eq("responsibility_code", responsibilityCode)
    .eq("is_active", true)
    .maybeSingle();

  if (mapRow?.primary_profile_id) {
    return {
      profileId: String(mapRow.primary_profile_id),
      backupProfileId: mapRow.backup_profile_id ? String(mapRow.backup_profile_id) : null,
    };
  }

  const fallbackRole = responsibilityCode === "general_manager"
    ? "property_manager"
    : responsibilityCode === "area_general_manager"
    ? "regional_admin"
    : responsibilityCode === "corporate_reputation_owner"
    ? "corporate_admin"
    : null;

  if (!fallbackRole) return { profileId: null, backupProfileId: null };

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", fallbackRole);

  let profileId: string | null = null;
  
  // Batch fetch all potential user properties and profiles to avoid N+1 queries
  if (roleRows && roleRows.length > 0) {
    const userIds = roleRows.map((r) => r.user_id);
    
    // If property_manager, filter by property
    let filteredUserIds = userIds;
    if (fallbackRole === "property_manager") {
      const { data: propRows } = await supabase
        .from("user_properties")
        .select("user_id")
        .eq("property_id", propertyId)
        .in("user_id", userIds);
      filteredUserIds = propRows?.map((r) => r.user_id) || [];
    }
    
    if (filteredUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id")
        .in("user_id", filteredUserIds)
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        profileId = String(profiles[0].id);
      }
    }
  }

  return { profileId, backupProfileId: null };
}

async function enqueueNotifications(
  supabase: ReturnType<typeof createClient>,
  reviewId: string,
  propertyId: string,
  assignmentRows: Array<{ id: string; responsibility: ResponsibilityCode; assigneeProfileId: string | null }>,
  payloadBase: Record<string, unknown>,
  critical: boolean,
  requestId?: string,
) {
  const logPrefix = requestId ? `[${requestId}]` : "";
  
  const { data: endpoints } = await supabase
    .from("guest_review_notification_endpoints")
    .select("*")
    .eq("is_active", true);

  const queues: Array<Record<string, unknown>> = [];

  // Batch fetch all profiles at once to avoid N+1 queries
  const profileIds = assignmentRows
    .map((a) => a.assigneeProfileId)
    .filter((id): id is string => Boolean(id));
  
  let profileMap = new Map<string, { email: string | null; full_name: string | null }>();
  
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", profileIds);
    
    profileMap = new Map(
      profiles?.map((p) => [String(p.id), { email: p.email, full_name: p.full_name }]) || []
    );
  }

  for (const assignment of assignmentRows) {
    let assigneeEmail: string | null = null;
    if (assignment.assigneeProfileId) {
      const profile = profileMap.get(assignment.assigneeProfileId);
      assigneeEmail = profile?.email ?? null;
      payloadBase.assigneeName = profile?.full_name ?? assignment.responsibility;
    }

    if (assigneeEmail) {
      queues.push({
        review_id: reviewId,
        assignment_id: assignment.id,
        notification_kind: critical ? "critical_alert" : "review_alert",
        channel: "email",
        scheduled_for: new Date().toISOString(),
        payload: {
          ...payloadBase,
          recipientEmails: [assigneeEmail],
          templateKey: critical ? "review_critical_vip_alert" : "review_negative_alert",
        },
      });
    }

    for (const ep of endpoints ?? []) {
      const propertyMatch = ep.property_id == null || String(ep.property_id) === propertyId;
      const responsibilityMatch = ep.responsibility_code == null || String(ep.responsibility_code) === assignment.responsibility;
      if (!propertyMatch || !responsibilityMatch) continue;
      queues.push({
        review_id: reviewId,
        assignment_id: assignment.id,
        endpoint_id: ep.id,
        notification_kind: critical ? "critical_alert" : "review_alert",
        channel: ep.channel,
        scheduled_for: new Date().toISOString(),
        payload: {
          ...payloadBase,
          secretName: ep.secret_name,
          recipientEmails: Array.isArray(ep.recipients) ? ep.recipients : [],
          templateKey: critical ? "review_critical_vip_alert" : "review_negative_alert",
        },
      });
    }
  }

  if (queues.length > 0) {
    const { error: queueError } = await supabase.from("guest_review_notification_queue").insert(queues);
    if (queueError) {
      console.error(`${logPrefix} Failed to insert notifications to queue:`, queueError.message, queueError.code);
      throw new Error(`Notification queue insert failed: ${queueError.message}`);
    }
    console.log(`${logPrefix} Successfully queued ${queues.length} notifications for review ${reviewId}`);
  } else {
    console.log(`${logPrefix} No notifications to queue for review ${reviewId}`);
  }
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const corsHeaders = buildCorsHeaders(req);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body using Zod
    let body: AnalyzeRequestBody;
    if (req.method === "POST") {
      const rawBody = await req.json().catch(() => ({}));
      const parseResult = analyzeRequestSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(JSON.stringify({ 
          error: "Invalid request body", 
          details: parseResult.error.errors 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = parseResult.data;
    } else {
      body = { review_id: "", force: false };
    }
    
    const { review_id: reviewId, force } = body;

    // Validate UUID format
    if (!isValidUuid(reviewId)) {
      return new Response(JSON.stringify({ error: "Invalid review_id format. Expected UUID." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://phg-connect.com";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    // Create ONE Supabase client at the start and reuse throughout
    const rootServiceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    const vaultServiceRoleKey = await getVaultServiceRoleSecret(rootServiceClient);
    const isServiceRole = timingSafeBearerMatch(authHeader, serviceRoleKey);
    const isVaultServiceRole = vaultServiceRoleKey ? timingSafeBearerMatch(authHeader, vaultServiceRoleKey) : false;
    const hasServiceRoleJwt = isServiceRoleJwt(authHeader);
    const isInternalService = isServiceRole || isVaultServiceRole || hasServiceRoleJwt;

    const serviceToken = isInternalService ? serviceRoleKey : extractBearerToken(authHeader);
    if (!serviceToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse the single client (or create a new one with the appropriate token if needed)
    const supabase = isInternalService
      ? rootServiceClient
      : createClient(supabaseUrl, serviceToken, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

    const manualContext = !isInternalService
      ? await getManualCallerContext(supabaseUrl, anonKey, authHeader, rootServiceClient)
      : null;
    if (!isInternalService && !manualContext) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse the single client instead of creating new ones
    const { data: review, error: reviewError } = await supabase
      .from("guest_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();
    if (reviewError || !review) throw reviewError ?? new Error("Review not found");

    if (!isInternalService && !manualContext!.propertyIds.includes(String(review.property_id))) {
      return new Response(JSON.stringify({ error: "Forbidden for this property" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!force && review.ai_analysis_status === "completed") {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_completed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = buildAnalysis(review as Record<string, unknown>);
    const dueHours = analysis.critical ? 12 : 24;
    const dueAt = new Date(Date.now() + dueHours * 60 * 60 * 1000).toISOString();

    // Reuse the single client
    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", review.property_id)
      .maybeSingle();

    // Delete existing issues
    await supabase.from("guest_review_issues").delete().eq("review_id", reviewId);
    
    const issueRows = analysis.categories.map((category) => ({
      review_id: reviewId,
      category,
      label: category.replace(/_/g, " "),
      polarity: analysis.sentiment,
      severity: analysis.severity,
      confidence: 0.78,
      evidence_text: category,
      issue_summary_en: `${category.replace(/_/g, " ")} issue identified`,
      issue_summary_ar: "تم تحديد ملاحظة تحتاج متابعة",
    }));
    if (issueRows.length > 0) {
      await supabase.from("guest_review_issues").insert(issueRows);
    }

    // Delete existing non-closed assignments
    await supabase
      .from("guest_review_assignments")
      .delete()
      .eq("review_id", reviewId)
      .neq("status", "closed");

    const responsibilities = new Set<ResponsibilityCode>();
    for (const category of analysis.categories) {
      (CATEGORY_RESPONSIBILITY[category] ?? ["general_manager"]).forEach((r) => responsibilities.add(r));
    }
    if (analysis.sentiment === "negative" || (normalizeRating10(review.rating_normalized_10) ?? 10) <= 6) {
      responsibilities.add("general_manager");
    }

    const assignmentInserts: Array<Record<string, unknown>> = [];
    const assignmentMeta: Array<{ responsibility: ResponsibilityCode; assigneeProfileId: string | null }> = [];
    for (const responsibility of responsibilities) {
      const owner = await resolveOwner(supabase, String(review.property_id), responsibility);
      assignmentInserts.push({
        review_id: reviewId,
        property_id: review.property_id,
        responsibility_code: responsibility,
        assignee_profile_id: owner.profileId,
        backup_profile_id: owner.backupProfileId,
        issue_categories: analysis.categories,
        status: "pending_ack",
        is_secondary: responsibility === "general_manager" && analysis.sentiment === "negative",
        routing_reason: "ai_category_detection",
        escalation_level: 0,
        due_at: dueAt,
      });
      assignmentMeta.push({ responsibility, assigneeProfileId: owner.profileId });
    }

    const { data: assignments, error: assignmentError } = await supabase
      .from("guest_review_assignments")
      .insert(assignmentInserts)
      .select("id,responsibility_code,assignee_profile_id");
    if (assignmentError) throw assignmentError;

    const responsePayload = {
      review_id: reviewId,
      selected_tone: "business",
      draft_response_en: analysis.draftResponseEn,
      draft_response_ar: analysis.draftResponseAr,
      metadata: { auto_generated: true },
    };
    
    const { data: existingResp } = await supabase
      .from("guest_review_responses")
      .select("id")
      .eq("review_id", reviewId)
      .maybeSingle();
    if (existingResp?.id) {
      await supabase
        .from("guest_review_responses")
        .update(responsePayload)
        .eq("id", existingResp.id);
    } else {
      await supabase.from("guest_review_responses").insert(responsePayload);
    }

    // Update review status
    await supabase
      .from("guest_reviews")
      .update({
        sentiment: analysis.sentiment,
        severity: analysis.severity,
        critical_flag: analysis.critical,
        summary_en: analysis.summaryEn,
        summary_ar: analysis.summaryAr,
        manager_brief_en: analysis.managerBriefEn,
        manager_brief_ar: analysis.managerBriefAr,
        positive_mentions: [],
        recommended_actions: analysis.recommendedActions,
        ai_analysis_status: "completed",
        ai_analyzed_at: new Date().toISOString(),
        response_sla_due_at: dueAt,
        first_assigned_at: new Date().toISOString(),
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    // Insert audit event
    await supabase.from("guest_review_audit_events").insert({
      property_id: review.property_id,
      review_id: reviewId,
      actor_id: manualContext?.userId ?? null,
      event_type: "review_analyzed",
      event_payload: {
        sentiment: analysis.sentiment,
        severity: analysis.severity,
        categories: analysis.categories,
      },
    });

    // ── Auto-create a task for negative / critical reviews ──────────────────
    if (analysis.sentiment === 'negative' || analysis.critical) {
      const severityToPriority: Record<string, string> = {
        critical: 'urgent',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };
      const taskPriority = severityToPriority[analysis.severity] ?? 'medium';
      const dueHoursTask = analysis.critical ? 12 : 24;
      const taskDueDate = new Date(Date.now() + dueHoursTask * 60 * 60 * 1000).toISOString();

      // Use the general_manager assignee as the task owner, fallback to first assignee
      const gmMeta = assignmentMeta.find((m) => m.responsibility === 'general_manager');
      const taskAssigneeId = gmMeta?.assigneeProfileId ?? assignmentMeta[0]?.assigneeProfileId ?? null;

      const taskTitle = analysis.critical
        ? `URGENT: Guest review requires immediate attention – ${property?.name ?? 'Property'}`
        : `Guest review follow-up required – ${property?.name ?? 'Property'} (${review.platform ?? 'platform'})`;

      await supabase.from('tasks').insert({
        title: taskTitle,
        description: [
          analysis.summaryEn,
          `Categories: ${analysis.categories.join(', ')}`,
          `Recommended actions: ${analysis.recommendedActions.join('; ')}`,
          `Review ID: ${reviewId}`,
        ].join('\n\n'),
        status: 'todo',
        priority: taskPriority,
        assigned_to_id: taskAssigneeId,
        assigned_to: taskAssigneeId,
        property_id: review.property_id,
        due_date: taskDueDate,
        sla_hours: dueHoursTask,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    await enqueueNotifications(
      supabase,
      reviewId,
      String(review.property_id),
      (assignments ?? []).map((a) => ({
        id: String(a.id),
        responsibility: String(a.responsibility_code) as ResponsibilityCode,
        assigneeProfileId: a.assignee_profile_id ? String(a.assignee_profile_id) : null,
      })),
      {
        propertyName: property?.name ?? "PHG Property",
        platform: review.platform,
        ratingDisplay: review.rating_normalized_10 ? `${Number(review.rating_normalized_10).toFixed(1)}/10` : "Unrated",
        summaryEn: analysis.summaryEn,
        managerBriefEn: analysis.managerBriefEn,
        issueCategories: analysis.categories.join(", "),
        actionUrl: `${appBaseUrl.replace(/\/+$/, "")}/reviews?reviewId=${reviewId}`,
        reviewText: review.text,
        authorName: review.author_name,
        reviewedAt: review.published_at,
        reviewUrl: review.url,
      },
      analysis.critical,
      requestId,
    );

    return new Response(JSON.stringify({
      success: true,
      review_id: reviewId,
      sentiment: analysis.sentiment,
      severity: analysis.severity,
      critical: analysis.critical,
      assignments_created: assignmentInserts.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] guest-review-analyzer failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
