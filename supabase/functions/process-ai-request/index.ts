import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { buildCorsHeaders } from "../_shared/cors.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'



serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

    // 1. Handle CORS Preflight

    if (req.method === 'OPTIONS') {

        return new Response(null, { status: 204, headers: corsHeaders })

    }



    try {

        // 2. Validate Authentication

        const authHeader = req.headers.get('Authorization')

        if (!authHeader) {

            throw new Error('Missing Authorization header')

        }



        const supabaseClient = createClient(

            Deno.env.get('SUPABASE_URL') ?? '',

            Deno.env.get('SUPABASE_ANON_KEY') ?? '',

            { global: { headers: { Authorization: authHeader } } }

        )



        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {

            console.error('Auth error:', authError?.message || 'No user found')

            throw new Error('Session expired. Please refresh the page or log in again.')

        }



        // 3. Parse Request

        const reqBody = await req.json()

        const {
            model,
            prompt,
            provider,
            task,
            action,
            context,
            temperature,
            max_tokens,
            maxOutputTokens,
        } = reqBody



        // Hugging Face only (OpenAI disabled)
        let result = ''
        let usedBackupToken = false

        const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
        if (!HF_TOKEN) {
            throw new Error('HUGGINGFACE_TOKEN is missing.')
        }
        const currentTask = task || 'chat'

        // Use a powerful supported LLM for summarization instead of legacy BART
        let targetModelId = model
        if (currentTask === 'summarization') {
            targetModelId = 'Qwen/Qwen2.5-72B-Instruct'
        } else if (!targetModelId) {
            targetModelId = 'Qwen/Qwen2.5-7B-Instruct'
        }

        const forceMinimax = (Deno.env.get('FORCE_MINIMAX') || '').toLowerCase() === 'true'
        if (forceMinimax) {
            const minimaxToken = Deno.env.get('HUGGINGFACE_MINIMAX_TOKEN')
            if (!minimaxToken) {
                throw new Error('FORCE_MINIMAX is enabled but HUGGINGFACE_MINIMAX_TOKEN is missing.')
            }
            const minimaxModelId = Deno.env.get('HF_MINIMAX_MODEL_ID') || 'MiniMaxAI/MiniMax-M2.5'
            console.warn(`FORCE_MINIMAX enabled. Routing request using HUGGINGFACE_MINIMAX_TOKEN with model ${minimaxModelId}`)
            targetModelId = minimaxModelId
            usedBackupToken = true
        }

        const isQuotaOrCreditsError = (status: number, message: string) => {
            const msg = (message || '').toLowerCase()
            return (
                status === 401 ||
                status === 402 ||
                status === 403 ||
                status === 429 ||
                msg.includes('quota') ||
                msg.includes('credit') ||
                msg.includes('credits') ||
                msg.includes('rate limit') ||
                msg.includes('too many requests')
            )
        }

        const normalizeTemperature = (value: unknown) => {
            if (typeof value !== 'number' || Number.isNaN(value)) return 0.7
            if (value < 0) return 0
            if (value > 2) return 2
            return value
        }

        const normalizeMaxTokens = (value: unknown) => {
            const n = typeof value === 'number' ? value : Number(value)
            if (!Number.isFinite(n) || n <= 0) return 2048
            return Math.max(1, Math.min(4096, Math.floor(n)))
        }

        const effectiveTemperature = normalizeTemperature(temperature)
        const effectiveMaxTokens = normalizeMaxTokens(max_tokens ?? maxOutputTokens)

        const callHfRouter = async (token: string, modelId: string) => {
            const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: currentTask === 'summarization' ? 'You are an expert summarizer. Summarize the user input concisely into key bullet points.' : 'You are a helpful assistant. Output valid JSON when requested.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: effectiveMaxTokens,
                    temperature: effectiveTemperature,
                    stream: false
                }),
            })

            let data: any = null
            try {
                data = await response.json()
            } catch {
                const text = await response.text().catch(() => '')
                data = { error: text || 'Non-JSON response from Hugging Face Router' }
            }

            if (!response.ok) {
                const errMsg = data?.error?.message || data?.error || `HTTP ${response.status}`
                const err = new Error(String(errMsg)) as Error & { status?: number }
                err.status = response.status
                throw err
            }

            return data
        }

        // Always use the Chat Router API - it's the most stable and supported
        let data: any
        try {
            if (forceMinimax) {
                const minimaxToken = Deno.env.get('HUGGINGFACE_MINIMAX_TOKEN')
                data = await callHfRouter(minimaxToken || '', targetModelId)
            } else {
                data = await callHfRouter(HF_TOKEN, targetModelId)
            }
        } catch (e) {
            const err = e as Error & { status?: number }
            const status = err.status ?? 0
            const message = err.message || ''

            if (isQuotaOrCreditsError(status, message)) {
                console.warn('Primary Hugging Face token quota/credits issue detected. Falling back to MiniMax-M2.5.')
                const minimaxToken = Deno.env.get('HUGGINGFACE_MINIMAX_TOKEN')
                if (minimaxToken) {
                    const minimaxModelId = Deno.env.get('HF_MINIMAX_MODEL_ID') || 'MiniMaxAI/MiniMax-M2.5'
                    console.warn(`Executing fallback call using HUGGINGFACE_MINIMAX_TOKEN with model ${minimaxModelId}`)
                    data = await callHfRouter(minimaxToken, minimaxModelId)
                    usedBackupToken = true
                    targetModelId = minimaxModelId
                } else {
                    throw err
                }
            } else {
                throw err
            }
        }

        if (data?.error) {
            if (typeof data.error === 'string' && data.error.includes('loading')) {
                throw new Error(`${targetModelId} is loading (cold start). Retry in 20s.`)
            }
            if (data.error?.message) {
                throw new Error(`Hugging Face: ${data.error.message}`)
            }
            throw new Error(`Hugging Face Error: ${JSON.stringify(data.error)}`)
        }

        // Chat returns choices
        if (data.choices && data.choices[0]?.message?.content) {
            result = data.choices[0].message.content
        } else {
            console.error("Unknown Router Response:", data)
            throw new Error('Unknown response format from Hugging Face Router')
        }


        // 4. Return Success

        return new Response(JSON.stringify({
            response: result,
            result,
            success: true,
            meta: {
                modelUsed: targetModelId,
                usedBackupToken,
                forcedMinimax: forceMinimax,
            },
        }), {

            headers: { ...corsHeaders, 'Content-Type': 'application/json' },

        })



    } catch (error) {

        console.error('AI Request Failed:', error)

        return new Response(

            JSON.stringify({

                error: (error as Error).message || 'Internal Server Error',

                success: false

            }),

            {

                status: 500,

                headers: { ...corsHeaders, 'Content-Type': 'application/json' },

            }

        )

    }

})




