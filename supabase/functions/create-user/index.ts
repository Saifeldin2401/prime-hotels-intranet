
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            email,
            fullName,
            phone,
            jobTitle,
            role,
            propertyIds = [],
            departmentIds = []
        } = body;

        if (!email || !fullName) {
            return new Response(JSON.stringify({ error: "Missing email or fullName" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Creating user: ${email}, jobTitle: ${jobTitle}, role: ${role}`);

        // 1. Create Auth User
        let authData, authError;
        try {
            const result = await adminClient.auth.admin.createUser({
                email,
                password: "TempPassword123!",
                email_confirm: true,
                user_metadata: { full_name: fullName },
            });
            authData = result.data;
            authError = result.error;
        } catch (e: any) {
            console.error("Auth creation threw error:", e);
            authError = { message: e.message || e.toString(), details: e };
        }

        if (authError) {
            console.error("Auth creation failed:", authError);
            return new Response(JSON.stringify({ error: authError.message, details: authError }), {
                status: 400, // Return 400 for validation/duplicate/auth errors
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const userId = authData.user!.id;
        console.log(`User created: ${userId}`);

        // 2. Update Profile (Job Title, Phone, Active)
        // Retry logic could be added here if trigger is slow, but usually it's immediate within transaction or shortly after
        const { error: profileError } = await adminClient
            .from('profiles')
            .update({
                full_name: fullName,
                phone: phone || null,
                job_title: jobTitle || null,
                is_active: true,
                is_temp_password: true // FORCE PASSWORD CHANGE ON FIRST LOGIN
            })
            .eq('id', userId);

        if (profileError) {
            console.error("Profile update failed:", profileError);
            // Clean up auth user if profile fails? 
            // await adminClient.auth.admin.deleteUser(userId);
            return new Response(JSON.stringify({ error: "Failed to update profile: " + profileError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Assign Role (user_roles)
        if (role) {
            const { error: roleError } = await adminClient
                .from('user_roles')
                .insert({ user_id: userId, role });

            if (roleError) {
                console.error("Role assignment failed:", roleError);
                return new Response(JSON.stringify({ error: "Failed to assign role: " + roleError.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 4. Assign Properties
        if (propertyIds.length > 0) {
            const { error: propError } = await adminClient
                .from('user_properties')
                .insert(propertyIds.map((pid: string) => ({ user_id: userId, property_id: pid })));

            if (propError) {
                console.error("Property assignment failed:", propError);
            }
        }

        // 5. Assign Departments
        if (departmentIds.length > 0) {
            const { error: deptError } = await adminClient
                .from('user_departments')
                .insert(departmentIds.map((did: string) => ({ user_id: userId, department_id: did })));

            if (deptError) {
                console.error("Department assignment failed:", deptError);
            }
        }

        return new Response(
            JSON.stringify({ userId: userId, success: true }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );

    } catch (err: any) {
        console.error("Edge create-user unexpected error:", err);
        return new Response(JSON.stringify({ error: "Unexpected error: " + (err.message || err.toString()) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
