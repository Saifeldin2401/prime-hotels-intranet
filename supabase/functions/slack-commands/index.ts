import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// The Slack bot integration (this function, slack-events, slack-interactive,
// slack-training, and the slack_users/slack_user_mappings/slack_integrations/
// slack_interactions/slack_commands_log tables it depended on) never made it
// into the current multi-tenant schema. Every code path here crashed on
// missing tables the moment it was actually invoked, so it's neutralized
// rather than left broken.
Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      error: "This Slack integration endpoint has been deprecated, neutralized, and permanently disabled.",
      status: 410,
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});
