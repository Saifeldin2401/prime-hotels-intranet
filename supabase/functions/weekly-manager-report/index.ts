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
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekFuture = new Date(now);
        oneWeekFuture.setDate(oneWeekFuture.getDate() + 7);

        // 1. Fetch all Department Heads with their departments
        // Assuming 'department_head' role is stored in user_roles and we join profiles and user_departments
        // Simplified approach: Get all profiles with 'department_head' role capability or simply check user_roles

        // Let's get unique manager IDs who are department heads
        const { data: managers, error: managerError } = await supabase
            .from('user_roles')
            .select(`
                user_id,
                role
            `)
            .eq('role', 'department_head');

        if (managerError) throw managerError;

        const notifications = [];

        // For each manager, find their department and staff
        // This loop isn't most efficient for scale, but works for our project size
        for (const managerRole of managers || []) {
            const managerId = managerRole.user_id;

            // Get Manager's Department
            const { data: userDept } = await supabase
                .from('user_departments')
                .select('department_id')
                .eq('user_id', managerId)
                .single();

            if (!userDept?.department_id) continue;
            const departmentId = userDept.department_id;

            // Get Staff in this Department
            const { data: staffIdsRecs } = await supabase
                .from('user_departments')
                .select('user_id')
                .eq('department_id', departmentId);

            const staffIds = staffIdsRecs?.map(r => r.user_id) || [];
            if (staffIds.length === 0) continue;

            // 2. Calculate Stats for these staff

            // A. Completions (Last 7 Days)
            const { count: completedCount, error: completedError } = await supabase
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

                const { count: userScoped } = await applyWindow(
                    base().eq('target_type', 'user').in('target_id', staffIds)
                );

                const { count: deptScoped } = await applyWindow(
                    base().eq('target_type', 'department').eq('target_id', departmentId)
                );

                const { count: everyoneScoped } = await applyWindow(
                    base().eq('target_type', 'everyone')
                );

                let propertyScoped = 0;
                if (propertyId) {
                    const { count } = await applyWindow(
                        base().eq('target_type', 'property').eq('target_id', propertyId)
                    );
                    propertyScoped = count || 0;
                }

                // Scoped assignments can apply to many users; approximate team workload by multiplying by team size.
                return (userScoped || 0) + ((deptScoped || 0) + propertyScoped + (everyoneScoped || 0)) * staffIds.length;
            };

            // B. Overdue (currently overdue)
            const overdueCount = await countTeamAssignments('overdue');

            // C. Upcoming (next 7 days)
            const upcomingCount = await countTeamAssignments('upcoming');

            if ((completedCount || 0) + (overdueCount || 0) + (upcomingCount || 0) === 0) continue;

            // 3. Create Notification
            notifications.push({
                user_id: managerId,
                type: 'system', // 'report' type might be better if added to enum
                title: 'Weekly Training Report',
                message: `Team Update: ${completedCount || 0} completed, ${overdueCount || 0} overdue, ${upcomingCount || 0} due soon.`,
                link: `/dashboard` // or a specific reports page
            });
        }

        // 4. Batch Insert Notifications
        if (notifications.length > 0) {
            const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

            if (notifError) console.error('Error sending manager reports:', notifError);
        }

        return new Response(
            JSON.stringify({
                processed: notifications.length,
                message: 'Manager reports generated'
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error) {
        console.error("Error in weekly-manager-report:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
