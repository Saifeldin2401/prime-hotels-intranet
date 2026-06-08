import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "npm:svix@1.95.1";

type ResendReceivedEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    created_at: string;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    message_id: string;
    subject: string;
    attachments: Array<{
      id: string;
      filename: string;
      content_type: string;
      content_disposition: string;
      content_id?: string;
    }>;
  };
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "content-type, svix-id, svix-timestamp, svix-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: "Missing Supabase environment variables" },
      500,
    );
  }

  if (!RESEND_WEBHOOK_SECRET) {
    return jsonResponse({ error: "Missing RESEND_WEBHOOK_SECRET" }, 500);
  }

  const payload = await req.text();

  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse({ error: "Missing Svix headers" }, 400);
  }

  let event: unknown;
  try {
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return jsonResponse({ error: "Invalid webhook signature" }, 400);
  }

  if (!event || typeof event !== "object") {
    return jsonResponse({ error: "Invalid event" }, 400);
  }

  const parsed = event as Partial<ResendReceivedEvent>;
  if (parsed.type !== "email.received" || !parsed.data?.email_id) {
    return jsonResponse({ ok: true });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const row = {
    email_id: parsed.data.email_id,
    message_id: parsed.data.message_id ?? null,
    from: parsed.data.from ?? null,
    to: parsed.data.to ?? [],
    cc: parsed.data.cc ?? [],
    bcc: parsed.data.bcc ?? [],
    subject: parsed.data.subject ?? null,
    attachments: parsed.data.attachments ?? [],
    received_created_at: parsed.data.created_at ?? null,
    webhook_created_at: parsed.created_at ?? null,
    event_type: parsed.type,
    raw_event: event,
  };

  const { error } = await serviceClient
    .from("inbound_emails")
    .upsert(row, { onConflict: "email_id" });

  if (error) {
    return jsonResponse({ error: "Failed to store inbound email" }, 500);
  }

  return jsonResponse({ ok: true });
});
