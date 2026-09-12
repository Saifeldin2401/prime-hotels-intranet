import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// This was a generic trigger/workflow-rule engine: it read active rules from
// trigger_rules, matched them against an incoming event, and dispatched
// actions (including invoking workflow-engine against workflow_executions).
// trigger_rules, system_automations_config, workflow_executions and
// workflow-engine's own dependencies (workflow_definitions, workflow_steps,
// requests, request_steps, request_events) never made it into the current
// multi-tenant schema — the core "fetch active rules" query threw on every
// invocation. Neutralized rather than patched, since there's no rule/workflow
// storage left to restore it against.
Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      error: "This trigger/workflow endpoint has been deprecated, neutralized, and permanently disabled.",
      status: 410,
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});
