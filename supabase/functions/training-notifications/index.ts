import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function isAuthorizedServiceRoleRequest(authHeader: string | null, key: string): boolean {
    if (!key) return false;
    const expected = `Bearer ${key}`;
    const actual = authHeader ?? '';
    if (actual.length !== expected.length) return false;

    const a = new TextEncoder().encode(actual);
    const b = new TextEncoder().encode(expected);
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

function getServiceRoleToken(authHeader: string | null): string | null {
    if (!authHeader || !serviceRoleKey) return null;
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : authHeader.trim();
    return token === serviceRoleKey ? token : null;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // ===================================
        // SECURITY CHECK - Internal Crons Only
        // ===================================
        const authHeader = req.headers.get('Authorization')
        const serviceRoleJwt = getServiceRoleToken(authHeader)

        if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(
            supabaseUrl,
            serviceRoleJwt ?? serviceRoleKey
        );

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Fetch all active module assignments to process reminders
        const { data: upcomingAssignments, error: upcomingError } = await supabase
            .from('learning_assignments')
            .select(`
              id,
              content_id,
              due_date,
              target_type,
              target_id
            `)
            .eq('content_type', 'module')
            .or('is_deleted.is.null,is_deleted.eq.false');

        if (upcomingError) throw upcomingError;

        // 2. Process upcoming deadlines
        const notifications = [];
        const reminderRows = [];
        const emailJobs: Array<{
            to: string;
            body: Record<string, unknown>;
        }> = [];
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
            const targets = await resolveAssignmentTargets(
                supabase,
                assignment.target_type,
                assignment.target_id
            );
            if (targets.length === 0) continue;

            const moduleTitle = moduleTitleById.get(assignment.content_id) || 'Training Module';
            const targetIds = targets.map((target) => target.id);
            const completedUsers = new Set<string>();

            if (targetIds.length > 0) {
                const { data: completedProgress, error: progressError } = await supabase
                    .from('learning_progress')
                    .select('user_id')
                    .eq('content_type', 'module')
                    .eq('content_id', assignment.content_id)
                    .eq('status', 'completed')
                    .in('user_id', targetIds);

                if (progressError) {
                    console.error('Failed to check completion for assignment:', assignment.id, progressError);
                } else {
                    for (const row of completedProgress || []) {
                        if (row?.user_id) completedUsers.add(row.user_id);
                    }
                }
            }

            for (const target of targets) {
                if (completedUsers.has(target.id)) continue;

                const isDueTomorrow = assignment.due_date && 
                    new Date(assignment.due_date).getTime() >= now.getTime() && 
                    new Date(assignment.due_date).getTime() <= tomorrow.getTime();

                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const throttleDateStr = isDueTomorrow ? `${todayIso}T00:00:00Z` : sevenDaysAgo.toISOString();
                const reminderType = isDueTomorrow ? 'due_24h' : 'weekly_reminder';

                const { data: existingReminder } = await supabase
                    .from('scheduled_reminders')
                    .select('id')
                    .eq('entity_type', 'training_assignment')
                    .eq('entity_id', assignment.id)
                    .eq('user_id', target.id)
                    .eq('reminder_type', reminderType)
                    .gte('sent_at', throttleDateStr)
                    .maybeSingle();

                if (existingReminder) continue;
                
                const dueDateDisplay = assignment.due_date ? ` due on ${new Date(assignment.due_date).toLocaleDateString()}` : '';

                notifications.push({
                    user_id: target.id,
                    type: 'training_deadline',
                    title: isDueTomorrow ? 'Training Due Soon' : 'Training Reminder',
                    message: isDueTomorrow 
                        ? `Your training "${moduleTitle}" is due tomorrow.`
                        : `Please remember to complete your pending training "${moduleTitle}"${dueDateDisplay}.`,
                    link: `/learning/my-learning`,
                    metadata: {
                        assignment_id: assignment.id,
                        content_id: assignment.content_id,
                        reminder_type: reminderType
                    }
                });

                reminderRows.push({
                    entity_type: 'training_assignment',
                    entity_id: assignment.id,
                    user_id: target.id,
                    reminder_type: reminderType,
                    scheduled_for: now.toISOString(),
                    sent_at: now.toISOString(),
                    status: 'sent'
                });

                // Send Email Notification
                if (target.email) {
                    emailJobs.push({
                        to: target.email,
                        body: {
                            to: target.email,
                            templateKey: 'learning_deadline_reminder',
                            title: isDueTomorrow ? 'Training Deadline Tomorrow' : 'Pending Training Reminder',
                            userId: target.id,
                            variables: {
                                recipient_name: target.full_name || 'Team Member',
                                module_title: moduleTitle
                            },
                            actionUrl: '/learning/my-learning',
                            businessDomain: 'learning',
                            notificationType: 'training_deadline'
                        }
                    });
                }
            }
        }

        // 3. Process Certificate Expiry (30 days and 7 days)
        const { data: expiringCertificates, error: expiryError } = await supabase
            .from('certificates')
            .select('id, user_id, training_module_id, title, expiry_date, status')
            .eq('status', 'active')
            .gt('expiry_date', now.toISOString())
            .not('expiry_date', 'is', null);

        if (expiryError) throw expiryError;

        for (const cert of expiringCertificates || []) {
            if (!cert.expiry_date) continue;

            const expiresAt = new Date(cert.expiry_date);
            const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry === 30 || daysUntilExpiry === 7) {
                const moduleTitle = cert.title || 'Training Module';
                notifications.push({
                    user_id: cert.user_id,
                    type: 'system',
                    title: 'Certificate Expiry Reminder',
                    message: `Your certificate for "${moduleTitle}" expires in ${daysUntilExpiry} days. Please retake the training.`,
                    link: `/training/certificates`
                });
            }
        }

        // 4. Wait for all email triggers (fire & forget style but awaited for summary)
        if (emailJobs.length > 0) {
            console.log(`Triggering ${emailJobs.length} learning emails with rate limiting...`);
            await dispatchEmailJobs(emailJobs);
        }

        // 5. Insert notifications & Tracking
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
                emails_triggered: emailJobs.length,
                message: 'Training notifications processed'
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Critical error in training-notifications:", error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
});

interface TargetUser {
    id: string;
    email: string;
    full_name: string | null;
}

async function resolveAssignmentTargets(supabase: ReturnType<typeof createClient>, targetType: string, targetId: string | null): Promise<TargetUser[]> {
    const dedupe = (rows: TargetUser[]): TargetUser[] => {
        const map = new Map<string, TargetUser>();
        for (const row of rows) {
            if (!row?.id || !row?.email) continue;
            map.set(row.id, row);
        }
        return Array.from(map.values());
    };

    switch (targetType) {
        case 'everyone': {
            const { data } = await supabase.from('profiles').select('id, email, full_name').eq('is_active', true);
            return dedupe((data || []) as TargetUser[]);
        }
        case 'user': {
            if (!targetId) return [];
            const { data } = await supabase.from('profiles').select('id, email, full_name').eq('id', targetId).maybeSingle();
            return data ? [data as TargetUser] : [];
        }
        case 'department': {
            if (!targetId) return [];
            const { data } = await supabase
                .from('user_departments')
                .select('profiles(id, email, full_name)')
                .eq('department_id', targetId);
            return dedupe((data || []).map((u: any) => u.profiles).filter(Boolean) as TargetUser[]);
        }
        case 'property': {
            if (!targetId) return [];
            const { data } = await supabase
                .from('user_properties')
                .select('profiles(id, email, full_name)')
                .eq('property_id', targetId);
            return dedupe((data || []).map((u: any) => u.profiles).filter(Boolean) as TargetUser[]);
        }
        case 'role': {
            if (!targetId) return [];
            const { data } = await supabase
                .from('user_roles')
                .select('profiles(id, email, full_name)')
                .eq('role', targetId);
            return dedupe((data || []).map((u: any) => u.profiles).filter(Boolean) as TargetUser[]);
        }
        default:
            return [];
    }
}

async function dispatchEmailJobs(jobs: Array<{ to: string; body: Record<string, unknown> }>): Promise<void> {
    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        try {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`
                },
                body: JSON.stringify(job.body)
            });
        } catch (err) {
            console.error(`Email failed for ${job.to}:`, err);
        }

        if (i < jobs.length - 1) {
            await delay(600);
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}



