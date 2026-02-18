import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Block obvious RFC1918 patterns if hostname is an IP literal
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

function isAllowedUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (!url.hostname) return false;
  if (isPrivateHost(url.hostname)) return false;

  // Conservative allowlist. Expand as needed.
  const allowedHosts = new Set([
    "images.unsplash.com",
    "unsplash.com",
    "plus.unsplash.com",
  ]);

  return allowedHosts.has(url.hostname.toLowerCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Missing Supabase environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    let targetUrl: string | null = null;

    if (req.method === "GET") {
      const u = new URL(req.url);
      targetUrl = u.searchParams.get("url");
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body && typeof body.url === "string") targetUrl = body.url;
    }

    if (!targetUrl) {
      return json({ error: "Missing url" }, 400);
    }

    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch {
      return json({ error: "Invalid url" }, 400);
    }

    if (!isAllowedUrl(url)) {
      return json({ error: "URL not allowed" }, 403);
    }

    const upstream = await fetch(url.toString(), {
      headers: {
        // Some CDNs behave better with a UA
        "User-Agent": "phg-connect-image-proxy/1.0",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return json({ error: "Upstream fetch failed", status: upstream.status }, 502);
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const cacheControl = upstream.headers.get("cache-control") || "public, max-age=3600";

    const bytes = new Uint8Array(await upstream.arrayBuffer());

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
