import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_ALLOWED_ORIGINS = [
  "https://phg-connect.com",
  "https://www.phg-connect.com",
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
  return allowed[0] || "https://phg-connect.com";
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: roleRows, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const hasPermission = roleRows?.some((r) =>
      ["corporate_admin", "regional_admin", "regional_hr"].includes(r.role),
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Insufficient privileges" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const userIdRaw =
      typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userIdRaw || !isUuid(userIdRaw)) {
      return new Response(JSON.stringify({ error: "Invalid userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userIdRaw === user.id) {
      return new Response(
        JSON.stringify({
          error: "You cannot permanently delete your own account.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: targetUser, error: targetError } =
      await adminClient.auth.admin.getUserById(userIdRaw);
    if (targetError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Target user not found in auth." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      userIdRaw,
      false,
    );
    if (deleteError) {
      return new Response(
        JSON.stringify({
          error: `Failed to hard delete user: ${deleteError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hardDeleted: true,
        userId: userIdRaw,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Unexpected error: " + (err?.message || String(err)),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
