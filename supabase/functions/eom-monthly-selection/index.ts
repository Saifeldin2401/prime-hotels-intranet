import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

/**
 * Employee of the Month - Monthly Selection Job
 *
 * This Edge Function runs at the configured announcement day of each month
 * to automatically calculate scores and select the Employee of the Month.
 *
 * Can be triggered via:
 * 1. pg_cron (if available): SELECT cron.schedule('eom-monthly', '0 9 1 * *', 'select net.http_post(...)')
 * 2. External cron service (e.g., GitHub Actions) calling this endpoint
 * 3. Manual trigger via admin panel
 */

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ===================================
    // SECURITY CHECK - Service Role Only
    // ===================================
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceRoleJwt = getServiceRoleToken(authHeader);

    // Check if request is from authorized cron/service
    const isServiceRole = isAuthorizedServiceRoleRequest(
      authHeader,
      serviceRoleKey,
    );
    const isAdminRequest =
      req.headers.get("X-Admin-Request") === "true" && isServiceRole;

    if (!isServiceRole && !isAdminRequest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleJwt ?? serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Parse request body for manual triggers
    let targetPropertyId: string | null = null;
    let targetMonth: number | null = null;
    let targetYear: number | null = null;
    let dryRun = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetPropertyId = body.property_id || null;
        targetMonth = body.month || null;
        targetYear = body.year || null;
        dryRun = body.dry_run || false;
      } catch {
        // No body or invalid JSON, proceed with auto-detection
      }
    }

    const now = new Date();
    const currentMonth = targetMonth || now.getMonth() + 1;
    const currentYear = targetYear || now.getFullYear();
    const currentDay = now.getDate();

    console.log(
      `EOM Monthly Selection Job - ${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`,
    );
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);

    // ===================================
    // GET PROPERTIES TO PROCESS
    // ===================================
    let propertiesQuery = supabaseClient
      .from("eom_automation_config")
      .select(
        `
                *,
                properties!inner(id, name)
            `,
      )
      .eq("is_enabled", true);

    if (targetPropertyId) {
      propertiesQuery = propertiesQuery.eq("property_id", targetPropertyId);
    }

    const { data: configs, error: configError } = await propertiesQuery;

    if (configError) {
      throw new Error(
        `Failed to fetch automation configs: ${configError.message}`,
      );
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No properties with EOM automation enabled",
          processed: 0,
          results: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // ===================================
    // PROCESS EACH PROPERTY
    // ===================================
    const results = [];

    for (const config of configs) {
      const propertyId = config.property_id;
      const propertyName = config.properties?.name || "Unknown Property";
      const announcementDay = config.announcement_day || 1;

      // Skip if not the announcement day (unless manual trigger or dry run)
      if (!targetPropertyId && !dryRun && currentDay !== announcementDay) {
        console.log(
          `Skipping ${propertyName} - announcement day is ${announcementDay}, today is ${currentDay}`,
        );
        continue;
      }

      console.log(`Processing ${propertyName} (${propertyId})...`);

      try {
        // Calculate previous month (we're selecting for the month that just ended)
        const selectionMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const selectionYear =
          currentMonth === 1 ? currentYear - 1 : currentYear;

        // Run the calculation
        const { data: calculationResults, error: calcError } =
          await supabaseClient.rpc("run_eom_calculation", {
            p_property_id: propertyId,
            p_month: selectionMonth,
            p_year: selectionYear,
          });

        if (calcError) {
          throw new Error(`Calculation failed: ${calcError.message}`);
        }

        // Get the top 3 for logging
        const top3 = calculationResults?.slice(0, 3) || [];
        console.log(
          `Top 3 for ${propertyName}:`,
          top3.map((r: any) => `${r.full_name} (${r.total_score})`).join(", "),
        );

        if (dryRun) {
          results.push({
            property_id: propertyId,
            property_name: propertyName,
            status: "dry_run",
            month: selectionMonth,
            year: selectionYear,
            top_candidates: top3,
            config: {
              auto_announce: config.auto_announce,
              weights: {
                tasks: config.task_completion_weight,
                training: config.training_completion_weight,
                sop: config.sop_compliance_weight,
                attendance: config.attendance_weight,
              },
            },
          });
          continue;
        }

        // Generate auto-selection
        const { data: selectionId, error: selectionError } =
          await supabaseClient.rpc("generate_eom_auto_selection", {
            p_property_id: propertyId,
            p_month: selectionMonth,
            p_year: selectionYear,
          });

        if (selectionError) {
          throw new Error(
            `Selection generation failed: ${selectionError.message}`,
          );
        }

        // Fetch the selection details
        const { data: selection, error: fetchError } = await supabaseClient
          .from("eom_auto_selections")
          .select(
            `
                        *,
                        profile:user_id(full_name, job_title)
                    `,
          )
          .eq("id", selectionId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch selection: ${fetchError.message}`);
        }

        // Send notification if auto-announced
        let notificationSent = false;
        if (selection.status === "announced" && selection.user_id) {
          const monthName = new Date(
            selectionYear,
            selectionMonth - 1,
          ).toLocaleString("en-US", { month: "long" });

          const { error: notifError } = await supabaseClient
            .from("notifications")
            .insert({
              user_id: selection.user_id,
              type: "employee_of_the_month_winner",
              title: "🎉 Employee of the Month!",
              message: `Congratulations! You have been selected as the Employee of the Month for ${monthName} ${selectionYear} based on your outstanding performance.`,
              link: "/dashboard",
              metadata: {
                month: selectionMonth,
                year: selectionYear,
                total_score: selection.total_score,
                auto_selected: true,
              },
            });

          if (!notifError) {
            notificationSent = true;
          }
        }

        results.push({
          property_id: propertyId,
          property_name: propertyName,
          status: "success",
          selection_id: selectionId,
          winner: selection.profile?.full_name,
          winner_score: selection.total_score,
          status_state: selection.status,
          auto_announced: selection.status === "announced",
          notification_sent: notificationSent,
          month: selectionMonth,
          year: selectionYear,
        });

        console.log(
          `✅ ${propertyName}: Winner ${selection.profile?.full_name} (${selection.status})`,
        );
      } catch (error) {
        console.error(`❌ ${propertyName}:`, error);
        results.push({
          property_id: propertyId,
          property_name: propertyName,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ===================================
    // RETURN RESULTS
    // ===================================
    const successCount = results.filter(
      (r) => r.status === "success" || r.status === "dry_run",
    ).length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        processed: results.length,
        successful: successCount,
        errors: errorCount,
        mode: dryRun ? "dry_run" : "live",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in eom-monthly-selection:", error);
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
