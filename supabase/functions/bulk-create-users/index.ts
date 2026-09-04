import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.altus-advisory.com",
  "https://www.altus-advisory.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
] as const;

function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

function resolveCorsOrigin(req: Request): string {
  const origin = (req.headers.get("origin") || "").trim();
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] || "https://www.altus-advisory.com";
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

type AppRole =
  | "regional_admin"
  | "regional_hr"
  | "property_manager"
  | "property_hr"
  | "department_head"
  | "staff";

type InputRow = {
  email: string;
  fullName: string;
  dateOfBirth: string;
  roleLevel: string;
  jobTitle: string;
  department: string;
  property: string;
};

type JobTitleMatch = {
  input: string;
  matched: string | null;
  score: number | null;
  candidates: { title: string; score: number }[];
  kind: "exact" | "fuzzy" | "none";
};

type NameMatch = {
  input: string;
  matched: { id: string; name: string } | null;
  score: number | null;
  candidates: { id: string; name: string; score: number }[];
  kind: "exact" | "fuzzy" | "none";
};

function normalizeDepartmentAlias(department: string): string {
  const normalized = normalizeText(department);
  if (normalized === "executive") return "Management";
  if (normalized === "operations") return "Management";
  if (normalized === "sales") return "Sales & Marketing";
  return department;
}

function normalizePropertyAlias(property: string): string {
  const normalized = normalizeText(property);
  if (normalized === "jeddah") return "__CITY_JEDDAH__";
  if (normalized === "riyadh") return "__CITY_RIYADH__";
  return property;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "");
}

function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseCsv(csv: string): InputRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const rows = lines.map(parseCsvLine);
  const header = rows[0].map((h) => h.trim());
  const required = [
    "email",
    "fullName",
    "dateOfBirth",
    "roleLevel",
    "jobTitle",
    "department",
    "property",
  ];

  for (const col of required) {
    if (!header.includes(col)) {
      throw new Error(`Missing required CSV column: ${col}`);
    }
  }

  const idx = (col: string) => header.indexOf(col);

  return rows.slice(1).map((r) => {
    const get = (col: string) => (r[idx(col)] ?? "").trim();
    return {
      email: get("email"),
      fullName: get("fullName"),
      dateOfBirth: get("dateOfBirth"),
      roleLevel: get("roleLevel"),
      jobTitle: get("jobTitle"),
      department: get("department"),
      property: get("property"),
    } satisfies InputRow;
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

async function requirePrivilegedUser(
  req: Request,
): Promise<{ authHeader: string; userId: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) return null;

  const { data: roles } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const hasPermission = (
    roles as Array<{ role: string }> | null | undefined
  )?.some((r: { role: string }) =>
    [
      "administrator",
      "super_admin",
      "corporate_admin",
      "regional_admin",
      "training_manager",
      "regional_hr",
    ].includes(r.role),
  );
  if (!hasPermission) return null;

  return { authHeader, userId: user.id };
}

function mapRoleLevel(roleLevel: string): AppRole {
  const normalized = normalizeText(roleLevel);

  if (
    normalized.includes("owner") ||
    normalized.includes("super admin") ||
    normalized.includes("administrator")
  )
    return "regional_admin";
  if (normalized.includes("group director")) return "regional_admin";
  if (normalized.includes("group admin")) return "regional_admin";
  if (normalized.includes("training manager")) return "regional_hr";
  if (normalized.includes("property leader")) return "property_manager";
  if (normalized.includes("front office leader")) return "department_head";
  if (normalized.includes("department head")) return "department_head";
  if (normalized === "manager") return "department_head";

  throw new Error(`Unknown roleLevel: ${roleLevel}`);
}

async function resolveProperties(
  propertyCell: string,
  organizationId: string,
): Promise<{ ids: string[]; matches: NameMatch[]; errors: string[] }> {
  const trimmed = propertyCell.trim();
  if (!trimmed) return { ids: [], matches: [], errors: ["Missing property"] };

  const normalizedAlias = normalizePropertyAlias(trimmed);

  if (trimmed.toUpperCase() === "ALL") {
    const { data, error } = await adminClient
      .from("properties")
      .select("id,name")
      .eq("organization_id", organizationId)
      .eq("is_deleted", false);
    if (error)
      return {
        ids: [],
        matches: [],
        errors: [`Failed to fetch properties: ${error.message}`],
      };
    const ids = ((data ?? []) as Array<{ id: string; name: string }>).map(
      (p: { id: string; name: string }) => p.id,
    );
    return {
      ids,
      matches: [
        {
          input: "ALL",
          matched: { id: "ALL", name: "ALL" },
          score: 1,
          candidates: [],
          kind: "exact",
        },
      ],
      errors: [],
    };
  }

  if (
    normalizedAlias === "__CITY_JEDDAH__" ||
    normalizedAlias === "__CITY_RIYADH__"
  ) {
    const city = normalizedAlias === "__CITY_JEDDAH__" ? "Jeddah" : "Riyadh";
    const { data, error } = await adminClient
      .from("properties")
      .select("id,name")
      .eq("organization_id", organizationId)
      .eq("is_deleted", false)
      .ilike("name", `%${city}%`);

    if (error) {
      return {
        ids: [],
        matches: [],
        errors: [`Failed to fetch ${city} properties: ${error.message}`],
      };
    }

    const rows = (data ?? []) as Array<{ id: string; name: string }>;
    if (rows.length === 0) {
      return {
        ids: [],
        matches: [],
        errors: [`No properties matched city: ${city}`],
      };
    }

    const ids = rows.map((p: { id: string; name: string }) => p.id);
    return {
      ids: Array.from(new Set(ids)),
      matches: [
        {
          input: city,
          matched: { id: `CITY:${city.toUpperCase()}`, name: `${city} (all)` },
          score: 1,
          candidates: rows.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
            score: 1,
          })),
          kind: "exact",
        },
      ],
      errors: [],
    };
  }

  const parts = trimmed
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const ids: string[] = [];
  const matches: NameMatch[] = [];
  const errors: string[] = [];

  for (const part of parts) {
    const m = await fuzzyResolveByName("properties", part, organizationId);
    matches.push(m);
    if (!m.matched) {
      errors.push(`Property not found: ${part}`);
      continue;
    }
    ids.push(m.matched.id);
  }

  return { ids: Array.from(new Set(ids)), matches, errors };
}

async function resolveDepartment(
  departmentCell: string,
  propertyIds: string[],
  organizationId: string,
): Promise<{ ids: string[]; match: NameMatch; errors: string[] }> {
  const trimmed = departmentCell.trim();
  if (!trimmed) {
    return {
      ids: [],
      match: {
        input: trimmed,
        matched: null,
        score: null,
        candidates: [],
        kind: "none",
      },
      errors: ["Missing department"],
    };
  }

  const match = await fuzzyResolveDepartment(trimmed, propertyIds, organizationId);
  if (!match.matched) {
    return { ids: [], match, errors: [`Department not found: ${trimmed}`] };
  }

  // If propertyIds includes multiple properties, assign the resolved department ID(s) per property
  // by selecting best match per property.
  if (propertyIds.length > 1) {
    const ids: string[] = [];
    const candidates: { id: string; name: string; score: number }[] = [];

    for (const propertyId of propertyIds) {
      const perProp = await fuzzyResolveDepartment(trimmed, [propertyId], organizationId);
      if (perProp.matched) {
        ids.push(perProp.matched.id);
        candidates.push(
          ...perProp.candidates.map(
            (c: { id: string; name: string; score: number }) => ({ ...c }),
          ),
        );
      }
    }

    return {
      ids: Array.from(new Set(ids)),
      match: { ...match, candidates },
      errors:
        ids.length === 0
          ? [`Department not found for any property: ${trimmed}`]
          : [],
    };
  }

  return { ids: [match.matched.id], match, errors: [] };
}

async function fuzzyResolveDepartment(
  name: string,
  propertyIds: string[],
  organizationId: string,
): Promise<NameMatch> {
  const normalizedInput = normalizeText(name);

  // Exact (normalized) match first, scoped to organization_id.
  {
    let query = adminClient
      .from("departments")
      .select("id,name,property_id")
      .eq("organization_id", organizationId)
      .eq("is_deleted", false);
    if (propertyIds.length > 0) {
      query = query.in("property_id", propertyIds);
    }
    const { data } = await query;
    const exact = (
      (data ?? []) as Array<{
        id: string;
        name: string;
        property_id: string | null;
      }>
    ).find(
      (d: { id: string; name: string; property_id: string | null }) =>
        normalizeText(d.name) === normalizedInput,
    );
    if (exact) {
      return {
        input: name,
        matched: { id: exact.id, name: exact.name },
        score: 1,
        candidates: [],
        kind: "exact",
      };
    }
  }

  // Fuzzy via pg_trgm similarity.
  try {
    const { data, error } = await adminClient.rpc(
      "search_departments_by_similarity",
      {
        search_text: name,
        property_ids: propertyIds,
        result_limit: 10,
      },
    );

    if (error) {
      return {
        input: name,
        matched: null,
        score: null,
        candidates: [],
        kind: "none",
      };
    }

    const rows = (data ?? []) as { id: string; name: string; score: number }[];
    if (rows.length === 0) {
      return {
        input: name,
        matched: null,
        score: null,
        candidates: [],
        kind: "none",
      };
    }

    // Filter similarity results to target organization_id
    const { data: orgDepts } = await adminClient
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", rows.map((r) => r.id));

    const validDeptIds = new Set((orgDepts ?? []).map((d: any) => d.id));
    const candidates = rows.filter((r) => validDeptIds.has(r.id)).slice(0, 5);
    const best = candidates[0];

    if (!best || best.score < 0.25) {
      return {
        input: name,
        matched: null,
        score: best?.score ?? null,
        candidates,
        kind: "none",
      };
    }

    return {
      input: name,
      matched: { id: best.id, name: best.name },
      score: best.score,
      candidates,
      kind: "fuzzy",
    };
  } catch {
    return {
      input: name,
      matched: null,
      score: null,
      candidates: [],
      kind: "none",
    };
  }
}

async function fuzzyResolveByName(
  table: "properties",
  input: string,
  organizationId: string,
): Promise<NameMatch> {
  const normalizedInput = normalizeText(input);

  const { data: allRows, error: allError } = await adminClient
    .from(table)
    .select("id,name")
    .eq("organization_id", organizationId)
    .eq("is_deleted", false);

  if (allError) {
    return { input, matched: null, score: null, candidates: [], kind: "none" };
  }

  const exact = ((allRows ?? []) as Array<{ id: string; name: string }>).find(
    (r: { id: string; name: string }) =>
      normalizeText(r.name) === normalizedInput,
  );
  if (exact) {
    return {
      input,
      matched: { id: exact.id, name: exact.name },
      score: 1,
      candidates: [],
      kind: "exact",
    };
  }

  // Fuzzy: compute similarity in SQL and take top 5.
  const { data, error } = await adminClient.rpc(
    "search_properties_by_similarity",
    {
      search_text: input,
      result_limit: 10,
    },
  );

  if (error) {
    return { input, matched: null, score: null, candidates: [], kind: "none" };
  }

  const rows = (data ?? []) as { id: string; name: string; score: number }[];
  if (rows.length === 0) {
    return { input, matched: null, score: null, candidates: [], kind: "none" };
  }

  // Filter similarity results to target organization_id
  const { data: orgProps } = await adminClient
    .from("properties")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", rows.map((r) => r.id));

  const validPropIds = new Set((orgProps ?? []).map((p: any) => p.id));
  const candidates = rows.filter((r) => validPropIds.has(r.id)).slice(0, 5);
  const best = candidates[0];

  if (!best || best.score < 0.25) {
    return {
      input,
      matched: null,
      score: best?.score ?? null,
      candidates,
      kind: "none",
    };
  }

  return {
    input,
    matched: { id: best.id, name: best.name },
    score: best.score,
    candidates,
    kind: "fuzzy",
  };
}

async function resolveJobTitle(input: string): Promise<JobTitleMatch> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { input, matched: null, score: null, candidates: [], kind: "none" };
  }

  // Exact-ish first.
  {
    const { data } = await adminClient
      .from("job_titles")
      .select("title")
      .ilike("title", trimmed)
      .limit(1)
      .maybeSingle();
    if (data?.title) {
      return {
        input,
        matched: data.title,
        score: 1,
        candidates: [],
        kind: "exact",
      };
    }
  }

  // Fuzzy via similarity.
  const { data, error } = await adminClient.rpc(
    "search_job_titles_by_similarity",
    {
      search_text: trimmed,
      result_limit: 5,
    },
  );

  if (error) {
    return { input, matched: null, score: null, candidates: [], kind: "none" };
  }

  const rows = (data ?? []) as { title: string; score: number }[];
  const candidates = rows.map((r) => ({ title: r.title, score: r.score }));
  const best = candidates[0];

  if (!best || best.score < 0.25) {
    return {
      input,
      matched: null,
      score: best?.score ?? null,
      candidates,
      kind: "none",
    };
  }

  return {
    input,
    matched: best.title,
    score: best.score,
    candidates,
    kind: "fuzzy",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const privileged = await requirePrivilegedUser(req);
    if (!privileged) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Insufficient privileges" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as {
      mode?: "dry-run" | "create";
      csv?: string;
      rows?: InputRow[];
      approve?: boolean;
      organizationId?: string;
      organization_id?: string;
    };

    const mode = body.mode ?? "dry-run";
    const approve = body.approve ?? false;

    // Resolve target organization context
    let targetOrgId: string | null =
      body.organizationId || body.organization_id || null;

    if (!targetOrgId) {
      const { data: userMembership } = await adminClient
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", privileged.userId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userMembership?.organization_id) {
        targetOrgId = userMembership.organization_id;
      }
    }

    if (!targetOrgId) {
      return new Response(
        JSON.stringify({ error: "Missing target organization context" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify organization operational status before processing
    const { data: isOp } = await adminClient.rpc("is_platform_operator", {
      p_user_id: privileged.userId,
    });

    if (!isOp) {
      // 1. Verify organization is active and operational
      const { data: isOperational } = await adminClient.rpc(
        "org_is_operational",
        {
          p_org_id: targetOrgId,
        },
      );

      if (isOperational === false) {
        return new Response(
          JSON.stringify({
            error:
              "Forbidden: Cannot process users for a suspended or inactive organization.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // 2. Verify caller has administrative authority over targetOrgId
      const { data: callerMembership } = await adminClient
        .from("organization_memberships")
        .select("role")
        .eq("user_id", privileged.userId)
        .eq("organization_id", targetOrgId)
        .eq("is_active", true)
        .maybeSingle();

      if (
        !callerMembership ||
        ![
          "organization_owner",
          "organization_admin",
          "brand_admin",
          "hotel_admin",
          "training_manager",
        ].includes(callerMembership.role)
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Forbidden: You do not have administrative authority over this organization.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    let rows: InputRow[] = [];
    if (typeof body.csv === "string") {
      rows = parseCsv(body.csv);
    } else if (Array.isArray(body.rows)) {
      rows = body.rows;
    } else {
      return new Response(JSON.stringify({ error: "Missing csv or rows" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seenEmails = new Set<string>();
    const duplicateEmails: string[] = [];
    for (const r of rows) {
      const key = r.email.trim().toLowerCase();
      if (!key) continue;
      if (seenEmails.has(key)) duplicateEmails.push(r.email);
      seenEmails.add(key);
    }

    const results: Array<
      InputRow & {
        mappedRole: AppRole | null;
        propertyIds: string[];
        propertyMatches: NameMatch[];
        departmentIds: string[];
        departmentMatch: NameMatch;
        jobTitleMatch: JobTitleMatch;
        errors: string[];
      }
    > = [];

    for (const row of rows) {
      const errors: string[] = [];

      if (!row.email?.trim()) errors.push("Missing email");
      if (!row.fullName?.trim()) errors.push("Missing fullName");
      if (!row.dateOfBirth?.trim()) errors.push("Missing dateOfBirth");
      if (row.dateOfBirth && !isISODate(row.dateOfBirth))
        errors.push("Invalid dateOfBirth format (YYYY-MM-DD)");

      let mappedRole: AppRole | null = null;
      try {
        mappedRole = mapRoleLevel(row.roleLevel);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      const prop = await resolveProperties(row.property, targetOrgId);
      errors.push(...prop.errors);

      const dept = await resolveDepartment(
        normalizeDepartmentAlias(row.department),
        prop.ids,
        targetOrgId,
      );
      errors.push(...dept.errors);

      const jobTitleMatch = await resolveJobTitle(row.jobTitle);
      if (!jobTitleMatch.matched) {
        errors.push(`Job title not found: ${row.jobTitle}`);
      }

      results.push({
        ...row,
        mappedRole,
        propertyIds: prop.ids,
        propertyMatches: prop.matches,
        departmentIds: dept.ids,
        departmentMatch: dept.match,
        jobTitleMatch,
        errors,
      });
    }

    const hasErrors =
      duplicateEmails.length > 0 || results.some((r) => r.errors.length > 0);

    if (mode === "dry-run") {
      return new Response(
        JSON.stringify({
          success: !hasErrors,
          duplicateEmails,
          results,
          requiresApproval: results.some(
            (r) =>
              r.jobTitleMatch.kind === "fuzzy" ||
              r.departmentMatch.kind === "fuzzy" ||
              r.propertyMatches.some((m) => m.kind === "fuzzy"),
          ),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // mode === "create"
    if (!approve) {
      return new Response(
        JSON.stringify({ error: "Create mode requires approve=true" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (duplicateEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: "Duplicate emails in input", duplicateEmails }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const createReports: Array<{
      email: string;
      success: boolean;
      userId?: string;
      error?: string;
    }> = [];

    for (const r of results) {
      if (r.errors.length > 0 || !r.mappedRole) {
        createReports.push({
          email: r.email,
          success: false,
          error: r.errors.join("; ") || "Invalid row",
        });
        continue;
      }

      // Reuse existing create-user function to ensure temp password + welcome email stays consistent.
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: privileged.authHeader,
          },
          body: JSON.stringify({
            email: r.email,
            fullName: r.fullName,
            dateOfBirth: r.dateOfBirth,
            phone: null,
            jobTitle: r.jobTitleMatch.matched ?? r.jobTitle,
            role: r.mappedRole,
            propertyIds: r.propertyIds,
            departmentIds: r.departmentIds,
            reportingTo: null,
            organizationId: targetOrgId,
          }),
        });

        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          createReports.push({
            email: r.email,
            success: false,
            error: payload?.error || `Failed with status ${resp.status}`,
          });
          continue;
        }

        createReports.push({
          email: r.email,
          success: true,
          userId: payload?.userId,
        });
      } catch (e) {
        createReports.push({
          email: r.email,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: createReports.every((r) => r.success),
        results: createReports,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("bulk-create-users error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
