/**
 * ALTUS Multilingual Translation Service
 * 
 * Provides unified, cached, high-availability translation services across
 * Knowledge Base SOPs, Training Lessons, Assessments, and Operations.
 */

import { supabase } from '@/lib/supabase'
import { altusAI } from '@/lib/ai/client'
import { SUPPORTED_TRANSLATION_LANGUAGES, type TranslationTargetLanguage } from '@/hooks/useTranslationAI'

const memoryCache = new Map<string, string>()

function makeKey(text: string, lang: string): string {
  return `${lang}:::${text.trim()}`
}

export const translationService = {
  /**
   * Translate a single text string with Edge + Client fallback and caching
   */
  async translateText(
    text: string,
    targetLang: TranslationTargetLanguage,
    options?: { preserveFormat?: boolean }
  ): Promise<string> {
    if (!text || !text.trim()) return text

    const cacheKey = makeKey(text, targetLang)
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey)!
    }

    // Try Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('ai-translation', {
        body: {
          text,
          target_lang: targetLang,
          preserve_format: options?.preserveFormat ?? true,
        },
      })

      if (!error && data?.success && data.translated_text) {
        memoryCache.set(cacheKey, data.translated_text)
        return data.translated_text
      }
    } catch (edgeErr) {
      console.warn('Edge translation unavailable, using altusAI SDK:', edgeErr)
    }

    // Fallback to altusAI SDK
    const langObj = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLang)
    const translated = await altusAI.translateText(text, targetLang, langObj?.label || targetLang)
    if (translated) {
      memoryCache.set(cacheKey, translated)
    }
    return translated || text
  },

  /**
   * Translate an array of text strings in batch
   */
  async translateBatch(
    texts: string[],
    targetLang: TranslationTargetLanguage
  ): Promise<string[]> {
    if (!Array.isArray(texts) || texts.length === 0) return []

    // Check cache
    const uncachedIndices: number[] = []
    const results = new Array<string>(texts.length).fill('')

    texts.forEach((t, i) => {
      const key = makeKey(t, targetLang)
      if (memoryCache.has(key)) {
        results[i] = memoryCache.get(key)!
      } else if (t.trim()) {
        uncachedIndices.push(i)
      } else {
        results[i] = t
      }
    })

    if (uncachedIndices.length === 0) {
      return results
    }

    const toFetch = uncachedIndices.map((i) => texts[i])

    try {
      const { data, error } = await supabase.functions.invoke('ai-translation', {
        body: {
          texts: toFetch,
          target_lang: targetLang,
          preserve_format: true,
        },
      })

      if (!error && data?.success && Array.isArray(data.translated_texts)) {
        data.translated_texts.forEach((trans: string, idx: number) => {
          const originalIdx = uncachedIndices[idx]
          results[originalIdx] = trans
          memoryCache.set(makeKey(texts[originalIdx], targetLang), trans)
        })
        return results
      }
    } catch (edgeErr) {
      console.warn('Edge batch translation failed, engaging client fallback:', edgeErr)
    }

    // Fallback
    const langObj = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLang)
    const fallbackTranslations = await altusAI.translateBatch(toFetch, targetLang, langObj?.label || targetLang)
    fallbackTranslations.forEach((trans, idx) => {
      const originalIdx = uncachedIndices[idx]
      results[originalIdx] = trans
      memoryCache.set(makeKey(texts[originalIdx], targetLang), trans)
    })

    return results
  },

  /**
   * Clear in-memory translation cache if needed
   */
  clearCache(): void {
    memoryCache.clear()
  },
}
