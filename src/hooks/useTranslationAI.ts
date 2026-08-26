import { normalizeTranslationErrorMessage } from '@/lib/translationUtils'
import { altusAI } from '@/lib/ai/client'
import { useMutation } from '@tanstack/react-query'

export type TranslationTargetLanguage =
    | 'en'
    | 'ar'
    | 'fr'
    | 'es'
    | 'de'
    | 'ru'
    | 'tr'
    | 'ur'
    | 'hi'
    | 'bn'
    | 'id'
    | 'tl'

export type TranslationSourceLanguage = TranslationTargetLanguage | 'auto'

export const SUPPORTED_TRANSLATION_LANGUAGES: Array<{
    code: TranslationTargetLanguage
    label: string
    direction: 'ltr' | 'rtl'
}> = [
    { code: 'en', label: 'English', direction: 'ltr' },
    { code: 'ar', label: 'العربية (Arabic)', direction: 'rtl' },
    { code: 'ur', label: 'اردو (Urdu)', direction: 'rtl' },
    { code: 'hi', label: 'हिन्दी (Hindi)', direction: 'ltr' },
    { code: 'bn', label: 'বাংলা (Bengali)', direction: 'ltr' },
    { code: 'tl', label: 'Filipino (Tagalog)', direction: 'ltr' },
    { code: 'id', label: 'Bahasa Indonesia', direction: 'ltr' },
    { code: 'fr', label: 'Français (French)', direction: 'ltr' },
    { code: 'es', label: 'Español (Spanish)', direction: 'ltr' },
    { code: 'de', label: 'Deutsch (German)', direction: 'ltr' },
    { code: 'ru', label: 'Русский (Russian)', direction: 'ltr' },
    { code: 'tr', label: 'Türkçe (Turkish)', direction: 'ltr' }
]

export interface TranslationRequest {
    text?: string
    texts?: string[]
    file_url?: string
    file_type?: 'pdf' | 'docx'
    target_lang: TranslationTargetLanguage
    source_lang?: TranslationSourceLanguage
    preserve_format?: boolean
    strict_target_only?: boolean
}

export interface TranslationMeta {
    model_used?: string
    used_fallback?: boolean
    partial_failures?: number
    failed_segments?: number
    total_segments?: number
    translated_segments?: number
}

export interface TranslationResponse {
    translated_text?: string
    translated_texts?: string[]
    extracted_text?: string
    success: boolean
    source_lang: string
    target_lang: string
    cached?: boolean
    error?: string
    meta?: TranslationMeta
}

// In-memory LRU-like cache for ultra-fast instant rendering
const clientTranslationCache = new Map<string, string>()

function getCacheKey(text: string, targetLang: string): string {
    return `${targetLang}:::${text.trim()}`
}

export function useTranslationAI() {
    return useMutation({
        mutationFn: async (request: TranslationRequest): Promise<TranslationResponse> => {
            const {
                text = '',
                texts = [],
                target_lang,
                source_lang = 'auto',
            } = request

            const rawInputs = text ? [text] : texts
            if (rawInputs.length === 0) {
                return {
                    translated_text: '',
                    translated_texts: [],
                    success: true,
                    source_lang,
                    target_lang,
                }
            }

            // 1. Check in-memory cache first (sub-millisecond instant return)
            const allCached = rawInputs.every(t => clientTranslationCache.has(getCacheKey(t, target_lang)))
            if (allCached) {
                const cachedResults = rawInputs.map(t => clientTranslationCache.get(getCacheKey(t, target_lang)) || t)
                return {
                    translated_text: cachedResults[0] || '',
                    translated_texts: cachedResults,
                    success: true,
                    source_lang,
                    target_lang,
                    cached: true,
                    meta: {
                        model_used: 'client-memory-cache',
                        total_segments: rawInputs.length,
                        translated_segments: rawInputs.length,
                    }
                }
            }

            // 2. Primary: Execute via altusAI engine (OpenRouter / Gemini)
            try {
                const targetLangObj = SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === target_lang)
                const targetLangLabel = targetLangObj?.label || target_lang

                let translatedList: string[] = []
                if (rawInputs.length === 1) {
                    const single = await altusAI.translateText(rawInputs[0], target_lang, targetLangLabel)
                    translatedList = [single]
                } else {
                    translatedList = await altusAI.translateBatch(rawInputs, target_lang, targetLangLabel)
                }

                // Cache translated results in memory
                translatedList.forEach((trans, idx) => {
                    const original = rawInputs[idx]
                    if (original && trans) {
                        clientTranslationCache.set(getCacheKey(original, target_lang), trans)
                    }
                })

                return {
                    translated_text: translatedList[0] || '',
                    translated_texts: translatedList,
                    success: true,
                    source_lang,
                    target_lang,
                    meta: {
                        model_used: 'altusAI-openrouter',
                        used_fallback: false,
                        total_segments: rawInputs.length,
                        translated_segments: translatedList.length,
                    }
                }
            } catch (err) {
                console.error('Translation error:', err)
                const errMsg = err instanceof Error ? err.message : 'Translation service temporarily unavailable'
                throw new Error(normalizeTranslationErrorMessage(errMsg))
            }
        }
    })
}
