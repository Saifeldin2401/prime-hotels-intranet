import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
    action: "create_batch" | "process_batch" | "get_status";
    userIds?: string[];
    notificationType?: string;
    notificationData?: {
        title: string;
        message: string;
        moduleId?: string;
        deadline?: string;
    };
    batchId?: string;
    batchSize?: number;
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ===================================
        // SECURITY CHECK - Internal Crons Only
        // ===================================
        const authHeader = req.headers.get('Authorization')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (authHeader !== `Bearer ${serviceRoleKey}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { action, userIds, notificationType, notificationData, batchId, batchSize = 50 }: NotificationRequest = await req.json();

        // Action: Create a new notification batch
        if (action === "create_batch") {
            if (!userIds || userIds.length === 0) {
                return new Response(
                    JSON.stringify({ error: "userIds required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Create batch record
            const { data: batch, error: batchError } = await supabase
                .from("notification_batches")
                .insert({
                    job_type: notificationType || "training_assigned",
                    total_count: userIds.length,
                    status: "pending",
                    metadata: notificationData || {}
                })
                .select()
                .single();

            if (batchError) {
                throw batchError;
            }

            // Create queue entries in chunks to avoid timeout
            const chunkSize = 100;
            for (let i = 0; i < userIds.length; i += chunkSize) {
                const chunk = userIds.slice(i, i + chunkSize);
                const queueItems = chunk.map(userId => ({
                    batch_id: batch.id,
                    user_id: userId,
                    notification_type: notificationType || "training_assigned",
                    notification_data: notificationData || {}
                }));

                const { error: queueError } = await supabase
                    .from("notification_queue")
                    .insert(queueItems);

                if (queueError) {
                    console.error("Queue insert error:", queueError);
                }
            }

            // Start processing immediately
            const processResult = await processNotifications(supabase, batch.id, batchSize);

            return new Response(
                JSON.stringify({
                    success: true,
                    batchId: batch.id,
                    totalQueued: userIds.length,
                    processed: processResult.processed
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action: Process pending notifications
        if (action === "process_batch") {
            const result = await processNotifications(supabase, batchId, batchSize);

            return new Response(
                JSON.stringify(result),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action: Get batch status
        if (action === "get_status") {
            if (!batchId) {
                return new Response(
                    JSON.stringify({ error: "batchId required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { data: batch, error } = await supabase
                .from("notification_batches")
                .select("*")
                .eq("id", batchId)
                .single();

            if (error) {
                throw error;
            }

            const { count: pending } = await supabase
                .from("notification_queue")
                .select("*", { count: "exact", head: true })
                .eq("batch_id", batchId)
                .eq("status", "pending");

            return new Response(
                JSON.stringify({
                    ...batch,
                    pending_count: pending || 0
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Bulk notification error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

async function processNotifications(
    supabase: any,
    batchId: string | undefined,
    batchSize: number
): Promise<{ processed: number; remaining: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    // Get pending items
    let query = supabase
        .from("notification_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(batchSize);

    if (batchId) {
        query = query.eq("batch_id", batchId);
    }

    const { data: pendingItems, error } = await query;

    if (error) {
        console.error("Error fetching pending items:", error);
        return { processed: 0, remaining: 0, failed: 0 };
    }

    if (!pendingItems || pendingItems.length === 0) {
        return { processed: 0, remaining: 0, failed: 0 };
    }

    // Update batch status to processing
    if (batchId) {
        await supabase
            .from("notification_batches")
            .update({ status: "processing", started_at: new Date().toISOString() })
            .eq("id", batchId)
            .eq("status", "pending");
    }

    // Process each item
    for (const item of pendingItems) {
        try {
            // Mark as processing
            await supabase
                .from("notification_queue")
                .update({ status: "processing", attempts: item.attempts + 1 })
                .eq("id", item.id);

            // Create the actual notification
            const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                    user_id: item.user_id,
                    title: item.notification_data?.title || "New Training Assigned",
                    message: item.notification_data?.message || "You have been assigned a new training module",
                    type: item.notification_type,
                    data: item.notification_data
                });

            if (notifError) {
                throw notifError;
            }

            // Mark as sent
            await supabase
                .from("notification_queue")
                .update({ status: "sent", processed_at: new Date().toISOString() })
                .eq("id", item.id);

            // Update batch progress
            if (item.batch_id) {
                await supabase.rpc("increment_batch_processed", { p_batch_id: item.batch_id });
            }

            processed++;
        } catch (err) {
            console.error("Error processing notification:", item.id, err);

            // Mark as failed if max attempts reached
            const newStatus = item.attempts >= item.max_attempts - 1 ? "failed" : "pending";
            await supabase
                .from("notification_queue")
                .update({
                    status: newStatus,
                    error_message: err.message,
                    attempts: item.attempts + 1
                })
                .eq("id", item.id);

            if (newStatus === "failed") {
                failed++;
                if (item.batch_id) {
                    await supabase.rpc("increment_batch_failed", { p_batch_id: item.batch_id });
                }
            }
        }
    }

    // Get remaining count
    let remainingQuery = supabase
        .from("notification_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

    if (batchId) {
        remainingQuery = remainingQuery.eq("batch_id", batchId);
    }

    const { count: remaining } = await remainingQuery;

    // Check if batch is complete
    if (batchId && remaining === 0) {
        await supabase
            .from("notification_batches")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", batchId);
    }

    return { processed, remaining: remaining || 0, failed };
}
