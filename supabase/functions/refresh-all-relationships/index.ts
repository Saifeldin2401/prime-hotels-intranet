import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Scheduled Edge Function to refresh all related article relationships
 * Run this nightly via Supabase Cron or external scheduler
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify this is called from a trusted source (cron job or admin)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')) {
            throw new Error('Unauthorized - service role key required')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Starting nightly related articles refresh...')

        // Get all published documents
        const { data: documents, error: fetchError } = await supabaseClient
            .from('documents')
            .select('id')
            .eq('is_deleted', false)
            .eq('status', 'published')

        if (fetchError) {
            throw fetchError
        }

        console.log(`Found ${documents?.length || 0} documents to process`)

        let successCount = 0
        let errorCount = 0
        const errors: any[] = []

        // Process in batches of 10 to avoid overwhelming the database
        const batchSize = 10
        for (let i = 0; i < (documents?.length || 0); i += batchSize) {
            const batch = documents!.slice(i, i + batchSize)

            await Promise.all(
                batch.map(async (doc) => {
                    try {
                        const { data, error } = await supabaseClient.rpc('refresh_related_articles', {
                            target_doc_id: doc.id
                        })

                        if (error) {
                            throw error
                        }

                        successCount++
                        console.log(`✓ Refreshed ${data} relationships for document ${doc.id}`)
                    } catch (error) {
                        errorCount++
                        errors.push({ documentId: doc.id, error: error.message })
                        console.error(`✗ Failed to refresh document ${doc.id}:`, error)
                    }
                })
            )

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`Refresh complete: ${successCount} success, ${errorCount} errors`)

        return new Response(
            JSON.stringify({
                success: true,
                totalDocuments: documents?.length || 0,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
                message: `Refreshed relationships for ${successCount}/${documents?.length || 0} documents`
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
                status: 500,
            }
        )
    }
})
