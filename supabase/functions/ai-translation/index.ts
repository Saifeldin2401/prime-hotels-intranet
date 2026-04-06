import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPPORTED_LANGUAGES = [
  "en",
  "ar",
  "fr",
  "es",
  "de",
  "ru",
  "tr",
  "ur",
  "hi",
  "bn",
  "id",
  "tl",
] as const;
const MAX_FILE_BYTES = 12 * 1024 * 1024;

const getSupabaseHost = () => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

const isAllowedFileUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;

    const supabaseHost = getSupabaseHost();
    if (supabaseHost && parsed.host === supabaseHost) return true;

    return false;
  } catch {
    return false;
  }
};

const resolveFileExtension = (value: string): string => {
  try {
    const parsed = new URL(value);
    const parts = parsed.pathname.split(".");
    return (parts.pop() || "").toLowerCase();
  } catch {
    return "";
  }
};

const assertFileSize = async (url: string) => {
  try {
    const head = await fetch(url, { method: "HEAD" });
    const length = head.headers.get("content-length");
    if (length) {
      const size = Number(length);
      if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
        throw new Error("File exceeds translation size limit.");
      }
    }
  } catch {
    // Ignore HEAD failures; size will be checked after download.
  }
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  de: "German",
  ru: "Russian",
  tr: "Turkish",
  ur: "Urdu",
  hi: "Hindi",
  bn: "Bengali",
  id: "Indonesian",
  tl: "Filipino",
};

const LANGUAGE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGE_NAMES).map(([code, name]) => [
    name.toLowerCase(),
    code,
  ]),
);

const normalizeLangInput = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "auto") return "auto";
  if (
    SUPPORTED_LANGUAGES.includes(lower as (typeof SUPPORTED_LANGUAGES)[number])
  ) {
    return lower;
  }
  const stripped = lower.replace(/\(.*\)/, "").trim();
  return LANGUAGE_NAME_TO_CODE[stripped];
};

const detectLanguage = (value: string) => {
  const arabicPattern =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(value) ? "ar" : "en";
};

const hasTranslatableText = (value: string) =>
  /[A-Za-z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F]/.test(
    value,
  );

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

type ScriptKey = "latin" | "arabic" | "cyrillic" | "devanagari" | "bengali";

const SCRIPT_PATTERNS: Record<ScriptKey, RegExp> = {
  latin: /[A-Za-z\u00C0-\u024F]/g,
  arabic:
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
  cyrillic: /[\u0400-\u04FF]/g,
  devanagari: /[\u0900-\u097F]/g,
  bengali: /[\u0980-\u09FF]/g,
};

const TARGET_PRIMARY_SCRIPT: Record<string, ScriptKey> = {
  en: "latin",
  fr: "latin",
  es: "latin",
  de: "latin",
  tr: "latin",
  id: "latin",
  tl: "latin",
  ar: "arabic",
  ur: "arabic",
  ru: "cyrillic",
  hi: "devanagari",
  bn: "bengali",
};

const countMatches = (value: string, pattern: RegExp) => {
  const matcher = new RegExp(pattern.source, pattern.flags);
  return (value.match(matcher) || []).length;
};

const getScriptCounts = (value: string): Record<ScriptKey, number> => ({
  latin: countMatches(value, SCRIPT_PATTERNS.latin),
  arabic: countMatches(value, SCRIPT_PATTERNS.arabic),
  cyrillic: countMatches(value, SCRIPT_PATTERNS.cyrillic),
  devanagari: countMatches(value, SCRIPT_PATTERNS.devanagari),
  bengali: countMatches(value, SCRIPT_PATTERNS.bengali),
});

const normalizeComparisonText = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeComparisonText = (value: string) =>
  normalizeComparisonText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

const calculateTokenOverlapRatio = (source: string, translated: string) => {
  const sourceTokens = tokenizeComparisonText(source);
  if (sourceTokens.length === 0) return 0;

  const translatedTokenSet = new Set(tokenizeComparisonText(translated));
  const overlapCount = sourceTokens.filter((token) =>
    translatedTokenSet.has(token),
  ).length;
  return overlapCount / sourceTokens.length;
};

const assessTranslationQuality = (
  source: string,
  translated: string,
  targetLang: string,
  strictTargetOnly: boolean,
) => {
  const normalizedSource = normalizeComparisonText(source);
  const normalizedTranslated = normalizeComparisonText(translated);

  if (!normalizedTranslated) {
    return "Translation returned empty text.";
  }

  const sourceTokens = tokenizeComparisonText(source);
  if (sourceTokens.length >= 5 && normalizedSource === normalizedTranslated) {
    return "Translation matched the source text instead of translating it.";
  }

  const overlapRatio = calculateTokenOverlapRatio(source, translated);
  const overlapThreshold = strictTargetOnly ? 0.72 : 0.86;
  if (sourceTokens.length >= 6 && overlapRatio >= overlapThreshold) {
    return "Translation still contains too much of the original source text.";
  }

  if (!strictTargetOnly) {
    return null;
  }

  const targetScript = TARGET_PRIMARY_SCRIPT[targetLang];
  if (!targetScript) {
    return null;
  }

  const translatedScriptCounts = getScriptCounts(translated);
  const sourceScriptCounts = getScriptCounts(source);
  const totalTranslatedScriptChars = Object.values(
    translatedScriptCounts,
  ).reduce((sum, count) => sum + count, 0);

  if (totalTranslatedScriptChars < 8) {
    return null;
  }

  if (targetScript === "latin") {
    const nonLatinSourceChars =
      translatedScriptCounts.arabic +
      translatedScriptCounts.cyrillic +
      translatedScriptCounts.devanagari +
      translatedScriptCounts.bengali;

    if (nonLatinSourceChars > Math.floor(totalTranslatedScriptChars * 0.45)) {
      return "Translation still contains substantial source-language script.";
    }

    return null;
  }

  const targetScriptChars = translatedScriptCounts[targetScript];
  const latinChars = translatedScriptCounts.latin;

  if (
    targetScriptChars <
      Math.max(3, Math.floor(totalTranslatedScriptChars * 0.25)) &&
    sourceScriptCounts[targetScript] < 2
  ) {
    return "Translation did not sufficiently switch into the target language script.";
  }

  if (
    latinChars > targetScriptChars &&
    sourceScriptCounts.latin > sourceScriptCounts[targetScript]
  ) {
    return "Translation still contains too much source-language text.";
  }

  return null;
};

const chunkText = (value: string, size: number) => {
  const safeSize = Math.max(400, Math.floor(size || 3200));
  const chunks: string[] = [];
  let remaining = value;

  while (remaining.length > safeSize) {
    const slice = remaining.slice(0, safeSize);
    const candidates = [
      slice.lastIndexOf("\n\n"),
      slice.lastIndexOf("\n"),
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("؟ "),
      slice.lastIndexOf(" "),
    ].filter((index) => index >= Math.floor(safeSize * 0.5));

    const breakIndex = candidates.length > 0 ? Math.max(...candidates) : -1;
    const cutIndex = breakIndex >= 0 ? breakIndex + 1 : safeSize;

    chunks.push(remaining.slice(0, cutIndex));
    remaining = remaining.slice(cutIndex);
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks.length > 0 ? chunks : [value];
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(hash);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isQuotaOrCreditsError = (status: number, message: string) => {
  const msg = (message || "").toLowerCase();
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("credit") ||
    msg.includes("credits") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("payment required") ||
    msg.includes("depleted") ||
    msg.includes("exhausted") ||
    msg.includes("limit reached")
  );
};

const isRetryableUpstreamError = (status: number, message: string) => {
  const msg = (message || "").toLowerCase();
  return (
    status >= 500 ||
    status === 429 ||
    status === 408 ||
    msg.includes("502 bad gateway") ||
    msg.includes("503 service unavailable") ||
    msg.includes("504 gateway timeout") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("upstream") ||
    msg.includes("connection reset") ||
    msg.includes("network error")
  );
};

const withConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  };

  const safeLimit = Number.isFinite(limit) && !Number.isNaN(limit) ? limit : 1;
  const effectiveLimit = Math.max(
    1,
    Math.floor(Math.min(safeLimit, items.length || 1)),
  );
  await Promise.all(new Array(effectiveLimit).fill(0).map(() => worker()));
  return results;
};

const sanitizeTranslation = (value: string, targetLang: string) => {
  let sanitized = value;
  if (targetLang === "ar" || targetLang === "ur") {
    sanitized = sanitized.replace(
      /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF]/g,
      "",
    );
  }
  return sanitized
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const preserveEdgeWhitespace = (original: string, translated: string) => {
  const leading = original.match(/^\s+/)?.[0] || "";
  const trailing = original.match(/\s+$/)?.[0] || "";
  const core = translated.trim();
  return `${leading}${core}${trailing}`;
};

type PreparedPlainInput = {
  kind: "plain";
  original: string;
};

type PreparedHtmlPart = {
  kind: "markup" | "text";
  value: string;
  slot?: number;
};

type PreparedHtmlInput = {
  kind: "html";
  original: string;
  parts: PreparedHtmlPart[];
  segments: string[];
};

type PreparedInput = PreparedPlainInput | PreparedHtmlInput;

const prepareInput = (
  value: string,
  preserveFormat: boolean,
): PreparedInput => {
  if (!preserveFormat || !looksLikeHtml(value)) {
    return { kind: "plain", original: value };
  }

  const tokens = value.split(/(<[^>]+>)/g).filter((token) => token.length > 0);
  const parts: PreparedHtmlPart[] = [];
  const segments: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("<") && token.endsWith(">")) {
      parts.push({ kind: "markup", value: token });
      continue;
    }

    if (!hasTranslatableText(token)) {
      parts.push({ kind: "text", value: token });
      continue;
    }

    const slot = segments.length;
    segments.push(token);
    parts.push({ kind: "text", value: token, slot });
  }

  if (segments.length === 0) {
    return { kind: "plain", original: value };
  }

  return {
    kind: "html",
    original: value,
    parts,
    segments,
  };
};

const rebuildPreparedInput = (
  prepared: PreparedInput,
  translatedSegments?: string[],
) => {
  if (prepared.kind === "plain") {
    return translatedSegments?.[0] ?? prepared.original;
  }

  return prepared.parts
    .map((part) => {
      if (part.kind === "markup") {
        return part.value;
      }

      if (part.slot === undefined) {
        return part.value;
      }

      const original = prepared.segments[part.slot] || "";
      const translated = translatedSegments?.[part.slot] || original;
      return preserveEdgeWhitespace(original, translated);
    })
    .join("");
};

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const hfRouterUrl = "https://router.huggingface.co/v1/chat/completions";

    let hfToken = Deno.env.get("HUGGINGFACE_TOKEN") ?? "";
    let hfModel =
      Deno.env.get("HF_TRANSLATION_MODEL") || "Qwen/Qwen2.5-7B-Instruct";

    const minimaxToken = Deno.env.get("HUGGINGFACE_MINIMAX_TOKEN") ?? "";
    const minimaxModelId =
      Deno.env.get("HF_MINIMAX_MODEL_ID") || "MiniMaxAI/MiniMax-M2.5";
    const forceMinimax =
      (Deno.env.get("FORCE_MINIMAX") || "").toLowerCase() === "true";

    let usedFallback = false;

    if (forceMinimax && minimaxToken) {
      console.warn(
        "FORCE_MINIMAX enabled. Routing request using MiniMax token and model.",
      );
      hfToken = minimaxToken;
      hfModel = minimaxModelId;
      usedFallback = true;
    } else if (!hfToken && minimaxToken) {
      console.warn(
        "Primary HUGGINGFACE_TOKEN missing. Falling back to MiniMax token and model.",
      );
      hfToken = minimaxToken;
      hfModel = minimaxModelId;
      usedFallback = true;
    }

    console.log("API Strategy Configured:", {
      usingFallback: usedFallback,
      model: hfModel,
      hasPrimary: !!Deno.env.get("HUGGINGFACE_TOKEN"),
      hasMinimax: !!minimaxToken,
    });

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const rawTargetLang = body?.target_lang ?? body?.targetLanguage;
    const rawSourceLang = body?.source_lang ?? body?.sourceLanguage;
    const target_lang = normalizeLangInput(rawTargetLang);
    const providedSourceLang = normalizeLangInput(rawSourceLang);
    const preserve_format = Boolean(
      body?.preserve_format ?? body?.preserveFormat,
    );
    const strictTargetOnly = Boolean(
      body?.strict_target_only ?? body?.strictTargetOnly ?? preserve_format,
    );
    const file_url = body?.file_url ?? body?.fileUrl;
    const file_type = body?.file_type ?? body?.fileType;
    let text = typeof body.text === "string" ? body.text : undefined;
    let texts: string[] = Array.isArray(body.texts)
      ? body.texts.map((item: unknown) =>
          typeof item === "string" ? item : "",
        )
      : [];

    if (!target_lang || target_lang === "auto") {
      throw new Error(`Unsupported target language: ${rawTargetLang ?? ""}`);
    }

    if (!SUPPORTED_LANGUAGES.includes(target_lang)) {
      throw new Error(
        `Unsupported target language: ${rawTargetLang ?? target_lang}`,
      );
    }

    if (
      rawSourceLang &&
      (!providedSourceLang ||
        (providedSourceLang !== "auto" &&
          !SUPPORTED_LANGUAGES.includes(providedSourceLang)))
    ) {
      throw new Error(`Unsupported source language: ${rawSourceLang}`);
    }

    if (file_url) {
      if (!isAllowedFileUrl(file_url)) {
        throw new Error("File URL is not allowed for translation.");
      }
      await assertFileSize(file_url);
      if (!text && texts.length === 0) {
        console.log("Fetching file for extraction:", file_url);
        const fileRes = await fetch(file_url);
        if (!fileRes.ok)
          throw new Error(`Failed to fetch file: ${fileRes.statusText}`);
        const blob = await fileRes.blob();
        const arrayBuffer = await blob.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
          throw new Error("File exceeds translation size limit.");
        }

        const extension = resolveFileExtension(file_url);
        if (file_type === "pdf" || extension === "pdf") {
          const { extractText } = await import("https://esm.sh/unpdf@0.10.0");
          const { text: extractedText } = await extractText(arrayBuffer);
          text = extractedText.join(" ");
        } else if (file_type === "docx" || extension === "docx") {
          const mammoth = await import("https://esm.sh/mammoth@1.6.0");
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          throw new Error("Unsupported file type for extraction");
        }
        console.log("Extraction successful, text length:", text?.length);
      }

      if (text && texts.length === 0) {
        texts = [text];
      }
    } else if (text && texts.length === 0) {
      texts = [text];
    }

    if (texts.length === 0) {
      return new Response(
        JSON.stringify({
          translated_text: "",
          translated_texts: [],
          success: true,
          source_lang: providedSourceLang || "auto",
          target_lang,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const preparedInputs = texts.map((value) =>
      prepareInput(value || "", preserve_format),
    );
    const htmlSegmentResults = preparedInputs.map((prepared) =>
      prepared.kind === "html"
        ? new Array<string>(prepared.segments.length).fill("")
        : null,
    );
    const results = new Array<string>(texts.length).fill("");
    const toTranslate: Array<{
      index: number;
      segmentIndex?: number;
      text: string;
      sourceLang: string;
      textHash: string;
    }> = [];
    const partialFailures: Array<{
      index: number;
      segmentIndex?: number;
      reason: string;
    }> = [];
    let totalTranslatableSegments = 0;
    let resolvedSourceLang = providedSourceLang || "auto";

    const getIntEnv = (key, def) => {
      const str = Deno.env.get(key) || "";
      if (!str.trim()) return def;
      const n = Number(str);
      return Number.isFinite(n) && !Number.isNaN(n) ? Math.floor(n) : def;
    };

    const chunkSize = getIntEnv("TRANSLATION_CHUNK_CHARS", 1200);
    const translationConcurrency = getIntEnv("TRANSLATION_CONCURRENCY", 2);
    const chunkConcurrency = getIntEnv("TRANSLATION_CHUNK_CONCURRENCY", 1);
    const batchChunksPerRequest = getIntEnv("TRANSLATION_BATCH_CHUNKS", 1);

    for (let i = 0; i < preparedInputs.length; i++) {
      const prepared = preparedInputs[i];
      const segments =
        prepared.kind === "html" ? prepared.segments : [prepared.original];

      if (segments.length === 0) {
        results[i] = "";
        continue;
      }

      for (
        let segmentIndex = 0;
        segmentIndex < segments.length;
        segmentIndex++
      ) {
        const value = segments[segmentIndex] || "";

        if (!value.trim() || !hasTranslatableText(value)) {
          if (prepared.kind === "html") {
            htmlSegmentResults[i]![segmentIndex] = value;
          } else {
            results[i] = value;
          }
          continue;
        }

        const sourceLang =
          providedSourceLang && providedSourceLang !== "auto"
            ? providedSourceLang
            : detectLanguage(value) === "ar"
              ? "ar"
              : "auto";

        if (resolvedSourceLang === "auto") {
          resolvedSourceLang = sourceLang;
        }

        if (sourceLang === target_lang) {
          if (prepared.kind === "html") {
            htmlSegmentResults[i]![segmentIndex] = value;
          } else {
            results[i] = value;
          }
          continue;
        }

        const textHash = await sha256Hex(value);
        totalTranslatableSegments += 1;
        toTranslate.push({
          index: i,
          segmentIndex: prepared.kind === "html" ? segmentIndex : undefined,
          text: value,
          sourceLang,
          textHash,
        });
      }
    }

    if (toTranslate.length > 0) {
      const hashes = Array.from(
        new Set(toTranslate.map((item) => item.textHash)),
      );
      const { data: cachedRows, error: cacheError } = await supabaseClient
        .from("translation_cache")
        .select("source_text_hash,translated_text")
        .in("source_text_hash", hashes)
        .eq("target_lang", target_lang);

      if (cacheError) {
        console.warn("Translation cache lookup failed:", cacheError.message);
      }

      const cachedMap = new Map<string, string>();
      for (const row of cachedRows || []) {
        if (row?.source_text_hash && row?.translated_text) {
          cachedMap.set(row.source_text_hash, row.translated_text);
        }
      }

      const remaining: typeof toTranslate = [];
      for (const item of toTranslate) {
        const cached = cachedMap.get(item.textHash);
        if (cached) {
          const cachedQualityIssue = assessTranslationQuality(
            item.text,
            cached,
            target_lang,
            strictTargetOnly,
          );
          if (!cachedQualityIssue) {
            if (item.segmentIndex === undefined) {
              results[item.index] = cached;
            } else {
              htmlSegmentResults[item.index]![item.segmentIndex] = cached;
            }
            continue;
          }
        } else {
          remaining.push(item);
          continue;
        }

        remaining.push(item);
      }

      toTranslate.length = 0;
      toTranslate.push(...remaining);
    }

    if (toTranslate.length > 0) {
      if (!hfToken) {
        throw new Error(
          "HUGGINGFACE_TOKEN is missing. Configure it in Supabase project secrets.",
        );
      }

      const targetName = LANGUAGE_NAMES[target_lang] || target_lang;

      const callHf = async (chunk: string, translationInstruction: string) => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const strictnessInstruction = strictTargetOnly
            ? `Translate every translatable phrase fully into ${targetName}. Return a monolingual ${targetName} result only. Do not repeat, quote, or append the source text. Keep only proper nouns, brand names, acronyms, and legal references in their original form when genuinely necessary.`
            : `Return only the translation in ${targetName}.`;
          const retryInstruction =
            attempt > 1
              ? "Your previous answer contained untranslated or mixed-language text. Fix it and return only the clean final translation."
              : "";
          const payload = {
            model: hfModel,
            messages: [
              {
                role: "system",
                content: `You are a professional translator. ${translationInstruction} ${strictnessInstruction} ${retryInstruction} Preserve formatting and return only the translated text. Do not include any extra commentary or any language other than ${targetName}.`,
              },
              { role: "user", content: chunk },
            ],
            temperature: 0.2,
            stream: false,
          };

          let hfResponse: Response;
          try {
            hfResponse = await fetch(hfRouterUrl, {
              headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify(payload),
            });
          } catch (fetchError: unknown) {
            if (attempt >= maxAttempts) {
              const message =
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError);
              throw new Error(`Hugging Face request failed: ${message}`);
            }
            await sleep(300 * attempt);
            continue;
          }

          const rawText = await hfResponse.text();
          let hfResult: any = null;
          try {
            hfResult = rawText ? JSON.parse(rawText) : null;
          } catch {
            hfResult = rawText;
          }

          if (!hfResponse.ok) {
            const message =
              (hfResult &&
                typeof hfResult === "object" &&
                (hfResult.error?.message ||
                  hfResult.error ||
                  hfResult.message)) ||
              rawText ||
              hfResponse.statusText;

            if (isQuotaOrCreditsError(hfResponse.status, message)) {
              console.warn(
                `Quota/Credit error detected (attempt ${attempt}): status=${hfResponse.status}, message="${message}"`,
              );
              if (!usedFallback && minimaxToken && minimaxToken !== hfToken) {
                console.warn("Falling back to MiniMax token and retrying.");
                hfToken = minimaxToken;
                hfModel = minimaxModelId;
                usedFallback = true;
                attempt = 0; // Reset attempt to retry immediately with new token
                await sleep(200);
                continue;
              } else {
                console.error("Fallback not possible or already used:", {
                  usedFallback,
                  hasMinimax: !!minimaxToken,
                });
              }
            }

            const retryable = isRetryableUpstreamError(
              hfResponse.status,
              message,
            );
            if (retryable && attempt < maxAttempts) {
              await sleep(400 * attempt);
              continue;
            }
            throw new Error(
              `Hugging Face HTTP ${hfResponse.status}: ${message}`,
            );
          }

          if (hfResult?.error) {
            if (
              typeof hfResult.error === "string" &&
              hfResult.error.includes("loading")
            ) {
              if (attempt < maxAttempts) {
                await sleep(800 * attempt);
                continue;
              }
              throw new Error(
                "Hugging Face model is loading. Retry in 20-30 seconds.",
              );
            }
            if (hfResult.error?.message) {
              throw new Error(`Hugging Face Error: ${hfResult.error.message}`);
            }
            throw new Error(`Hugging Face Error: ${hfResult.error}`);
          }

          const translatedChunkRaw =
            hfResult?.choices?.[0]?.message?.content?.trim() || "";
          const translatedChunk = sanitizeTranslation(
            translatedChunkRaw,
            target_lang,
          );
          if (!translatedChunk) {
            throw new Error("Hugging Face returned an empty translation.");
          }

          const qualityIssue = assessTranslationQuality(
            chunk,
            translatedChunk,
            target_lang,
            strictTargetOnly,
          );
          if (qualityIssue) {
            if (attempt < maxAttempts) {
              await sleep(250 * attempt);
              continue;
            }
            throw new Error(qualityIssue);
          }

          return translatedChunk;
        }

        throw new Error("Translation failed after retries.");
      };

      const callHfBatch = async (
        chunks: string[],
        translationInstruction: string,
      ) => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const strictnessInstruction = strictTargetOnly
            ? `Return only a clean monolingual ${targetName} translation for every chunk. Do not include the source text in the output unless a proper noun or acronym genuinely must stay unchanged.`
            : `Return only translated output in ${targetName}.`;
          const payload = {
            model: hfModel,
            messages: [
              {
                role: "system",
                content: `You are a professional translator. ${translationInstruction} ${strictnessInstruction} Preserve formatting and return only valid JSON. You must output a JSON array of strings. Each string is the translation of the corresponding input chunk. Do not add any extra keys or commentary.`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  chunks,
                  target_language: targetName,
                }),
              },
            ],
            temperature: 0.2,
            stream: false,
          };

          let hfResponse: Response;
          try {
            hfResponse = await fetch(hfRouterUrl, {
              headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify(payload),
            });
          } catch (fetchError: unknown) {
            if (attempt >= maxAttempts) {
              const message =
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError);
              throw new Error(`Hugging Face request failed: ${message}`);
            }
            await sleep(300 * attempt);
            continue;
          }

          const rawText = await hfResponse.text();
          let hfResult: any = null;
          try {
            hfResult = rawText ? JSON.parse(rawText) : null;
          } catch {
            hfResult = rawText;
          }

          if (!hfResponse.ok) {
            const message =
              (hfResult &&
                typeof hfResult === "object" &&
                (hfResult.error?.message ||
                  hfResult.error ||
                  hfResult.message)) ||
              rawText ||
              hfResponse.statusText;

            if (isQuotaOrCreditsError(hfResponse.status, message)) {
              console.warn(
                `Quota/Credit error detected in batch (attempt ${attempt}): status=${hfResponse.status}, message="${message}"`,
              );
              if (!usedFallback && minimaxToken && minimaxToken !== hfToken) {
                console.warn(
                  "Primary token quota/credits issue in batch. Falling back to MiniMax.",
                );
                hfToken = minimaxToken;
                hfModel = minimaxModelId;
                usedFallback = true;
                attempt = 0; // Reset attempt
                await sleep(200);
                continue;
              }
            }

            const retryable = isRetryableUpstreamError(
              hfResponse.status,
              message,
            );
            if (retryable && attempt < maxAttempts) {
              await sleep(400 * attempt);
              continue;
            }
            throw new Error(
              `Hugging Face HTTP ${hfResponse.status}: ${message}`,
            );
          }

          if (hfResult?.error) {
            if (
              typeof hfResult.error === "string" &&
              hfResult.error.includes("loading")
            ) {
              if (attempt < maxAttempts) {
                await sleep(800 * attempt);
                continue;
              }
              throw new Error(
                "Hugging Face model is loading. Retry in 20-30 seconds.",
              );
            }
            if (hfResult.error?.message) {
              throw new Error(`Hugging Face Error: ${hfResult.error.message}`);
            }
            throw new Error(`Hugging Face Error: ${hfResult.error}`);
          }

          const content =
            hfResult?.choices?.[0]?.message?.content?.trim() || "";
          try {
            const parsed = JSON.parse(content);
            if (!Array.isArray(parsed) || parsed.length !== chunks.length) {
              throw new Error("Invalid JSON array shape");
            }
            const out = parsed.map((item: unknown) =>
              sanitizeTranslation(String(item ?? ""), target_lang),
            );
            if (out.some((v) => !v)) {
              throw new Error("Empty translation in batch");
            }
            return out;
          } catch {
            if (attempt < maxAttempts) {
              await sleep(350 * attempt);
              continue;
            }
            throw new Error(
              "Hugging Face returned invalid JSON for batch translation.",
            );
          }
        }

        throw new Error("Batch translation failed after retries.");
      };

      const translateItem = async (item: {
        index: number;
        segmentIndex?: number;
        text: string;
        sourceLang: string;
        textHash: string;
      }) => {
        const sourceName =
          item.sourceLang === "auto"
            ? "the detected source language"
            : LANGUAGE_NAMES[item.sourceLang] || item.sourceLang;
        const translationInstruction =
          item.sourceLang === "auto"
            ? `Detect the source language and translate to ${targetName}.`
            : `Translate from ${sourceName} to ${targetName}.`;

        let translatedText = item.text;

        try {
          const chunks = chunkText(item.text, chunkSize);
          const effectiveBatchSize =
            Number.isFinite(batchChunksPerRequest) && batchChunksPerRequest > 1
              ? Math.min(Math.floor(batchChunksPerRequest), 10)
              : 1;

          const batches: string[][] = [];
          for (let i = 0; i < chunks.length; i += effectiveBatchSize) {
            batches.push(chunks.slice(i, i + effectiveBatchSize));
          }

          let translatedChunks: string[] = [];
          if (effectiveBatchSize > 1 && batches.length > 0) {
            try {
              const translatedBatches = await withConcurrency(
                batches,
                chunkConcurrency,
                (batch) => callHfBatch(batch, translationInstruction),
              );
              translatedChunks = translatedBatches.flat();
            } catch {
              translatedChunks = await withConcurrency(
                chunks,
                chunkConcurrency,
                (chunk) => callHf(chunk, translationInstruction),
              );
            }
          } else {
            translatedChunks = await withConcurrency(
              chunks,
              chunkConcurrency,
              (chunk) => callHf(chunk, translationInstruction),
            );
          }

          const candidate = translatedChunks.join("");
          if (candidate.trim()) {
            translatedText = candidate;
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          partialFailures.push({
            index: item.index,
            segmentIndex: item.segmentIndex,
            reason,
          });
          console.warn(
            "Translation segment failed; preserving original text for this segment.",
            {
              index: item.index,
              segmentIndex: item.segmentIndex,
              reason,
            },
          );
        }

        if (item.segmentIndex === undefined) {
          results[item.index] = translatedText;
        } else {
          htmlSegmentResults[item.index]![item.segmentIndex] = translatedText;
        }

        if (translatedText === item.text) {
          return;
        }

        const { error: cacheInsertError } = await supabaseClient
          .from("translation_cache")
          .upsert(
            {
              source_text_hash: item.textHash,
              source_lang: item.sourceLang,
              target_lang,
              translated_text: translatedText,
              model_id: hfModel,
            },
            { onConflict: "source_text_hash,target_lang" },
          );

        if (cacheInsertError) {
          console.warn(
            "Translation cache write failed:",
            cacheInsertError.message,
          );
        }
      };

      await withConcurrency(toTranslate, translationConcurrency, translateItem);
    }

    for (let i = 0; i < preparedInputs.length; i++) {
      const prepared = preparedInputs[i];
      if (prepared.kind === "html") {
        results[i] = rebuildPreparedInput(
          prepared,
          htmlSegmentResults[i] || prepared.segments,
        );
      } else if (!results[i]) {
        results[i] = prepared.original;
      }
    }

    return new Response(
      JSON.stringify({
        translated_text: results[0] || "",
        translated_texts: results,
        success: true,
        source_lang: resolvedSourceLang,
        target_lang,
        meta: {
          model_used: hfModel,
          used_fallback: usedFallback,
          partial_failures: partialFailures.length,
          failed_segments: partialFailures.length,
          total_segments: totalTranslatableSegments,
          translated_segments: Math.max(
            0,
            totalTranslatableSegments - partialFailures.length,
          ),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Edge Function Error:", message);
    return new Response(
      JSON.stringify({
        error: message,
        success: false,
        details: stack,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
