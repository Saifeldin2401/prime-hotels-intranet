import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getServiceRoleToken,
  isAuthorizedServiceRoleRequest,
} from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";

type ReportDefinition = {
  id: string;
  name: string;
  report_type: string;
  filters: Record<string, unknown> | null;
  schedule_frequency: "hourly" | "daily" | "weekly" | "monthly" | null;
  is_active: boolean;
  created_by: string | null;
};

type ReportRun = {
  id: string;
  report_id: string;
  triggered_by: string | null;
};

type ReportDataMap = Record<string, Record<string, unknown>[]>;

const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
  );
  return [headers.join(","), ...body].join("\n");
};

const buildCsvExport = (dataMap: ReportDataMap): string => {
  const chunks = Object.entries(dataMap).map(([section, rows]) => {
    const csv = toCsv(rows);
    if (!csv) return `# ${section}\n`;
    return `# ${section}\n${csv}`;
  });
  return chunks.join("\n\n");
};

const applyDateRange = (
  query: any,
  column: string,
  dateFrom?: string,
  dateTo?: string,
) => {
  let scoped = query;
  if (dateFrom) scoped = scoped.gte(column, dateFrom);
  if (dateTo) scoped = scoped.lte(column, dateTo);
  return scoped;
};

const fetchReportData = async (
  supabaseClient: any,
  reportType: string,
  filters?: Record<string, unknown> | null,
): Promise<ReportDataMap> => {
  const dateFrom =
    typeof filters?.date_from === "string" ? filters.date_from : undefined;
  const dateTo =
    typeof filters?.date_to === "string" ? filters.date_to : undefined;

  switch (reportType) {
    case "operations": {
      const [tasks, maintenance] = await Promise.all([
        applyDateRange(
          supabaseClient
            .from("tasks")
            .select("id,title,status,priority,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
        applyDateRange(
          supabaseClient
            .from("maintenance_tickets")
            .select("id,title,status,priority,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
      ]);
      return {
        tasks: tasks.data || [],
        maintenance_tickets: maintenance.data || [],
      };
    }
    case "hr": {
      const [profiles, leaves] = await Promise.all([
        applyDateRange(
          supabaseClient
            .from("profiles")
            .select("id,full_name,job_title,is_active,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
        applyDateRange(
          supabaseClient
            .from("leave_requests")
            .select("id,type,status,start_date,end_date,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
      ]);
      return {
        profiles: profiles.data || [],
        leave_requests: leaves.data || [],
      };
    }
    case "training": {
      const [assignments, progress] = await Promise.all([
        applyDateRange(
          supabaseClient
            .from("learning_assignments")
            .select("id,status,due_date,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
        applyDateRange(
          supabaseClient
            .from("learning_progress")
            .select("id,status,completion_percentage,updated_at")
            .limit(500),
          "updated_at",
          dateFrom,
          dateTo,
        ),
      ]);
      return {
        learning_assignments: assignments.data || [],
        learning_progress: progress.data || [],
      };
    }
    case "audits": {
      const [runs, findings] = await Promise.all([
        applyDateRange(
          supabaseClient
            .from("audit_runs")
            .select("id,status,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
        applyDateRange(
          supabaseClient
            .from("audit_findings")
            .select("id,status,notes,created_at")
            .limit(500),
          "created_at",
          dateFrom,
          dateTo,
        ),
      ]);
      return {
        audit_runs: runs.data || [],
        audit_findings: findings.data || [],
      };
    }
    default:
      return {};
  }
};

const processRun = async (
  supabaseClient: any,
  run: ReportRun,
  definition: ReportDefinition,
): Promise<{
  success: boolean;
  error?: string;
  rowCount?: number;
  outputPath?: string;
}> => {
  const startedAt = new Date().toISOString();
  const outputPath = `${definition.id}/${run.id}.csv`;

  const { error: markRunningError } = await supabaseClient
    .from("report_runs")
    .update({
      status: "running",
      started_at: startedAt,
      triggered_via: "scheduled-reports-edge",
      error_message: null,
    })
    .eq("id", run.id)
    .eq("status", "queued");

  if (markRunningError) {
    return { success: false, error: markRunningError.message };
  }

  try {
    const dataMap = await fetchReportData(
      supabaseClient,
      definition.report_type,
      definition.filters,
    );
    const rowCount = Object.values(dataMap).reduce(
      (sum, rows) => sum + rows.length,
      0,
    );
    const csvContent = buildCsvExport(dataMap);

    const uploadResult = await supabaseClient.storage
      .from("reports-exports")
      .upload(outputPath, new Blob([csvContent], { type: "text/csv" }), {
        upsert: true,
        contentType: "text/csv",
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const finishedAt = new Date().toISOString();
    const { error: completeError } = await supabaseClient
      .from("report_runs")
      .update({
        status: "success",
        finished_at: finishedAt,
        row_count: rowCount,
        output_bucket: "reports-exports",
        output_path: outputPath,
        output_url: outputPath,
        error_message: null,
      })
      .eq("id", run.id);

    if (completeError) throw completeError;

    if (definition.created_by) {
      await supabaseClient.from("notifications").insert({
        user_id: definition.created_by,
        type: "system",
        title: `Report Ready: ${definition.name}`,
        message: `Your scheduled report "${definition.name}" completed successfully.`,
        metadata: {
          report_id: definition.id,
          report_run_id: run.id,
          row_count: rowCount,
          link: "/reports",
        },
      });
    }

    return { success: true, rowCount, outputPath };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await supabaseClient
      .from("report_runs")
      .update({
        status: "failed",
        finished_at: finishedAt,
        error_message: errorMessage,
      })
      .eq("id", run.id);

    return { success: false, error: errorMessage };
  }
};

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceRoleJwt = getServiceRoleToken(authHeader);

    if (!isAuthorizedServiceRoleRequest(authHeader, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleJwt ?? serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const body =
      req.method === "POST"
        ? ((await req.json().catch(() => ({}))) as Record<string, unknown>)
        : {};
    const requestedReportId =
      typeof body.report_id === "string" ? body.report_id : null;
    const maxRuns = Math.min(20, Math.max(1, Number(body.max_runs || 10)));
    const enqueueDue = requestedReportId === null || body.enqueue_due !== false;

    if (requestedReportId) {
      const { data: definition, error: definitionError } = await supabaseClient
        .from("report_definitions")
        .select("id, created_by, is_active")
        .eq("id", requestedReportId)
        .single();

      if (definitionError || !definition) {
        return new Response(
          JSON.stringify({ error: "Report definition not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!definition.is_active) {
        return new Response(
          JSON.stringify({ error: "Report definition is inactive" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      await supabaseClient.from("report_runs").insert({
        report_id: requestedReportId,
        status: "queued",
        triggered_by: definition.created_by,
        triggered_via: "manual-edge-trigger",
      });
    }

    let enqueued = 0;
    if (enqueueDue) {
      const { data: enqueueData, error: enqueueError } =
        await supabaseClient.rpc("enqueue_due_reports");
      if (enqueueError) {
        console.error("enqueue_due_reports failed:", enqueueError.message);
      } else {
        enqueued = Number(enqueueData || 0);
      }
    }

    const { data: queuedRuns, error: queuedError } = await supabaseClient
      .from("report_runs")
      .select("id, report_id, triggered_by")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(maxRuns);

    if (queuedError) throw queuedError;

    const results: Array<Record<string, unknown>> = [];
    let processed = 0;
    for (const run of (queuedRuns || []) as ReportRun[]) {
      const { data: definition, error: definitionError } = await supabaseClient
        .from("report_definitions")
        .select(
          "id, name, report_type, filters, schedule_frequency, is_active, created_by",
        )
        .eq("id", run.report_id)
        .maybeSingle();

      if (definitionError || !definition) {
        const message = definitionError?.message || "Missing report definition";
        await supabaseClient
          .from("report_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: message,
          })
          .eq("id", run.id);
        results.push({ run_id: run.id, success: false, error: message });
        continue;
      }

      if (!definition.is_active) {
        await supabaseClient
          .from("report_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: "Report definition is inactive",
          })
          .eq("id", run.id);
        results.push({ run_id: run.id, success: false, error: "inactive" });
        continue;
      }

      const runResult = await processRun(
        supabaseClient,
        run,
        definition as ReportDefinition,
      );
      results.push({
        run_id: run.id,
        report_id: run.report_id,
        success: runResult.success,
        row_count: runResult.rowCount ?? null,
        output_path: runResult.outputPath ?? null,
        error: runResult.error ?? null,
      });
      processed += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        enqueued,
        processed,
        queued_found: (queuedRuns || []).length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("scheduled-reports error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
