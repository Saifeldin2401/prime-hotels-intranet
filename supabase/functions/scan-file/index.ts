import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "msi",
  "ps1",
  "vbs",
  "js",
  "jar",
  "scr",
  "com",
  "sh",
  "php",
  "pl",
]);

const SUSPICIOUS_DOUBLE_EXTENSION_REGEX =
  /\.[a-z0-9]{1,5}\.(exe|dll|bat|cmd|msi|ps1|vbs|js|jar|scr|com|sh|php|pl)$/i;
const EICAR_SIGNATURE =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

type ScanRequest = {
  file_name?: string;
  file_size?: number;
  file_type?: string;
  file_hash_sha256?: string;
  sample_base64?: string;
  storage_bucket?: string;
  storage_path?: string;
  context?: string;
  user_id?: string;
};

type ScanStatus = "clean" | "suspicious" | "infected" | "error";

type ScanEvaluation = {
  safe: boolean;
  status: ScanStatus;
  risk_score: number;
  message: string;
  reasons: string[];
};

function decodeBase64Sample(sampleBase64?: string): Uint8Array {
  if (!sampleBase64) return new Uint8Array();

  const normalized = sampleBase64.includes(",")
    ? (sampleBase64.split(",").pop() ?? "")
    : sampleBase64;

  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array();
  }
}

function evaluateScan(
  payload: Required<
    Pick<ScanRequest, "file_name" | "file_size" | "file_type">
  > &
    ScanRequest,
): ScanEvaluation {
  const reasons: string[] = [];
  let risk = 0;
  let status: ScanStatus = "clean";

  const fileName = payload.file_name.trim().toLowerCase();
  const fileSize = Number(payload.file_size || 0);
  const fileType = (payload.file_type || "").toLowerCase();
  const extension = fileName.includes(".")
    ? (fileName.split(".").pop() ?? "")
    : "";
  const sampleBytes = decodeBase64Sample(payload.sample_base64);
  const sampleText = new TextDecoder("utf-8", { fatal: false }).decode(
    sampleBytes,
  );

  if (!fileName) {
    reasons.push("Missing file name.");
    risk = Math.max(risk, 70);
    status = "suspicious";
  }

  if (fileSize <= 0) {
    reasons.push("Empty file detected.");
    risk = Math.max(risk, 75);
    status = "suspicious";
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    reasons.push("File exceeds security size limit.");
    risk = Math.max(risk, 90);
    status = "suspicious";
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    reasons.push(`Blocked executable extension: .${extension}`);
    risk = 100;
    status = "infected";
  }

  if (SUSPICIOUS_DOUBLE_EXTENSION_REGEX.test(fileName)) {
    reasons.push("Suspicious double extension detected.");
    risk = Math.max(risk, 95);
    status = "infected";
  }

  if (fileName.includes("eicar") || sampleText.includes(EICAR_SIGNATURE)) {
    reasons.push("Malware test signature detected (EICAR).");
    risk = 100;
    status = "infected";
  }

  if (fileType.startsWith("text/") && /<script\b/i.test(sampleText)) {
    reasons.push("Embedded script content detected in text payload.");
    risk = Math.max(risk, 80);
    if (status !== "infected") status = "suspicious";
  }

  if (!fileType && sampleBytes.length > 0) {
    reasons.push("Missing MIME type metadata.");
    risk = Math.max(risk, 50);
    if (status === "clean") status = "suspicious";
  }

  const clean = status === "clean";
  const message = clean ? "File passed security scan." : reasons.join(" ");

  return {
    safe: clean,
    status,
    risk_score: clean ? 0 : Math.min(100, risk),
    message,
    reasons,
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    const serviceRoleJwt = getServiceRoleToken(authHeader);
    const isServiceCall = isAuthorizedServiceRoleRequest(
      authHeader,
      serviceRoleKey,
    );

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Scan service is not configured." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payload = (await req.json()) as ScanRequest;
    const fileName = (payload.file_name || "").trim();
    const fileSize = Number(payload.file_size || 0);
    const fileType = payload.file_type || "";

    if (!fileName) {
      return new Response(JSON.stringify({ error: "file_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    let actorUserId: string | null = null;
    if (!isServiceCall) {
      const { data: userData, error: userError } =
        await authClient.auth.getUser();
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      actorUserId = userData.user.id;
    } else {
      actorUserId = payload.user_id ?? null;
    }

    const evaluation = evaluateScan({
      ...payload,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    });

    const serviceClient = createClient(
      supabaseUrl,
      serviceRoleJwt ?? serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: scanRow, error: insertError } = await serviceClient
      .from("file_security_scans")
      .insert({
        user_id: actorUserId,
        file_name: fileName,
        file_size: fileSize || null,
        file_type: fileType || null,
        storage_bucket: payload.storage_bucket ?? null,
        storage_path: payload.storage_path ?? null,
        sha256: payload.file_hash_sha256 ?? null,
        scan_engine: "edge-heuristic-v1",
        scan_status: evaluation.status,
        risk_score: evaluation.risk_score,
        detection_summary: evaluation.reasons.join(" "),
        scan_metadata: {
          reasons: evaluation.reasons,
          context: payload.context ?? null,
          sample_bytes_length: payload.sample_base64
            ? decodeBase64Sample(payload.sample_base64).length
            : 0,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to persist file scan:", insertError);
    }

    return new Response(
      JSON.stringify({
        safe: evaluation.safe,
        status: evaluation.status,
        risk_score: evaluation.risk_score,
        message: evaluation.message,
        reasons: evaluation.reasons,
        scan_id: scanRow?.id ?? null,
      }),
      {
        status: evaluation.safe ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("scan-file error:", error);
    return new Response(
      JSON.stringify({
        safe: false,
        status: "error",
        risk_score: 100,
        message:
          error instanceof Error ? error.message : "Unexpected scan error",
        reasons: ["Scan service failure."],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
