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

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Fetch approaching deadlines (due within 24h) not yet reminded
        const { data: upcomingAssignments, error: upcomingError } = await supabase
            .from('training_assignments')
            .select(`
            id,
            deadline,
            assigned_to_user_id,
            training_module:training_modules(title)
        `)
            .eq('is_deleted', false)
            .eq('reminder_sent', false)
            .gte('deadline', now.toISOString())
            .lte('deadline', tomorrow.toISOString())
            .not('assigned_to_user_id', 'is', null);

        if (upcomingError) throw upcomingError;

        // 2. Process upcoming deadlines
        const notifications = [];
        for (const assignment of upcomingAssignments || []) {
            if (assignment.assigned_to_user_id) {
                notifications.push({
                    user_id: assignment.assigned_to_user_id,
                    type: 'training_deadline', // Ensure this matches enum
                    title: 'Training Due Soon',
                    message: `Your training "${assignment.training_module?.title}" is due on ${new Date(assignment.deadline).toLocaleDateString()}.`,
                    link: `/training/assignments`,
                    is_read: false
                });

                // Mark as reminded
                await supabase.from('training_assignments')
                    .update({ reminder_sent: true })
                    .eq('id', assignment.id);
            }
        }



        // 3. Process Certificate Expiry (30 days and 7 days)
        const { data: expiringCertificates, error: expiryError } = await supabase
            .from('training_certificates')
            .select(`
                id,
                expires_at,
                training_progress!inner(
                    user_id,
                    training_modules!inner(title)
                )
            `)
            .gt('expires_at', now.toISOString()) // Not already expired
            .not('expires_at', 'is', null);

        if (expiryError) throw expiryError;

        for (const cert of expiringCertificates || []) {
            if (!cert.expires_at) continue;

            const expiresAt = new Date(cert.expires_at);
            const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Check for 30 days or 7 days (approximate)
            if (daysUntilExpiry === 30 || daysUntilExpiry === 7) {
                notifications.push({
                    user_id: cert.training_progress.user_id,
                    type: 'system', // or specific 'certificate_expiry' type if added
                    title: 'Certificate Expiring',
                    message: `Your certificate for "${cert.training_progress.training_modules.title}" expires in ${daysUntilExpiry} days. Please retake the training.`,
                    link: `/training/certificates`,
                    is_read: false
                });
            }
        }

        // 2. Fetch overdue assignments (deadline passed, not completed)
        // Complex query: fetch assignments where deadline < now AND NOT EXISTS (progress where completed_at IS NOT NULL)
        // For simplicity efficiently, we fetch overdue assignments and check progress in code or second query.
        // Let's rely on standard notifications for now. If deadline passed, we might have already sent reminder.
        // Maybe we send "Overdue" notification if not done.

        // 3. Insert notifications
        if (notifications.length > 0) {
            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (notifError) console.error('Error sending detailed notifications:', notifError);
        }

        return new Response(
            JSON.stringify({
                processed: notifications.length,
                message: 'Training notifications processed'
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Critical error in training-notifications:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
