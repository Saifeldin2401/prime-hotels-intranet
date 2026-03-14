import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr', 'es', 'de', 'ru', 'tr', 'ur', 'hi', 'bn', 'id', 'tl'] as const
const MAX_FILE_BYTES = 12 * 1024 * 1024

const getSupabaseHost = () => {
    const url = Deno.env.get('SUPABASE_URL') || ''
    try {
        return new URL(url).host
    } catch {
        return ''
    }
}

const isAllowedFileUrl = (value: string): boolean => {
    try {
        const parsed = new URL(value)
        if (parsed.protocol !== 'https:') return false

        const supabaseHost = getSupabaseHost()
        if (supabaseHost && parsed.host === supabaseHost) return true

        return false
    } catch {
        return false
    }
}

const resolveFileExtension = (value: string): string => {
    try {
        const parsed = new URL(value)
        const parts = parsed.pathname.split('.')
        return (parts.pop() || '').toLowerCase()
    } catch {
        return ''
    }
}

const assertFileSize = async (url: string) => {
    try {
        const head = await fetch(url, { method: 'HEAD' })
        const length = head.headers.get('content-length')
        if (length) {
            const size = Number(length)
            if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
                throw new Error('File exceeds translation size limit.')
            }
        }
    } catch {
        // Ignore HEAD failures; size will be checked after download.
    }
}

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    ar: 'Arabic',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    ru: 'Russian',
    tr: 'Turkish',
    ur: 'Urdu',
    hi: 'Hindi',
    bn: 'Bengali',
    id: 'Indonesian',
    tl: 'Filipino',
}

const LANGUAGE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
    Object.entries(LANGUAGE_NAMES).map(([code, name]) => [name.toLowerCase(), code])
)

const normalizeLangInput = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const lower = trimmed.toLowerCase()
    if (lower === 'auto') return 'auto'
    if (SUPPORTED_LANGUAGES.includes(lower as typeof SUPPORTED_LANGUAGES[number])) {
        return lower
    }
    const stripped = lower.replace(/\(.*\)/, '').trim()
    return LANGUAGE_NAME_TO_CODE[stripped]
}

const detectLanguage = (value: string) => {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    return arabicPattern.test(value) ? 'ar' : 'en'
}

const chunkText = (value: string, size: number) => value.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [value]

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('')

const sha256Hex = async (value: string) => {
    const bytes = new TextEncoder().encode(value)
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return toHex(hash)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const withConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) => {
    const results = new Array<R>(items.length)
    let nextIndex = 0

    const worker = async () => {
        while (true) {
            const index = nextIndex
            nextIndex += 1
            if (index >= items.length) return
            results[index] = await fn(items[index])
        }
    }

    const effectiveLimit = Math.max(1, Math.min(limit, items.length || 1))
    await Promise.all(new Array(effectiveLimit).fill(0).map(() => worker()))
    return results
}

const sanitizeTranslation = (value: string, targetLang: string) => {
    let sanitized = value
    if (targetLang === 'ar' || targetLang === 'ur') {
        sanitized = sanitized.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF]/g, '')
    }
    return sanitized.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const hfToken = Deno.env.get('HUGGINGFACE_TOKEN') ?? ''
        const hfRouterUrl = 'https://router.huggingface.co/v1/chat/completions'
        const hfModel = Deno.env.get('HF_TRANSLATION_MODEL') || 'Qwen/Qwen2.5-7B-Instruct'

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const body = await req.json()
        const rawTargetLang = body?.target_lang ?? body?.targetLanguage
        const rawSourceLang = body?.source_lang ?? body?.sourceLanguage
        const target_lang = normalizeLangInput(rawTargetLang)
        const providedSourceLang = normalizeLangInput(rawSourceLang)
        const file_url = body?.file_url ?? body?.fileUrl
        const file_type = body?.file_type ?? body?.fileType
        let text = typeof body.text === 'string' ? body.text : undefined
        let texts: string[] = Array.isArray(body.texts)
            ? body.texts.map((item: unknown) => typeof item === 'string' ? item : '')
            : []

        if (!target_lang || target_lang === 'auto') {
            throw new Error(`Unsupported target language: ${rawTargetLang ?? ''}`)
        }

        if (!SUPPORTED_LANGUAGES.includes(target_lang)) {
            throw new Error(`Unsupported target language: ${rawTargetLang ?? target_lang}`)
        }

        if (rawSourceLang && (!providedSourceLang || (providedSourceLang !== 'auto' && !SUPPORTED_LANGUAGES.includes(providedSourceLang)))) {
            throw new Error(`Unsupported source language: ${rawSourceLang}`)
        }

        if (file_url) {
            if (!isAllowedFileUrl(file_url)) {
                throw new Error('File URL is not allowed for translation.')
            }
            await assertFileSize(file_url)
            if (!text && texts.length === 0) {
                console.log('Fetching file for extraction:', file_url)
                const fileRes = await fetch(file_url)
                if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.statusText}`)
                const blob = await fileRes.blob()
                const arrayBuffer = await blob.arrayBuffer()
                if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
                    throw new Error('File exceeds translation size limit.')
                }

                const extension = resolveFileExtension(file_url)
                if (file_type === 'pdf' || extension === 'pdf') {
                    const { extractText } = await import('https://esm.sh/unpdf@0.10.0')
                    const { text: extractedText } = await extractText(arrayBuffer)
                    text = extractedText.join(' ')
                } else if (file_type === 'docx' || extension === 'docx') {
                    const mammoth = await import('https://esm.sh/mammoth@1.6.0')
                    const result = await mammoth.extractRawText({ arrayBuffer })
                    text = result.value
                } else {
                    throw new Error('Unsupported file type for extraction')
                }
                console.log('Extraction successful, text length:', text?.length)
            }

            if (text && texts.length === 0) {
                texts = [text]
            }
        } else if (text && texts.length === 0) {
            texts = [text]
        }

        if (texts.length === 0) {
            return new Response(JSON.stringify({
                translated_text: '',
                translated_texts: [],
                success: true,
                source_lang: providedSourceLang || 'auto',
                target_lang
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const results = new Array<string>(texts.length).fill('')
        const toTranslate: Array<{
            index: number
            text: string
            sourceLang: string
            textHash: string
        }> = []
        let resolvedSourceLang = providedSourceLang || 'auto'

        const chunkSize = Number(Deno.env.get('TRANSLATION_CHUNK_CHARS') || 3200)
        const translationConcurrency = Number(Deno.env.get('TRANSLATION_CONCURRENCY') || 3)
        const chunkConcurrency = Number(Deno.env.get('TRANSLATION_CHUNK_CONCURRENCY') || 2)
        const batchChunksPerRequest = Number(Deno.env.get('TRANSLATION_BATCH_CHUNKS') || 4)

        for (let i = 0; i < texts.length; i++) {
            const value = texts[i] || ''

            if (!value.trim()) {
                results[i] = ''
                continue
            }

            const sourceLang = providedSourceLang && providedSourceLang !== 'auto'
                ? providedSourceLang
                : (detectLanguage(value) === 'ar' ? 'ar' : 'auto')

            if (resolvedSourceLang === 'auto') {
                resolvedSourceLang = sourceLang
            }

            if (sourceLang === target_lang) {
                results[i] = value
                continue
            }

            const textHash = await sha256Hex(value)
            toTranslate.push({ index: i, text: value, sourceLang, textHash })
        }

        if (toTranslate.length > 0) {
            const hashes = Array.from(new Set(toTranslate.map((item) => item.textHash)))
            const { data: cachedRows, error: cacheError } = await supabaseClient
                .from('translation_cache')
                .select('source_text_hash,translated_text')
                .in('source_text_hash', hashes)
                .eq('target_lang', target_lang)

            if (cacheError) {
                throw new Error(`Cache lookup failed: ${cacheError.message}`)
            }

            const cachedMap = new Map<string, string>()
            for (const row of cachedRows || []) {
                if (row?.source_text_hash && row?.translated_text) {
                    cachedMap.set(row.source_text_hash, row.translated_text)
                }
            }

            const remaining: typeof toTranslate = []
            for (const item of toTranslate) {
                const cached = cachedMap.get(item.textHash)
                if (cached) {
                    results[item.index] = cached
                } else {
                    remaining.push(item)
                }
            }

            toTranslate.length = 0
            toTranslate.push(...remaining)
        }

        if (toTranslate.length > 0) {
            if (!hfToken) {
                throw new Error('HUGGINGFACE_TOKEN is missing. Configure it in Supabase project secrets.')
            }

            const targetName = LANGUAGE_NAMES[target_lang] || target_lang

            const callHf = async (chunk: string, translationInstruction: string) => {
                const payload = {
                    model: hfModel,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional translator. ${translationInstruction} Preserve formatting and return only the translated text. Do not include any extra commentary or any language other than ${targetName}.`
                        },
                        { role: 'user', content: chunk }
                    ],
                    temperature: 0.2,
                    stream: false
                }

                const maxAttempts = 3
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    let hfResponse: Response
                    try {
                        hfResponse = await fetch(hfRouterUrl, {
                            headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                            method: 'POST',
                            body: JSON.stringify(payload),
                        })
                    } catch (fetchError: unknown) {
                        if (attempt >= maxAttempts) {
                            const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
                            throw new Error(`Hugging Face request failed: ${message}`)
                        }
                        await sleep(300 * attempt)
                        continue
                    }

                    const rawText = await hfResponse.text()
                    let hfResult: any = null
                    try {
                        hfResult = rawText ? JSON.parse(rawText) : null
                    } catch {
                        hfResult = rawText
                    }

                    if (!hfResponse.ok) {
                        const message = (hfResult && typeof hfResult === 'object' && (hfResult.error?.message || hfResult.error || hfResult.message)) || rawText || hfResponse.statusText
                        const retryable = hfResponse.status >= 500 || hfResponse.status === 429 || hfResponse.status === 408
                        if (retryable && attempt < maxAttempts) {
                            await sleep(400 * attempt)
                            continue
                        }
                        throw new Error(`Hugging Face HTTP ${hfResponse.status}: ${message}`)
                    }

                    if (hfResult?.error) {
                        if (typeof hfResult.error === 'string' && hfResult.error.includes('loading')) {
                            if (attempt < maxAttempts) {
                                await sleep(800 * attempt)
                                continue
                            }
                            throw new Error('Hugging Face model is loading. Retry in 20-30 seconds.')
                        }
                        if (hfResult.error?.message) {
                            throw new Error(`Hugging Face Error: ${hfResult.error.message}`)
                        }
                        throw new Error(`Hugging Face Error: ${hfResult.error}`)
                    }

                    const translatedChunkRaw = hfResult?.choices?.[0]?.message?.content?.trim() || ''
                    const translatedChunk = sanitizeTranslation(translatedChunkRaw, target_lang)
                    if (!translatedChunk) {
                        throw new Error('Hugging Face returned an empty translation.')
                    }
                    return translatedChunk
                }

                throw new Error('Translation failed after retries.')
            }

            const callHfBatch = async (chunks: string[], translationInstruction: string) => {
                const payload = {
                    model: hfModel,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional translator. ${translationInstruction} Preserve formatting and return only valid JSON. You must output a JSON array of strings. Each string is the translation of the corresponding input chunk. Do not add any extra keys or commentary.`
                        },
                        {
                            role: 'user',
                            content: JSON.stringify({ chunks, target_language: targetName })
                        }
                    ],
                    temperature: 0.2,
                    stream: false
                }

                const maxAttempts = 3
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    let hfResponse: Response
                    try {
                        hfResponse = await fetch(hfRouterUrl, {
                            headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                            method: 'POST',
                            body: JSON.stringify(payload),
                        })
                    } catch (fetchError: unknown) {
                        if (attempt >= maxAttempts) {
                            const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
                            throw new Error(`Hugging Face request failed: ${message}`)
                        }
                        await sleep(300 * attempt)
                        continue
                    }

                    const rawText = await hfResponse.text()
                    let hfResult: any = null
                    try {
                        hfResult = rawText ? JSON.parse(rawText) : null
                    } catch {
                        hfResult = rawText
                    }

                    if (!hfResponse.ok) {
                        const message = (hfResult && typeof hfResult === 'object' && (hfResult.error?.message || hfResult.error || hfResult.message)) || rawText || hfResponse.statusText
                        const retryable = hfResponse.status >= 500 || hfResponse.status === 429 || hfResponse.status === 408
                        if (retryable && attempt < maxAttempts) {
                            await sleep(400 * attempt)
                            continue
                        }
                        throw new Error(`Hugging Face HTTP ${hfResponse.status}: ${message}`)
                    }

                    if (hfResult?.error) {
                        if (typeof hfResult.error === 'string' && hfResult.error.includes('loading')) {
                            if (attempt < maxAttempts) {
                                await sleep(800 * attempt)
                                continue
                            }
                            throw new Error('Hugging Face model is loading. Retry in 20-30 seconds.')
                        }
                        if (hfResult.error?.message) {
                            throw new Error(`Hugging Face Error: ${hfResult.error.message}`)
                        }
                        throw new Error(`Hugging Face Error: ${hfResult.error}`)
                    }

                    const content = hfResult?.choices?.[0]?.message?.content?.trim() || ''
                    try {
                        const parsed = JSON.parse(content)
                        if (!Array.isArray(parsed) || parsed.length !== chunks.length) {
                            throw new Error('Invalid JSON array shape')
                        }
                        const out = parsed.map((item: unknown) => sanitizeTranslation(String(item ?? ''), target_lang))
                        if (out.some((v) => !v)) {
                            throw new Error('Empty translation in batch')
                        }
                        return out
                    } catch {
                        if (attempt < maxAttempts) {
                            await sleep(350 * attempt)
                            continue
                        }
                        throw new Error('Hugging Face returned invalid JSON for batch translation.')
                    }
                }

                throw new Error('Batch translation failed after retries.')
            }

            const translateItem = async (item: { index: number; text: string; sourceLang: string; textHash: string }) => {
                const sourceName = item.sourceLang === 'auto'
                    ? 'the detected source language'
                    : (LANGUAGE_NAMES[item.sourceLang] || item.sourceLang)
                const translationInstruction = item.sourceLang === 'auto'
                    ? `Detect the source language and translate to ${targetName}.`
                    : `Translate from ${sourceName} to ${targetName}.`

                const chunks = chunkText(item.text, chunkSize)
                const effectiveBatchSize = Number.isFinite(batchChunksPerRequest) && batchChunksPerRequest > 1
                    ? Math.min(Math.floor(batchChunksPerRequest), 10)
                    : 1

                const batches: string[][] = []
                for (let i = 0; i < chunks.length; i += effectiveBatchSize) {
                    batches.push(chunks.slice(i, i + effectiveBatchSize))
                }

                let translatedChunks: string[] = []
                if (effectiveBatchSize > 1 && batches.length > 0) {
                    try {
                        const translatedBatches = await withConcurrency(
                            batches,
                            chunkConcurrency,
                            (batch) => callHfBatch(batch, translationInstruction)
                        )
                        translatedChunks = translatedBatches.flat()
                    } catch {
                        translatedChunks = await withConcurrency(chunks, chunkConcurrency, (chunk) => callHf(chunk, translationInstruction))
                    }
                } else {
                    translatedChunks = await withConcurrency(chunks, chunkConcurrency, (chunk) => callHf(chunk, translationInstruction))
                }

                const translatedText = translatedChunks.join('')

                results[item.index] = translatedText

                const { error: cacheInsertError } = await supabaseClient
                    .from('translation_cache')
                    .upsert({
                        source_text_hash: item.textHash,
                        source_lang: item.sourceLang,
                        target_lang,
                        translated_text: translatedText,
                        model_id: hfModel
                    }, { onConflict: 'source_text_hash,target_lang' })

                if (cacheInsertError) {
                    console.warn('Translation cache write failed:', cacheInsertError.message)
                }
            }

            await withConcurrency(toTranslate, translationConcurrency, translateItem)
        }

        return new Response(JSON.stringify({
            translated_text: results[0] || '',
            translated_texts: results,
            success: true,
            source_lang: resolvedSourceLang,
            target_lang
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        const stack = error instanceof Error ? error.stack : undefined
        console.error('Edge Function Error:', message)
        return new Response(JSON.stringify({
            error: message,
            success: false,
            details: stack
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})



