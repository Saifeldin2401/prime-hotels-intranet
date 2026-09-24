/**
 * Timing-safe authorization check for internal cron/service-role calls.
 * Prevents timing attacks on service role key comparison.
 */
export function isAuthorizedServiceRole(
  authHeader: string | null,
  serviceRoleKey: string,
): boolean {
  const expected = `Bearer ${serviceRoleKey}`;
  const actual = authHeader ?? "";

  if (actual.length !== expected.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);

  // Use constant-time comparison
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Authorize internal calls using either:
 * 1) Exact service-role key match, or
 * 2) (legacy) no longer supported via payload-only inspection.
 */
export function isAuthorizedServiceRoleRequest(
  authHeader: string | null,
  serviceRoleKey: string,
): boolean {
  return (
    Boolean(serviceRoleKey) &&
    isAuthorizedServiceRole(authHeader, serviceRoleKey)
  );
}

/**
 * Accept either service role key or a shared internal secret.
 * The shared secret should be provided via AI_CRON_SECRET env var.
 */
export function isAuthorizedInternal(
  authHeader: string | null,
  serviceRoleKey: string,
  internalSecret?: string | null,
): boolean {
  const actual = authHeader ?? "";
  const candidates = [serviceRoleKey, internalSecret].filter(
    Boolean,
  ) as string[];
  if (candidates.length === 0) return false;

  for (const candidate of candidates) {
    const expected = `Bearer ${candidate}`;
    if (actual.length !== expected.length) {
      continue;
    }

    const encoder = new TextEncoder();
    const a = encoder.encode(actual);
    const b = encoder.encode(expected);

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    if (result === 0) return true;
  }

  return false;
}

export function getServiceRoleToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  return token === serviceRoleKey ? token : null;
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the service-role token of an internal (cron / server) request.
 *
 * Accepts the function's own SUPABASE_SERVICE_ROLE_KEY, or a service_role JWT
 * (e.g. the key pg_cron reads from Vault) after the platform itself validates its
 * signature - the functions' env key and the Vault key can legitimately differ in
 * format after an API-key migration, which otherwise rejects every cron call.
 * Returns the token to create the admin client with, or null when unauthorized.
 */
export async function resolveServiceRoleToken(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();
  if (!token) return null;

  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (envKey && isAuthorizedServiceRole(`Bearer ${token}`, envKey)) return token;

  if (decodeJwtRole(token) !== "service_role") return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl) return null;
  try {
    // PostgREST verifies the JWT signature; an invalid or foreign token is 401.
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: token, Authorization: `Bearer ${token}` },
    });
    await res.body?.cancel();
    return res.ok ? token : null;
  } catch {
    return null;
  }
}
