import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
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
        const { model, prompt, provider, task } = reqBody

        // Default to Hugging Face if not specified, unless model is gpt*
        const isOpenAI = provider === 'openai' || (model && model.startsWith('gpt'))

        let result = ''

        if (isOpenAI) {
            // --- OpenAI Route ---
            const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
            if (!OPENAI_API_KEY) throw new Error('Server detected OpenAI model but OPENAI_API_KEY is missing.')

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant. Output valid JSON when requested.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                }),
            })

            const data = await response.json()
            if (data.error) throw new Error(data.error.message || 'OpenAI API Error')
            result = data.choices[0]?.message?.content

        } else {
            // --- Hugging Face Route ---
            const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
            let currentTask = task || 'chat'
            // Use a powerful supported LLM for summarization instead of legacy BART
            let targetModelId = model
            if (currentTask === 'summarization') {
                targetModelId = 'Qwen/Qwen2.5-72B-Instruct'
            } else if (!targetModelId) {
                targetModelId = 'Qwen/Qwen2.5-7B-Instruct'
            }

            // Always use the Chat Router API - it's the most stable and supported
            const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: targetModelId,
                    messages: [
                        { role: 'system', content: currentTask === 'summarization' ? 'You are an expert summarizer. Summarize the user input concisely into key bullet points.' : 'You are a helpful assistant. Output valid JSON when requested.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 2048,
                    temperature: 0.7,
                    stream: false
                }),
            })

            const data = await response.json()

            if (data.error) {
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
        }

        // 4. Return Success
        return new Response(JSON.stringify({ response: result, success: true }), {
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
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})
