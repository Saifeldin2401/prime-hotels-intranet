import { createClient } from "jsr:@supabase/supabase-js@2";
import { getServiceRoleToken, isAuthorizedServiceRoleRequest } from '../_shared/auth.ts'

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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const serviceRoleJwt = getServiceRoleToken(authHeader)

        if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            serviceRoleJwt ?? serviceRoleKey
        );

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Fetch approaching deadlines (due within 24h)
        const { data: upcomingAssignments, error: upcomingError } = await supabase
            .from('learning_assignments')
            .select(`
              id,
              content_id,
              due_date,
              target_type,
              target_id,
              status
            `)
            .eq('content_type', 'module')
            .eq('is_deleted', false)
            .not('due_date', 'is', null)
            .gte('due_date', now.toISOString())
            .lte('due_date', tomorrow.toISOString());

        if (upcomingError) throw upcomingError;

        // 2. Process upcoming deadlines
        const notifications = [];
        const reminderRows = [];
        const todayIso = now.toISOString().split('T')[0];

        const moduleIds = Array.from(new Set((upcomingAssignments || []).map((a) => a.content_id).filter(Boolean)));
        const moduleTitleById = new Map<string, string>();
        if (moduleIds.length > 0) {
            const { data: modules, error: moduleError } = await supabase
                .from('training_modules')
                .select('id, title')
                .in('id', moduleIds);

            if (moduleError) {
                console.error('Failed to load training module titles:', moduleError);
            } else {
                for (const m of modules || []) {
                    if (m?.id) moduleTitleById.set(m.id, m.title || 'Training Module');
                }
            }
        }

        for (const assignment of upcomingAssignments || []) {
            if (assignment.status === 'completed') continue;

            const recipients = await resolveAssignmentTargets(
              supabase,
              assignment.target_type,
              assignment.target_id
            );

            const moduleTitle = moduleTitleById.get(assignment.content_id) || 'Training Module';

            for (const userId of recipients) {
                const { data: existingReminder } = await supabase
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'training_assignment')
                    .eq('entity_id', assignment.id)
                    .eq('user_id', userId)
                    .eq('reminder_type', 'due_24h')
                    .gte('sent_at', `${todayIso}T00:00:00Z`)
                    .maybeSingle();

                if (existingReminder) continue;

                notifications.push({
                    user_id: userId,
                    type: 'training_deadline', // Ensure this matches enum
                    title: 'Training Due Soon',
                    message: `Your training "${moduleTitle}" is due on ${new Date(assignment.due_date).toLocaleDateString()}.`,
                    link: `/learning/my-learning`
                });

                reminderRows.push({
                    entity_type: 'training_assignment',
                    entity_id: assignment.id,
                    user_id: userId,
                    reminder_type: 'due_24h',
                    scheduled_for: now.toISOString(),
                    sent_at: now.toISOString(),
                    status: 'sent'
                });
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
                    link: `/training/certificates`
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

        if (reminderRows.length > 0) {
            const { error: reminderError } = await supabase
                .from('scheduled_reminders')
                .insert(reminderRows);

            if (reminderError) console.error('Error storing reminder tracking rows:', reminderError);
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

async function resolveAssignmentTargets(supabase: ReturnType<typeof createClient>, targetType: string, targetId: string | null): Promise<string[]> {
    switch (targetType) {
        case 'everyone': {
            const { data } = await supabase.from('profiles').select('id').eq('is_active', true);
            return (data || []).map((u) => u.id);
        }
        case 'user':
            return targetId ? [targetId] : [];
        case 'department': {
            if (!targetId) return [];
            const { data } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', targetId);
            return (data || []).map((u) => u.user_id);
        }
        case 'property': {
            if (!targetId) return [];
            const { data } = await supabase
                .from('user_properties')
                .select('user_id')
                .eq('property_id', targetId);
            return (data || []).map((u) => u.user_id);
        }
        default:
            return [];
    }
}
