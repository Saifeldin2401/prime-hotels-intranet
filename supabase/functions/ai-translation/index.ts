import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "./_shared/cors.ts";

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

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "Arabic (العربية)",
  fr: "French (Français)",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  ru: "Russian (Русский)",
  tr: "Turkish (Türkçe)",
  ur: "Urdu (اردو)",
  hi: "Hindi (हिन्दी)",
  bn: "Bengali (বাংলা)",
  id: "Indonesian (Bahasa Indonesia)",
  tl: "Filipino (Tagalog)",
};

const LANGUAGE_NAME_TO_CODE: Record<string, SupportedLanguage> = {
  english: "en",
  arabic: "ar",
  french: "fr",
  spanish: "es",
  german: "de",
  russian: "ru",
  turkish: "tr",
  urdu: "ur",
  hindi: "hi",
  bengali: "bn",
  indonesian: "id",
  filipino: "tl",
  tagalog: "tl",
};

const normalizeLangInput = (value: unknown): SupportedLanguage | "auto" | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === "auto") return "auto";
  if (SUPPORTED_LANGUAGES.includes(trimmed as SupportedLanguage)) {
    return trimmed as SupportedLanguage;
  }
  const clean = trimmed.replace(/\(.*\)/, "").trim();
  return LANGUAGE_NAME_TO_CODE[clean];
};

const detectLanguage = (value: string): SupportedLanguage => {
  const arabicPattern = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
  const devanagariPattern = /[ऀ-ॿ]/;
  const bengaliPattern = /[ঀ-৿]/;
  const cyrillicPattern = /[Ѐ-ӿ]/;

  if (arabicPattern.test(value)) return "ar";
  if (devanagariPattern.test(value)) return "hi";
  if (bengaliPattern.test(value)) return "bn";
  if (cyrillicPattern.test(value)) return "ru";
  return "en";
};

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const sanitizeTranslation = (value: string, targetLang: string): string => {
  let sanitized = value;
  // Remove markdown code fence wrappers if AI outputs them around plain translations
  sanitized = sanitized.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "");
  if (targetLang === "ar" || targetLang === "ur") {
    // Remove stray CJK characters
    sanitized = sanitized.replace(
      /[㐀-䶿一-鿿豈-﫿぀-ヿㇰ-ㇿ]/g,
      ""
    );
  }
  return sanitized.trim();
};

const buildSystemPrompt = (targetLangName: string, targetLangCode: string): string => {
  return `You are the master multilingual hospitality translation engine for ALTUS Hospitality & Hotels (Saudi Arabia / KSA).
Your task is to translate hotel Standard Operating Procedures (SOPs), training curriculum, assessments, guest service guidelines, and corporate announcements into ${targetLangName} (${targetLangCode}).

CRITICAL TRANSLATION RULES:
1. Accuracy & Tone: Translate with flawless 5-star luxury hotel phrasing, professional hospitality terminology, and cultural etiquette appropriate for Saudi Arabia and international luxury standards.
2. Structure & Formatting Preservation:
   - PRESERVE all HTML tags (e.g. <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <tr>, <td>, etc.) exactly in place. Only translate the text inside the tags.
   - PRESERVE all markdown syntax (headers, bullets, bolding, numbered lists).
   - PRESERVE all placeholder codes (e.g. {{name}}, {count}, [ID], etc.) unchanged.
   - PRESERVE standard international abbreviations (e.g. VIP, SOP, PMS, POS, FIFO, HACCP, KSA, SAR, Wi-Fi) unless a standard regional term is required.
3. Monolingual Output: Return ONLY the translated text in ${targetLangName}. Do NOT include intro/outro conversational remarks, explanations, or quotes.`;
};

/**
 * Route the translation through the central AI gateway (process-ai-request) so
 * that ai_platform_config (free-only mode, enabled providers, disabled models),
 * shared usage/cost logging and retry/fallback all apply. This function no
 * longer talks to OpenRouter / Gemini directly.
 */
async function translateViaGateway(
  supabaseUrl: string,
  serviceRoleKey: string,
  text: string,
  targetLangName: string,
  targetLangCode: string
): Promise<{ text: string; model: string } | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        prompt: text,
        systemPrompt: buildSystemPrompt(targetLangName, targetLangCode),
        task: "translation",
        temperature: 0.2,
        max_tokens: 4096,
        jsonMode: false,
      }),
    });

    if (!response.ok) {
      console.warn(`process-ai-request translation failed with status ${response.status}`);
      return null;
    }

    const data = await response.json().catch(() => null);
    if (!data || data.success === false) {
      console.warn("process-ai-request translation returned no result:", data?.error);
      return null;
    }

    const translated = data.response ?? data.result;
    if (translated && typeof translated === "string" && translated.trim().length > 0) {
      return {
        text: sanitizeTranslation(translated, targetLangCode),
        model: data?.meta?.modelUsed || "gateway",
      };
    }
  } catch (err) {
    console.warn("process-ai-request translation threw error:", err);
  }

  return null;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    let {
      text = "",
      texts = [],
      target_lang: rawTargetLang,
      source_lang: rawSourceLang,
      preserve_format = true,
      strict_target_only = false,
    } = body;

    const target_lang = normalizeLangInput(rawTargetLang) as SupportedLanguage | undefined;
    const providedSourceLang = normalizeLangInput(rawSourceLang);

    if (!target_lang || target_lang === "auto") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported or missing target language: ${rawTargetLang ?? ""}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Normalize input to array of strings
    if (text && (!Array.isArray(texts) || texts.length === 0)) {
      texts = [text];
    } else if (!Array.isArray(texts)) {
      texts = [];
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
        }
      );
    }

    const targetName = LANGUAGE_NAMES[target_lang] || target_lang;

    const results = new Array<string>(texts.length).fill("");
    const toTranslate: Array<{
      index: number;
      text: string;
      sourceLang: string;
      textHash: string;
    }> = [];

    let resolvedSourceLang = providedSourceLang || "auto";

    // 1. Process inputs and check for identical source/target
    for (let i = 0; i < texts.length; i++) {
      const val = String(texts[i] ?? "");
      if (!val.trim()) {
        results[i] = val;
        continue;
      }

      const detected = detectLanguage(val);
      const sourceLang = providedSourceLang && providedSourceLang !== "auto" ? providedSourceLang : detected;
      if (resolvedSourceLang === "auto") {
        resolvedSourceLang = sourceLang;
      }

      if (sourceLang === target_lang) {
        results[i] = val;
        continue;
      }

      const textHash = await sha256Hex(val);
      toTranslate.push({
        index: i,
        text: val,
        sourceLang,
        textHash,
      });
    }

    // 2. Query Postgres translation cache
    if (toTranslate.length > 0) {
      const hashes = Array.from(new Set(toTranslate.map((item) => item.textHash)));
      try {
        const { data: cachedRows } = await supabaseClient
          .from("translation_cache")
          .select("source_text_hash, translated_text")
          .in("source_text_hash", hashes)
          .eq("target_lang", target_lang);

        if (cachedRows && cachedRows.length > 0) {
          const cachedMap = new Map<string, string>();
          for (const row of cachedRows) {
            if (row?.source_text_hash && row?.translated_text) {
              cachedMap.set(row.source_text_hash, row.translated_text);
            }
          }

          const remaining: typeof toTranslate = [];
          for (const item of toTranslate) {
            const cached = cachedMap.get(item.textHash);
            if (cached) {
              results[item.index] = cached;
            } else {
              remaining.push(item);
            }
          }
          toTranslate.length = 0;
          toTranslate.push(...remaining);
        }
      } catch (cacheErr) {
        console.warn("Translation cache check skipped:", cacheErr);
      }
    }

    let modelUsed = "cache";

    // 3. Translate remaining items concurrently via the central AI gateway
    if (toTranslate.length > 0) {
      await Promise.all(
        toTranslate.map(async (item) => {
          const translationResult = await translateViaGateway(
            supabaseUrl,
            serviceRoleKey,
            item.text,
            targetName,
            target_lang
          );

          if (translationResult) {
            results[item.index] = translationResult.text;
            modelUsed = translationResult.model;

            // Save to database cache asynchronously
            void supabaseClient
              .from("translation_cache")
              .upsert(
                {
                  source_text_hash: item.textHash,
                  source_lang: item.sourceLang,
                  target_lang,
                  translated_text: translationResult.text,
                  model_id: translationResult.model,
                },
                { onConflict: "source_text_hash,target_lang" }
              )
              .then(() => {});
          } else {
            // If the gateway fails, preserve original text as safe fallback
            results[item.index] = item.text;
            console.warn(`Translation failed for segment ${item.index}, returning source.`);
          }
        })
      );
    }

    return new Response(
      JSON.stringify({
        translated_text: results[0] || "",
        translated_texts: results,
        success: true,
        source_lang: resolvedSourceLang,
        target_lang,
        meta: {
          model_used: modelUsed,
          total_segments: texts.length,
          translated_segments: results.filter((r, idx) => r && r !== texts[idx]).length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Translation processing error";
    console.error("ai-translation Edge Function Error:", error);
    return new Response(
      JSON.stringify({
        error: message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
