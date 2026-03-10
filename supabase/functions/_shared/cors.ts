export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://phg-connect.com",
  "https://www.phg-connect.com",
  "https://prime-hotels-intranet.vercel.app",
] as const;

export function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];

  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

export function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();

  if (!origin) return allowedOrigins[0] || "https://phg-connect.com";

  const cleanOrigin = origin.trim().replace(/\/$/, "");

  const isAllowed = allowedOrigins.some(ao => {
    const cleanAo = ao.trim().replace(/\/$/, "");
    return cleanAo === cleanOrigin;
  });

  return isAllowed ? origin : allowedOrigins[0] || "https://phg-connect.com";
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
}


