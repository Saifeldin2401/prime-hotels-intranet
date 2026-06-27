import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Server is missing required Supabase environment configuration.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const serviceRoleToken = getServiceRoleToken(authHeader) ?? serviceRoleKey;
    const supabaseClient = createClient(supabaseUrl, serviceRoleToken, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Fetch active templates that are due for a run
    const { data: templates, error: templateError } = await supabaseClient
      .from("task_templates")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", new Date().toISOString());

    if (templateError) throw templateError;

    const results = [];

    for (const template of templates || []) {
      // 2. Create the task
      const { data: task, error: taskError } = await supabaseClient
        .from("tasks")
        .insert({
          title: template.title,
          description: template.description,
          priority: template.priority,
          assigned_to_id: template.assigned_to_id,
          property_id: template.property_id,
          department_id: template.department_id,
          status: "todo", // Fixed: was 'open' which is not a valid task_status enum value
          created_by_id:
            template.created_by_id || Deno.env.get("SYSTEM_USER_ID"),
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 1 day due
        })
        .select()
        .single();

      if (taskError) {
        console.error(
          `Error creating task for template ${template.id}:`,
          taskError,
        );
        results.push({
          template_id: template.id,
          status: "failed",
          error: taskError.message,
        });
        continue;
      }

      // 3. Update template last_run and next_run
      const { data: updated } = await supabaseClient.rpc(
        "calculate_next_task_run",
        {
          recurrence: template.recurrence_type,
          last_run: new Date().toISOString(),
        },
      );

      await supabaseClient
        .from("task_templates")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: updated,
        })
        .eq("id", template.id);

      results.push({
        template_id: template.id,
        status: "success",
        task_id: task.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in generate-template-tasks:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
