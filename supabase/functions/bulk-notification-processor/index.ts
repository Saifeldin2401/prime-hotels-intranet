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
        // SECURITY CHECK - Role Based Access
        // ===================================
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // 1. Verify User Identity using the incoming JWT
        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await userClient.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid Token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 2. Verify User Permissions (Must be Admin/Manager)
        // We use the service client for this check to ensure we can read roles reliably
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Query user_roles table (profiles.role doesn't exist in schema)
        const { data: userRoles } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

        const allowedRoles = ['corporate_admin', 'regional_admin', 'property_manager', 'department_head', 'property_hr'];
        const hasPermission = userRoles?.some(r => allowedRoles.includes(r.role));

        if (!hasPermission) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Insufficient permissions for bulk operations' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // 3. Proceed with Privileged Client for Bulk Operations
        const supabase = supabaseAdmin;

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
            const data = item.notification_data || {};
            // Derive generic entity details
            const entityId = data.moduleId || data.announcement_id || data.entityId;
            let entityType = data.entityType;
            if (!entityType) {
                if (data.moduleId) entityType = 'training_module';
                else if (data.announcement_id) entityType = 'announcement';
            }

            // Derive link if not provided
            let link = data.link;
            if (!link && data.moduleId) {
                link = `/learning/training/${data.moduleId}`;
            }

            const { error: notifError } = await supabase
                .from("notifications")
                .insert({
                    user_id: item.user_id,
                    title: data.title || "New Notification",
                    message: data.message || "You have a new notification",
                    type: item.notification_type,
                    data: data,
                    metadata: data,
                    entity_id: entityId || null,
                    entity_type: entityType || null,
                    link: link || null
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
