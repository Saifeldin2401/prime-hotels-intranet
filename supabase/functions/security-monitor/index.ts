import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSlackWebhook } from "../_shared/slack-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("SLACK_SECURITY_WEBHOOK");
    if (!webhookUrl) {
      console.log("No security webhook configured, skipping alerts.");
      return new Response(JSON.stringify({ status: "skipped" }), { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the last 5 minutes of high severity security logs
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Fallback if security_audit_log does not exist yet
    let { data: logs, error } = await supabase
      .from("security_audit_logs")
      .select("*")
      .gte("created_at", fiveMinutesAgo)
      .in("severity", ["high", "critical"]);
      
    if (error && error.code === "42P01") {
      // Table doesn't exist, ignore
      return new Response(JSON.stringify({ status: "skipped", reason: "no table" }), { headers: corsHeaders });
    } else if (error) {
      console.error("Failed to query audit logs:", error);
    }

    if (logs && logs.length > 0) {
      const formattedAlerts = logs.slice(0, 10).map((log) => {
        return `• *[${log.severity.toUpperCase()}]* ${log.event_type} - User: ${log.user_id || 'Unknown'} - IP: ${log.ip_address || 'Unknown'}\n\`\`\`${JSON.stringify(log.details || {})}\`\`\``;
      }).join("\n\n");

      await sendSlackWebhook(webhookUrl, {
        text: `🚨 *CRITICAL SECURITY ANOMALIES DETECTED* 🚨`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🚨 Active Security Alerts", emoji: true }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${logs.length} high/critical events detected in the last 5 minutes.*\n\n${formattedAlerts}`
            }
          }
        ]
      });
    }

    return new Response(JSON.stringify({ status: "success", alerted: logs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Monitor error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
