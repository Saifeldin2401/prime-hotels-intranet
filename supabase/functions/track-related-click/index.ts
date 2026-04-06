import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const { sourceDocumentId, clickedDocumentId, position } = await req.json();

    if (!sourceDocumentId || !clickedDocumentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "sourceDocumentId and clickedDocumentId are required",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get user ID from auth
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    console.log(
      `Tracking click: ${sourceDocumentId} -> ${clickedDocumentId} by user ${user?.id}`,
    );

    // Call the database function to track the click
    const { error } = await supabaseClient.rpc("track_related_article_click", {
      p_source_doc_id: sourceDocumentId,
      p_clicked_doc_id: clickedDocumentId,
      p_user_id: user?.id || null,
      p_position: position || null,
    });

    if (error) {
      console.error("Error tracking click:", error);
      throw error;
    }

    console.log(`Successfully tracked click`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Click tracked successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
