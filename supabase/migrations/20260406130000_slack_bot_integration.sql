-- Slack Bot Integration Migration
-- Refined version applied on 2026-04-06

BEGIN;

-- 1. Create slack_user_mappings table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_slack_user_id ON public.slack_user_mappings(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_user_id ON public.slack_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_team_id ON public.slack_user_mappings(slack_team_id);

-- Enable RLS
ALTER TABLE public.slack_user_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using security definer helpers to avoid recursion)
DROP POLICY IF EXISTS "Users can view own slack mapping" ON public.slack_user_mappings;
CREATE POLICY "Users can view own slack mapping"
  ON public.slack_user_mappings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all slack mappings" ON public.slack_user_mappings;
CREATE POLICY "Admins can manage all slack mappings"
  ON public.slack_user_mappings FOR ALL
  USING (
    public.auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'corporate_admin', 'property_manager'])
  );

-- Trigger for updated_at
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

-- 2. Add columns to existing slack_integrations table
ALTER TABLE public.slack_integrations 
ADD COLUMN IF NOT EXISTS signing_secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bot_user_id TEXT,
ADD COLUMN IF NOT EXISTS app_id TEXT;

-- 3. Create slack_interactions table
CREATE TABLE IF NOT EXISTS public.slack_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'button', 'select', 'modal'
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
  USING (
    public.auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'corporate_admin', 'property_manager'])
  );

-- 4. Create slack_commands_log table
CREATE TABLE IF NOT EXISTS public.slack_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  channel_id TEXT,
  text TEXT,
  response_type TEXT, -- 'ephemeral', 'in_channel'
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
  USING (
    public.auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'corporate_admin', 'property_manager'])
  );

-- 5. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.slack_user_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.slack_interactions TO authenticated;
GRANT SELECT, INSERT ON public.slack_commands_log TO authenticated;

COMMIT;
