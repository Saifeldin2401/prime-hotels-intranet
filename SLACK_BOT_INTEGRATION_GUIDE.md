# PHG Connect Slack Bot Integration

Complete Slack bot integration for PHG Connect with training, reviews, and operations support.

## 📁 Files Created

### Database
| File | Description |
|------|-------------|
| `supabase/migrations/20260406_slack_bot_integration.sql` | Migration for slack_user_mappings, slack_interactions, slack_commands_log tables |

### Edge Functions
| File | Description |
|------|-------------|
| `supabase/functions/_shared/slack-utils.ts` | Shared utilities for Slack (verification, blocks, messages) |
| `supabase/functions/slack-events/index.ts` | Event subscriptions handler (messages, reactions, joins) |
| `supabase/functions/slack-commands/index.ts` | Slash command handler (/training, /reviews, /ops, etc.) |
| `supabase/functions/slack-interactive/index.ts` | Interactive components handler (buttons, modals) |
| `supabase/functions/slack-training/index.ts` | Training module integration (digest, quizzes, reminders) |
| `supabase/functions/slack-reviews/index.ts` | Guest reviews integration (summary, alerts, digest) |

### Frontend
| File | Description |
|------|-------------|
| `src/types/slack.ts` | TypeScript types for Slack integration |
| `src/lib/slack.ts` | Client-side Slack helpers |
| `src/pages/admin/SlackIntegrationPanel.tsx` | Admin UI for managing Slack integrations |

## 🚀 Deployment

### 1. Apply Database Migration
```bash
supabase db push
```

### 2. Deploy Edge Functions
```bash
supabase functions deploy slack-events
supabase functions deploy slack-commands
supabase functions deploy slack-interactive
supabase functions deploy slack-training
supabase functions deploy slack-reviews
```

### 3. Configure Secrets in Vault
Add these secrets to Supabase Vault:
- `SLACK_BOT_TOKEN` - Your Slack bot user OAuth token
- `SLACK_SIGNING_SECRET` - From Slack app "Basic Information"
- `SLACK_GUEST_REVIEWS_WEBHOOK` - Incoming webhook URL for reviews channel
- `SLACK_TRAINING_WEBHOOK` - Incoming webhook URL for training channel
- `SLACK_OPERATIONS_WEBHOOK` - Incoming webhook URL for ops channel

### 4. Configure Slack App

#### Event Subscriptions
- **Request URL**: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events`
- **Subscribe to events**:
  - `message.channels`
  - `message.im`
  - `app_mention`
  - `member_joined_channel`
  - `reaction_added`

#### Slash Commands
Configure these commands with URL: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands`
- `/training` - View training assignments
- `/reviews` - View guest reviews summary
- `/ops` - Operations dashboard
- `/phg-help` - Show help
- `/whoami` - Show PHG profile

#### Interactive Components
- **Request URL**: `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-interactive`

#### OAuth & Permissions
- **Bot Token Scopes**:
  - `chat:write`
  - `chat:write.public`
  - `commands`
  - `users:read`
  - `users:read.email`
  - `channels:read`
  - `im:write`

## 🧪 Testing

### Test Events Endpoint
```bash
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events \
  -H "Content-Type: application/json" \
  -d '{"test_mode": true, "type": "url_verification", "challenge": "test123"}'
```

### Test Commands Endpoint
```bash
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/training&user_id=U123&text=test_mode=true"
```

### Test Training Digest
```bash
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-training \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "send_digest"}'
```

### Test Reviews Summary
```bash
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "daily_summary"}'
```

## 📋 Available Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/training` | All users | Show your training assignments |
| `/training @user` | Dept Head+ | Show user's training status |
| `/reviews` | Manager+ | Today's review summary |
| `/reviews [property]` | Regional+ | Property-specific reviews |
| `/ops` | All users | Operations dashboard quick links |
| `/ops alert [message]` | Dept Head+ | Send ops alert |
| `/phg-help` | All users | Show available commands |
| `/whoami` | All users | Show PHG profile linked to Slack |

## 🔄 Cron Jobs (Schedule in Supabase)

### Daily Training Digest
```sql
SELECT cron.schedule(
  'slack-training-digest',
  '0 9 * * *',
  $$ SELECT net.http_post(
    url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-training',
    headers:='{"Authorization": "Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body:='{"action": "send_digest"}'::jsonb
  ) $$
);
```

### Daily Reviews Summary
```sql
SELECT cron.schedule(
  'slack-reviews-daily',
  '0 8 * * *',
  $$ SELECT net.http_post(
    url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews',
    headers:='{"Authorization": "Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body:='{"action": "daily_summary"}'::jsonb
  ) $$
);
```

### Weekly Executive Digest
```sql
SELECT cron.schedule(
  'slack-reviews-weekly',
  '0 9 * * 1',
  $$ SELECT net.http_post(
    url:='https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-reviews',
    headers:='{"Authorization": "Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body:='{"action": "executive_digest"}'::jsonb
  ) $$
);
```

## 📊 Database Tables

### slack_user_mappings
Links Slack users to PHG profiles
```sql
CREATE TABLE slack_user_mappings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_email TEXT,
  slack_username TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### slack_interactions
Logs all button clicks and interactions
```sql
CREATE TABLE slack_interactions (
  id UUID PRIMARY KEY,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  channel_id TEXT,
  message_ts TEXT,
  payload JSONB,
  phg_user_id UUID,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### slack_commands_log
Audit log for slash commands
```sql
CREATE TABLE slack_commands_log (
  id UUID PRIMARY KEY,
  command TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  channel_id TEXT,
  text TEXT,
  phg_user_id UUID,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 🔒 Security

- All requests verified with Slack signing secret
- User permissions checked against PHG roles
- Secrets stored in Supabase Vault (never hardcoded)
- RLS policies on all tables
- Service role only for internal/cron calls

## 🐛 Troubleshooting

### "Invalid signature" error
- Verify `SLACK_SIGNING_SECRET` is correct in Vault
- Check request timestamp is within 5 minutes

### "User not linked" error
- User needs to be mapped in `slack_user_mappings` table
- Can be done via OAuth flow or admin panel

### Messages not sending
- Verify `SLACK_BOT_TOKEN` has correct scopes
- Check bot is invited to channels
- Review `slack_interactions` table for errors

## 📞 Support

For issues or questions:
1. Check logs in Supabase Dashboard
2. Review `slack_commands_log` and `slack_interactions` tables
3. Test endpoints using the Testing tab in SlackIntegrationPanel
