import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('Generating tasks from templates...')

        // 1. Fetch active templates that are due for a run
        const { data: templates, error: templateError } = await supabaseClient
            .from('task_templates')
            .select('*')
            .eq('is_active', true)
            .lte('next_run_at', new Date().toISOString())

        if (templateError) throw templateError

        const results = []

        for (const template of templates || []) {
            console.log(`Processing template: ${template.title}`)

            // 2. Create the task
            const { data: task, error: taskError } = await supabaseClient
                .from('tasks')
                .insert({
                    title: template.title,
                    description: template.description,
                    priority: template.priority,
                    assigned_to_id: template.assigned_to_id,
                    property_id: template.property_id,
                    department_id: template.department_id,
                    status: 'open',
                    created_by_id: template.created_by_id || Deno.env.get('SYSTEM_USER_ID'),
                    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default 1 day due
                })
                .select()
                .single()

            if (taskError) {
                console.error(`Error creating task for template ${template.id}:`, taskError)
                results.push({ template_id: template.id, status: 'failed', error: taskError.message })
                continue
            }

            // 3. Update template last_run and next_run
            // We'll call the DB function we created earlier
            const { data: updated, error: updateError } = await supabaseClient
                .rpc('calculate_next_task_run', {
                    recurrence: template.recurrence_type,
                    last_run: new Date().toISOString()
                })

            await supabaseClient
                .from('task_templates')
                .update({
                    last_run_at: new Date().toISOString(),
                    next_run_at: updated
                })
                .eq('id', template.id)

            results.push({ template_id: template.id, status: 'success', task_id: task.id })
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                results
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in generate-template-tasks:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})
