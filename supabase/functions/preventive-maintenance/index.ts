import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Fetch due schedules
        const now = new Date();
        const { data: schedules, error: fetchError } = await supabase
            .from("maintenance_schedules")
            .select("*")
            .eq("is_active", true)
            .lte("next_run_at", now.toISOString());

        if (fetchError) {
            throw fetchError;
        }

        console.log(`Found ${schedules?.length || 0} due schedules.`);

        let validSchedules = schedules || [];
        let processingResults = [];

        for (const schedule of validSchedules) {
            try {
                // 2. Create ticket
                const { error: ticketError } = await supabase
                    .from("maintenance_tickets")
                    .insert({
                        title: `[Scheduled] ${schedule.title}`,
                        description: schedule.description || `Automated maintenance task from schedule: ${schedule.title}`,
                        priority: schedule.priority, // Assumes priority enum matches
                        status: "open",
                        property_id: schedule.property_id,
                        assigned_to_id: schedule.assigned_to_id,
                        reported_by_id: schedule.created_by, // Use creator as reporter
                        category: "general", // Default category as it's missing in schedule
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (ticketError) {
                    console.error(`Failed to create ticket for schedule ${schedule.id}:`, ticketError);
                    processingResults.push({ id: schedule.id, status: 'failed', error: ticketError.message });
                    continue;
                }

                // 3. Update schedule next run
                const nextRun = calculateNextRun(new Date(schedule.next_run_at), schedule.frequency);
                const { error: updateError } = await supabase
                    .from("maintenance_schedules")
                    .update({
                        last_generated_at: now.toISOString(),
                        next_run_at: nextRun.toISOString(),
                        updated_at: now.toISOString()
                    })
                    .eq("id", schedule.id);

                if (updateError) {
                    console.error(`Failed to update schedule ${schedule.id}:`, updateError);
                    processingResults.push({ id: schedule.id, status: 'partial_success', message: 'Ticket created but schedule update failed' });
                } else {
                    processingResults.push({ id: schedule.id, status: 'success' });
                }

            } catch (err) {
                console.error(`Error processing schedule ${schedule.id}:`, err);
                processingResults.push({ id: schedule.id, status: 'error', message: err.message });
            }
        }

        return new Response(
            JSON.stringify({
                processed: processingResults.length,
                results: processingResults
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Critical error in preventive-maintenance:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});

function calculateNextRun(currentRun: Date, frequency: string): Date {
    const nextDate = new Date(currentRun);
    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'quarterly':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            // Default to monthly if unknown
            nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
}
