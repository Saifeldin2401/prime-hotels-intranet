import { createClient } from "jsr:@supabase/supabase-js@2";
import { getServiceRoleToken, isAuthorizedServiceRoleRequest } from '../_shared/auth.ts'
import { buildCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization')
        const serviceRoleJwt = getServiceRoleToken(authHeader)

        if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(supabaseUrl, serviceRoleJwt ?? serviceRoleKey, {
            auth: { persistSession: false }
        });

        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekFuture = new Date(now);
        oneWeekFuture.setDate(oneWeekFuture.getDate() + 7);

        const { data: managers, error: managerError } = await supabase
            .from('user_roles')
            .select(`user_id, profiles(email, full_name)`)
            .eq('role', 'department_head');

        if (managerError) throw managerError;

        const notifications = [];
        let emailsSent = 0;

        for (const managerRole of managers || []) {
            const managerId = managerRole.user_id;
            const profile = managerRole.profiles as any;

            const { data: userDept } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', managerId)
                .single();

            if (!userDept?.department_id) continue;
            const departmentId = userDept.department_id;

            const { data: staffIdsRecs } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', departmentId);

            const staffIds = staffIdsRecs?.map(r => r.user_id) || [];
            if (staffIds.length === 0) continue;

            const { count: completedCount } = await supabase
                .from('training_progress')
                .select('*', { count: 'exact', head: true })
                .in('user_id', staffIds)
                .eq('status', 'completed')
                .gte('completed_at', oneWeekAgo.toISOString());

            const { data: deptMeta } = await supabase
                .from('departments')
                .select('property_id')
                .eq('id', departmentId)
                .maybeSingle();
            const propertyId = deptMeta?.property_id ?? null;

            const countTeamAssignments = async (window: 'overdue' | 'upcoming') => {
                const applyWindow = (query: any) =>
                    window === 'overdue'
                        ? query.lt('due_date', now.toISOString())
                        : query.gt('due_date', now.toISOString()).lte('due_date', oneWeekFuture.toISOString());

                const base = () =>
                    supabase
                        .from('learning_assignments')
                        .select('id', { count: 'exact', head: true })
                        .eq('content_type', 'module')
                        .eq('is_deleted', false)
                        .not('due_date', 'is', null)
                        .not('status', 'in', '(completed,cancelled)');

                const { count: userScoped } = await applyWindow(base().eq('target_type', 'user').in('target_id', staffIds));
                const { count: deptScoped } = await applyWindow(base().eq('target_type', 'department').eq('target_id', departmentId));
                const { count: everyoneScoped } = await applyWindow(base().eq('target_type', 'everyone'));

                let propertyScoped = 0;
                if (propertyId) {
                    const { count } = await applyWindow(base().eq('target_type', 'property').eq('target_id', propertyId));
                    propertyScoped = count || 0;
                }
                return (userScoped || 0) + (deptScoped || 0) + propertyScoped + (everyoneScoped || 0);
            };

            const overdueCount = await countTeamAssignments('overdue');
            const upcomingCount = await countTeamAssignments('upcoming');

            const message = `Team Update: ${completedCount || 0} completed, ${overdueCount} overdue, ${upcomingCount} due soon.`;

            notifications.push({
                user_id: managerId,
                type: 'system',
                title: 'Weekly Training Report',
                message,
                link: `/dashboard`
            });

            // Trigger Email
            if (profile?.email) {
                fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${serviceRoleKey}`
                    },
                    body: JSON.stringify({
                        to: profile.email,
                        templateKey: 'weekly_performance_digest',
                        title: 'Weekly Training Digest',
                        variables: {
                            recipient_name: profile.full_name || 'Department Head',
                            completed_count: (completedCount || 0).toString(),
                            overdue_count: overdueCount.toString(),
                            upcoming_count: upcomingCount.toString(),
                            message: `Great job! Your team completed ${completedCount || 0} modules this week. Keep an eye on the ${overdueCount} overdue assignments to maintain property compliance standards.`,
                            action_url: '/dashboard'
                        },
                        businessDomain: 'management',
                        notificationType: 'system'
                    })
                }).catch(e => console.error(`Email failed for manager ${profile.email}:`, e));
                emailsSent++;
            }
        }

        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
        }

        return new Response(JSON.stringify({ processed: notifications.length, emails_triggered: emailsSent, message: 'Manager reports generated' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error in weekly-manager-report:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
});



