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

        const { documentId } = await req.json()

        if (!documentId) {
            throw new Error('documentId is required')
        }

        console.log(`Computing related articles for document: ${documentId}`)

        // Call the database function to refresh relationships
        const { data, error } = await supabaseClient.rpc('refresh_related_articles', {
            target_doc_id: documentId
        })

        if (error) {
            console.error('Error computing relationships:', error)
            throw error
        }

        console.log(`Successfully computed ${data} relationships for document ${documentId}`)

        return new Response(
            JSON.stringify({
                success: true,
                documentId,
                relationshipsComputed: data,
                message: `Computed ${data} related articles`
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
