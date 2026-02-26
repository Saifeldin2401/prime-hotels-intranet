import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr', 'es', 'de', 'ru', 'tr', 'ur', 'hi', 'bn', 'id', 'tl'] as const

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

const detectLanguage = (value: string) => {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    return arabicPattern.test(value) ? 'ar' : 'en'
}

const chunkText = (value: string, size: number) => value.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [value]

const sanitizeTranslation = (value: string, targetLang: string) => {
    let sanitized = value
    if (targetLang === 'ar' || targetLang === 'ur') {
        sanitized = sanitized.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF]/g, '')
    }
    return sanitized.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

serve(async (req) => {
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
        const { target_lang, source_lang: providedSourceLang, file_url } = body
        const file_type = body.file_type
        let text = typeof body.text === 'string' ? body.text : undefined
        let texts: string[] = Array.isArray(body.texts)
            ? body.texts.map((item: unknown) => typeof item === 'string' ? item : '')
            : []

        if (!SUPPORTED_LANGUAGES.includes(target_lang)) {
            throw new Error(`Unsupported target language: ${target_lang}`)
        }

        if (providedSourceLang && providedSourceLang !== 'auto' && !SUPPORTED_LANGUAGES.includes(providedSourceLang)) {
            throw new Error(`Unsupported source language: ${providedSourceLang}`)
        }

        if (file_url) {
            if (!text && texts.length === 0) {
                console.log('Fetching file for extraction:', file_url)
                const fileRes = await fetch(file_url)
                if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.statusText}`)
                const blob = await fileRes.blob()
                const arrayBuffer = await blob.arrayBuffer()

                if (file_type === 'pdf' || file_url.endsWith('.pdf')) {
                    const { extractText } = await import('https://esm.sh/unpdf@0.10.0')
                    const { text: extractedText } = await extractText(arrayBuffer)
                    text = extractedText.join(' ')
                } else if (file_type === 'docx' || file_url.endsWith('.docx')) {
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
        }> = []
        let resolvedSourceLang = providedSourceLang || 'auto'

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

            const textHash = btoa(unescape(encodeURIComponent(value.substring(0, 1000)))).substring(0, 128)
            const { data: cached, error: cacheError } = await supabaseClient
                .from('translation_cache')
                .select('translated_text')
                .eq('source_text_hash', textHash)
                .eq('target_lang', target_lang)
                .maybeSingle()

            if (cacheError) {
                throw new Error(`Cache lookup failed: ${cacheError.message}`)
            }

            if (cached?.translated_text) {
                results[i] = cached.translated_text
                continue
            }

            toTranslate.push({ index: i, text: value, sourceLang })
        }

        if (toTranslate.length > 0) {
            if (!hfToken) {
                throw new Error('HUGGINGFACE_TOKEN is missing. Configure it in Supabase project secrets.')
            }

            const targetName = LANGUAGE_NAMES[target_lang] || target_lang

            for (const item of toTranslate) {
                const sourceName = item.sourceLang === 'auto'
                    ? 'the detected source language'
                    : (LANGUAGE_NAMES[item.sourceLang] || item.sourceLang)
                const translationInstruction = item.sourceLang === 'auto'
                    ? `Detect the source language and translate to ${targetName}.`
                    : `Translate from ${sourceName} to ${targetName}.`

                const chunks = chunkText(item.text, 1200)
                let translatedText = ''

                for (const chunk of chunks) {
                    let hfResponse: Response
                    try {
                        hfResponse = await fetch(hfRouterUrl, {
                            headers: { Authorization: `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
                            method: 'POST',
                            body: JSON.stringify({
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
                            }),
                        })
                    } catch (fetchError: unknown) {
                        const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
                        throw new Error(`Hugging Face request failed: ${message}`)
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
                        throw new Error(`Hugging Face HTTP ${hfResponse.status}: ${message}`)
                    }

                    if (hfResult?.error) {
                        if (typeof hfResult.error === 'string' && hfResult.error.includes('loading')) {
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
                    translatedText += translatedChunk
                }

                results[item.index] = translatedText

                const textHash = btoa(unescape(encodeURIComponent(item.text.substring(0, 1000)))).substring(0, 128)
                const { error: cacheInsertError } = await supabaseClient
                    .from('translation_cache')
                    .upsert({
                        source_text_hash: textHash,
                        source_lang: item.sourceLang,
                        target_lang,
                        translated_text: translatedText,
                        model_id: hfModel
                    }, { onConflict: 'source_text_hash,target_lang' })

                if (cacheInsertError) {
                    console.warn('Translation cache write failed:', cacheInsertError.message)
                }
            }
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
