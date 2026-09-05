export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://altus-advisory.com",
  "https://www.altus-advisory.com",
  "https://connect.altusadvisory.com",
  "https://prime-hotels-intranet.vercel.app",
  "https://altus-hospitality-erp.vercel.app",
  "https://www.phg-connect.com",
  "https://phg-connect.com"
] as const;

export function getAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [...DEFAULT_ALLOWED_ORIGINS];

  const parsed = raw
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_ORIGINS];
}

export function resolveCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins();

  if (!origin) return allowedOrigins[0] || "https://altus-hospitality-erp.vercel.app";

  const cleanOrigin = origin.trim().replace(/\/$/, "");

  const isLocalDevOrigin =
    /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d{2,5})?$/.test(
      cleanOrigin,
    );
  if (isLocalDevOrigin) return origin;

  const isVercelOrNetlify =
    /^https:\/\/([a-z0-9-]+)\.vercel\.app$/i.test(cleanOrigin) ||
    /^https:\/\/([a-z0-9-]+)\.netlify\.app$/i.test(cleanOrigin);
  if (isVercelOrNetlify) return origin;

  const isAllowed = allowedOrigins.some((ao) => {
    const cleanAo = ao.trim().replace(/\/$/, "");
    return cleanAo === cleanOrigin;
  });

  return isAllowed
    ? origin
    : allowedOrigins[0] || "https://altus-hospitality-erp.vercel.app";
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(req),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    Vary: "Origin",
  };
}
