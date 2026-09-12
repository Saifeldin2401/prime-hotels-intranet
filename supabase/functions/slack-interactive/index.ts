import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// See slack-commands/index.ts — the Slack bot integration depended on tables
// (slack_users, slack_user_mappings, slack_interactions, guest_reviews,
// guest_review_activity, learning_progress, properties, user_departments,
// user_properties) that never made it into the current multi-tenant schema.
// Neutralized.
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
