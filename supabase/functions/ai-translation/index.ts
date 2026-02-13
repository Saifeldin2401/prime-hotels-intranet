import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const hfToken = Deno.env.get('HUGGINGFACE_TOKEN') ?? ''

        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const body = await req.json()
        const { target_lang, source_lang: providedSourceLang, file_url } = body
        let text = body.text

        // 1. Text Extraction from File (if provided)
        const file_type = body.file_type
        if (file_url && !text) {
            console.log('Fetching file for extraction:', file_url)
            const fileRes = await fetch(file_url)
            if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.statusText}`)
            const blob = await fileRes.blob()
            const arrayBuffer = await blob.arrayBuffer()

            if (file_type === 'pdf' || file_url.endsWith('.pdf')) {
                // Use unpdf for serverless-optimized extraction
                const { extractText } = await import('https://esm.sh/unpdf@0.10.0')
                const { text: extractedText } = await extractText(arrayBuffer)
                text = extractedText.join(' ')
            } else if (file_type === 'docx' || file_url.endsWith('.docx')) {
                // Mammoth for DOCX
                const mammoth = await import('https://esm.sh/mammoth@1.6.0')
                const result = await mammoth.extractRawText({ arrayBuffer })
                text = result.value
            } else {
                throw new Error('Unsupported file type for extraction')
            }
            console.log('Extraction successful, text length:', text?.length)
        }

        if (text === '') {
            return new Response(JSON.stringify({ translated_text: '', success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (!text) {
            throw new Error('Missing text for translation')
        }

        // 1. Language Detection Heuristic
        const detectLanguage = (str: string) => {
            const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
            return arabicPattern.test(str) ? 'ar' : 'en'
        }

        const supportedLangs = ['en', 'ar', 'fr', 'es', 'de', 'ru', 'tr', 'ur', 'hi', 'bn', 'id', 'tl']
        if (!supportedLangs.includes(target_lang)) {
            throw new Error(`Unsupported target language: ${target_lang}`)
        }
        if (providedSourceLang && providedSourceLang !== 'auto' && !supportedLangs.includes(providedSourceLang)) {
            throw new Error(`Unsupported source language: ${providedSourceLang}`)
        }
        const sourceLang = providedSourceLang && providedSourceLang !== 'auto'
            ? providedSourceLang
            : (detectLanguage(text) === 'ar' ? 'ar' : 'auto')

        // If languages are the same, return original text
        if (sourceLang === target_lang) {
            return new Response(JSON.stringify({ translated_text: text, success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Check Cache
        const textHash = btoa(unescape(encodeURIComponent(text.substring(0, 1000)))).substring(0, 128)

        const { data: cached } = await supabaseClient
            .from('translation_cache')
            .select('translated_text')
            .eq('source_text_hash', textHash)
            .eq('target_lang', target_lang)
            .single()

        if (cached) {
            return new Response(JSON.stringify({
                translated_text: cached.translated_text,
                success: true,
                cached: true
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const langNames: Record<string, string> = {
            'en': 'English',
            'ar': 'Arabic',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German',
            'ru': 'Russian',
            'tr': 'Turkish',
            'ur': 'Urdu',
            'hi': 'Hindi',
            'bn': 'Bengali',
            'id': 'Indonesian',
            'tl': 'Filipino'
        }

        const targetName = langNames[target_lang] || target_lang
        const sourceName = sourceLang === 'auto' ? 'the detected source language' : (langNames[sourceLang] || sourceLang)
        const translationInstruction = sourceLang === 'auto'
            ? `Detect the source language and translate to ${targetName}.`
            : `Translate from ${sourceName} to ${targetName}.`

        const chunkText = (value: string, size: number) => value.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [value]
        const sanitizeTranslation = (value: string, targetLang: string) => {
            let sanitized = value
            if (targetLang === 'ar' || targetLang === 'ur') {
                // Remove CJK/Hiragana/Katakana characters that sometimes leak from multilingual models
                sanitized = sanitized.replace(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF]/g, '')
            }
            // Collapse excessive whitespace while preserving newlines
            sanitized = sanitized.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
            return sanitized
        }

        const translateWithHuggingFace = async () => {
            if (!hfToken) {
                throw new Error('HUGGINGFACE_TOKEN is missing. Configure it in Supabase project secrets.')
            }

            const hfRouterUrl = 'https://router.huggingface.co/v1/chat/completions'
            const hfModel = Deno.env.get('HF_TRANSLATION_MODEL') || 'Qwen/Qwen2.5-7B-Instruct'
            const maxChunkSize = 1200
            const chunks = chunkText(text, maxChunkSize)
            let translatedText = ''

            for (const chunk of chunks) {
                let hfResponse: Response
                try {
                    hfResponse = await fetch(
                        hfRouterUrl,
                        {
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
                        }
                    )
                } catch (fetchError: any) {
                    throw new Error(`Hugging Face request failed: ${fetchError?.message || fetchError}`)
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

            return { text: translatedText, modelId: hfModel }
        }

        const translatedResult: { text: string; modelId: string } = await translateWithHuggingFace()

        const translatedText = translatedResult.text
        if (!translatedText) throw new Error('Translation failed - no output from model')

        // 4. Update Cache
        await supabaseClient
            .from('translation_cache')
            .insert({
                source_text_hash: textHash,
                source_lang: sourceLang,
                target_lang: target_lang,
                translated_text: translatedText,
                model_id: translatedResult.modelId
            })

        return new Response(JSON.stringify({
            translated_text: translatedText,
            success: true,
            source_lang: sourceLang,
            target_lang: target_lang
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Edge Function Error:', error)
        return new Response(JSON.stringify({
            error: error.message || 'Unknown error',
            success: false,
            details: error.stack
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
