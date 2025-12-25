import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const { sourceDocumentId, clickedDocumentId, position } = await req.json()

        if (!sourceDocumentId || !clickedDocumentId) {
            throw new Error('sourceDocumentId and clickedDocumentId are required')
        }

        // Get user ID from auth
        const { data: { user } } = await supabaseClient.auth.getUser()

        console.log(`Tracking click: ${sourceDocumentId} -> ${clickedDocumentId} by user ${user?.id}`)

        // Call the database function to track the click
        const { error } = await supabaseClient.rpc('track_related_article_click', {
            p_source_doc_id: sourceDocumentId,
            p_clicked_doc_id: clickedDocumentId,
            p_user_id: user?.id || null,
            p_position: position || null
        })

        if (error) {
            console.error('Error tracking click:', error)
            throw error
        }

        console.log(`Successfully tracked click`)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Click tracked successfully'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
