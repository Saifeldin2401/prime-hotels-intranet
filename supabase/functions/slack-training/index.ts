import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// See slack-commands/index.ts — the Slack bot integration depended on tables
// (slack_user_mappings, slack_integrations, learning_progress, learning_quiz_questions,
// user_departments, user_properties) that never made it into the current
// multi-tenant schema. Neutralized.
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
