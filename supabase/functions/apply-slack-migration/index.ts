import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      error: "This migration endpoint has been deprecated, neutralized, and permanently disabled.",
      status: 410,
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});
