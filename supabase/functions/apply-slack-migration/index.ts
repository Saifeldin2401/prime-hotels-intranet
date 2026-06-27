/**
 * Temporary migration helper - applies Slack bot integration tables
 * Run once then delete
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const MIGRATION_SQL = `
-- Create slack_user_mappings table if not exists
CREATE TABLE IF NOT EXISTS public.slack_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_email TEXT,
  slack_username TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slack_team_id),
  UNIQUE(slack_user_id, slack_team_id)
);

COMMENT ON TABLE public.slack_user_mappings IS 'Maps PHG Connect users to Slack users for bot interactions';

CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_slack_user_id ON public.slack_user_mappings(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_user_id ON public.slack_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_team_id ON public.slack_user_mappings(slack_team_id);

ALTER TABLE public.slack_user_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own slack mapping" ON public.slack_user_mappings;
CREATE POLICY "Users can view own slack mapping"
  ON public.slack_user_mappings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all slack mappings" ON public.slack_user_mappings;
CREATE POLICY "Admins can manage all slack mappings"
  ON public.slack_user_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'corporate_admin', 'property_manager')));

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_slack_user_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_slack_user_mapping_timestamp ON public.slack_user_mappings;
CREATE TRIGGER update_slack_user_mapping_timestamp
  BEFORE UPDATE ON public.slack_user_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_slack_user_mapping_updated_at();

-- Add columns to slack_integrations
ALTER TABLE public.slack_integrations ADD COLUMN IF NOT EXISTS signing_secret_encrypted TEXT;
ALTER TABLE public.slack_integrations ADD COLUMN IF NOT EXISTS bot_user_id TEXT;
ALTER TABLE public.slack_integrations ADD COLUMN IF NOT EXISTS app_id TEXT;

-- Create slack_interactions table
CREATE TABLE IF NOT EXISTS public.slack_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  channel_id TEXT,
  message_ts TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  phg_user_id UUID REFERENCES public.profiles(id),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_interactions_user ON public.slack_interactions(slack_user_id, slack_team_id);
CREATE INDEX IF NOT EXISTS idx_slack_interactions_action ON public.slack_interactions(action_id);
CREATE INDEX IF NOT EXISTS idx_slack_interactions_processed ON public.slack_interactions(processed) WHERE processed = false;

ALTER TABLE public.slack_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view slack interactions" ON public.slack_interactions;
CREATE POLICY "Admins can view slack interactions"
  ON public.slack_interactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'corporate_admin', 'property_manager')));

-- Create slack_commands_log table
CREATE TABLE IF NOT EXISTS public.slack_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  channel_id TEXT,
  text TEXT,
  response_type TEXT,
  phg_user_id UUID REFERENCES public.profiles(id),
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slack_commands_log_user ON public.slack_commands_log(slack_user_id, slack_team_id);
CREATE INDEX IF NOT EXISTS idx_slack_commands_log_command ON public.slack_commands_log(command);

ALTER TABLE public.slack_commands_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view command logs" ON public.slack_commands_log;
CREATE POLICY "Admins can view command logs"
  ON public.slack_commands_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'corporate_admin', 'property_manager')));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.slack_user_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.slack_interactions TO authenticated;
GRANT SELECT, INSERT ON public.slack_commands_log TO authenticated;
`;

function verifyServiceRole(
  authHeader: string | null,
  serviceRoleKey: string,
): boolean {
  if (!authHeader || !serviceRoleKey) return false;
  const expected = `Bearer ${serviceRoleKey}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify service role
    const authHeader = req.headers.get("Authorization");
    if (!verifyServiceRole(authHeader, serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Execute migration SQL
    const { error } = await supabase.rpc("exec_sql", { sql: MIGRATION_SQL });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration applied successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
