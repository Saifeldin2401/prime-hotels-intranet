# Slack Bot Deployment Checklist

## ✅ Completed (Automated)

### Edge Functions Deployed (6 total)
1. ✅ `slack-events` - Event subscriptions handler
2. ✅ `slack-commands` - Slash command handler  
3. ✅ `slack-interactive` - Interactive components handler
4. ✅ `slack-training` - Training integration
5. ✅ `slack-reviews` - Reviews integration
6. ✅ `apply-slack-migration` - Temporary migration helper

**Deployed to:** https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/

---

## ⏳ Remaining (Manual Steps)

### Step 1: Apply Database Migration

**Option A: Via SQL Editor (Recommended)**
1. Go to https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/sql/new
2. Copy and paste the SQL below
3. Click "Run"

**Option B: Via Migration Function**
```bash
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/apply-slack-migration \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Migration SQL:**
```sql
-- Create slack_user_mappings table
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

CREATE POLICY "Users can view own slack mapping"
  ON public.slack_user_mappings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all slack mappings"
  ON public.slack_user_mappings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'corporate_admin', 'property_manager')));

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

CREATE POLICY "Admins can view command logs"
  ON public.slack_commands_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('regional_admin', 'corporate_admin', 'property_manager')));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.slack_user_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.slack_interactions TO authenticated;
GRANT SELECT, INSERT ON public.slack_commands_log TO authenticated;
```

---

### Step 2: Create Secrets in Vault

Go to https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/vault/secrets

Add the following secrets:

| Name | Value | Description |
|------|-------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-your-bot-token` | From Slack App > OAuth & Permissions |
| `SLACK_SIGNING_SECRET` | `your-signing-secret` | From Slack App > Basic Information |
| `SLACK_GUEST_REVIEWS_WEBHOOK` | `https://hooks.slack.com/...` | Incoming Webhook for #guest-reviews |
| `SLACK_TRAINING_WEBHOOK` | `https://hooks.slack.com/...` | Incoming Webhook for #training-hub |
| `SLACK_OPERATIONS_WEBHOOK` | `https://hooks.slack.com/...` | Incoming Webhook for #operations |

---

### Step 3: Configure Slack App

1. Go to https://api.slack.com/apps
2. Create New App > From scratch
3. Name: "PHG Connect"
4. Select your workspace

#### Event Subscriptions
- Enable Events: **ON**
- Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events`
- Subscribe to bot events:
  - `message.channels`
  - `message.im`
  - `app_mention`
  - `member_joined_channel`
  - `reaction_added`

#### Slash Commands
Create these commands (all using same Request URL):
- Command: `/training`
  - Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
  - Short description: "View your training assignments"
- Command: `/reviews`
  - Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
  - Short description: "View guest reviews summary"
- Command: `/ops`
  - Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
  - Short description: "Operations dashboard"
- Command: `/phg-help`
  - Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
  - Short description: "Show available commands"
- Command: `/whoami`
  - Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
  - Short description: "Show your PHG profile"

#### Interactive Components
- Enable: **ON**
- Request URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-interactive`

#### OAuth & Permissions
- Redirect URLs: Add your frontend URL (e.g., `https://phg-connect.com`)
- Scopes (Bot Token):
  - `chat:write`
  - `chat:write.public`
  - `commands`
  - `users:read`
  - `users:read.email`
  - `channels:read`
  - `im:write`

Install to Workspace and copy the Bot User OAuth Token to Vault.

---

### Step 4: Set Up Cron Jobs

Go to https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/database/cron

Or run via SQL Editor:

```sql
-- Daily training digest at 9 AM
SELECT cron.schedule(
  'slack-training-digest',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-training',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"action": "send_digest"}'
  )
  $$
);

-- Daily reviews summary at 8 AM
SELECT cron.schedule(
  'slack-reviews-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"action": "daily_summary"}'
  )
  $$
);

-- Weekly executive digest on Mondays at 9 AM
SELECT cron.schedule(
  'slack-reviews-weekly',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"action": "executive_digest"}'
  )
  $$
);
```

---

### Step 5: Test the Integration

```bash
# Test events endpoint
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events \
  -H "Content-Type: application/json" \
  -d '{"test_mode": true, "type": "url_verification", "challenge": "test123"}'

# Test commands endpoint  
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/training&user_id=U123&text=test_mode=true"

# Test training digest (requires service role)
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-training \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "send_digest"}'
```

---

### Step 6: Clean Up

After successful migration, delete the temporary function:
```bash
supabase functions delete apply-slack-migration
```

---

## 📊 Summary

| Component | Status | URL |
|-----------|--------|-----|
| slack-events | ✅ Deployed | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events` |
| slack-commands | ✅ Deployed | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands` |
| slack-interactive | ✅ Deployed | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-interactive` |
| slack-training | ✅ Deployed | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-training` |
| slack-reviews | ✅ Deployed | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews` |
| Database Tables | ⏳ Pending | Run SQL above |
| Vault Secrets | ⏳ Pending | Add via Dashboard |
| Cron Jobs | ⏳ Pending | Run SQL above |
| Slack App Config | ⏳ Pending | Follow steps above |

---

## 🆘 Troubleshooting

### "Invalid signature" error
- Verify `SLACK_SIGNING_SECRET` in Vault matches Slack App

### "User not linked" error  
- User needs entry in `slack_user_mappings` table

### Functions not responding
- Check logs at: https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/functions

### Database errors
- Verify all tables created via: https://supabase.com/dashboard/project/htsvjfrofcpkfzvjpwvx/database/tables
