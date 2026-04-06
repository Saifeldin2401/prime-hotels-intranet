# Prompt: Build PHG Connect Slack Bot Integration

## System Context

You are building a Slack bot integration for **PHG Connect** (Prime Hotels Group Intranet) - a comprehensive hotel management platform serving multi-property hotel operations. The system supports **6 organizational roles** with strict access controls and multi-property scope.

### Organizational Structure
| Role | Scope | Access Level |
|------|-------|--------------|
| Regional Admin | All properties | Full system control |
| Regional HR | All properties | HR policies, final approvals |
| Property Manager/GM | 1+ properties | Property operations, dept approvals |
| Property HR | 1 property | Staff HR matters, onboarding |
| Department Head | 1+ departments | Team leave approval, training |
| Staff | Assigned role/dept | Submit requests, complete training |

### Technical Stack
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL with RLS policies
- **Auth**: Supabase Auth with JWT
- **Secrets**: Supabase Vault (never hardcoded)
- **API URL**: `https://htsvjfrofcpkfzvjpwvx.supabase.co`

### Existing Edge Functions (for reference)
- `guest-review-notifier` - Sends critical review alerts via Slack/Email
- `training-notifications` - Training deadline reminders
- `bulk-notification-processor` - Batch notification orchestration
- `send-email` - Email delivery via Resend
- `workflow-engine` - Workflow automation

---

## Required Implementation

Create a complete Slack bot integration with the following Edge Functions and UI components. Follow the existing code patterns strictly.

### 1. Edge Functions to Create

#### A. `slack-events` - Event Subscriptions Handler
**Path**: `supabase/functions/slack-events/index.ts`

**Purpose**: Handle all incoming Slack events (messages, reactions, member joins)

**Requirements**:
```typescript
// Use existing patterns from guest-review-notifier:
- Import: import { createClient } from "jsr:@supabase/supabase-js@2";
- Import: import { buildCorsHeaders } from "../_shared/cors.ts";
- CORS: Use buildCorsHeaders(req) for all responses
- Auth: Validate Slack signing secret (NOT service role)
- Security: Use timing-safe comparison for signature verification
```

**Handle These Events**:
1. `url_verification` - Respond with challenge for Slack verification
2. `message.channels` - Route public channel messages to appropriate module
3. `message.im` - Handle DM conversations
4. `app_mention` - Respond when @mentioned
5. `member_joined_channel` - Welcome new members with training info
6. `reaction_added` - Track emoji reactions for quick responses

**Channel Routing Logic**:
```typescript
const CHANNEL_ROUTES = {
  'training-hub': handleTrainingMessage,
  'guest-reviews': handleReviewMessage,
  'operations': handleOpsMessage,
  'general': handleGeneralMessage
};

// Route based on channel name (lookup from slack_integrations table)
```

**Database Tables to Query**:
- `slack_integrations` - Get channel mappings and tokens
- `profiles` - Match Slack user to PHG user (by email)
- `user_roles` - Get user's permissions
- `learning_assignments` - Training data
- `guest_reviews` - Review data
- `notification_queue` - For queuing responses

---

#### B. `slack-commands` - Slash Command Handler
**Path**: `supabase/functions/slack-commands/index.ts`

**Purpose**: Handle slash commands (`/training`, `/reviews`, `/ops`, `/phg-help`)

**Commands to Implement**:

| Command | Access | Description |
|---------|--------|-------------|
| `/training` | All users | Show current training assignments |
| `/training @user` | Dept Head+ | Show user's training status |
| `/reviews` | Property Manager+ | Today's review summary |
| `/reviews [property]` | Regional Admin+ | Property-specific reviews |
| `/ops` | All users | Operations dashboard quick links |
| `/ops alert [message]` | Dept Head+ | Send ops alert to channel |
| `/phg-help` | All users | Show available commands |
| `/whoami` | All users | Show PHG profile linked to Slack |

**Response Format** (use Block Kit):
```typescript
interface SlackCommandResponse {
  response_type: 'ephemeral' | 'in_channel';
  blocks: Array<{
    type: 'header' | 'section' | 'actions' | 'divider' | 'context';
    text?: { type: 'plain_text' | 'mrkdwn'; text: string; emoji?: boolean };
    fields?: Array<{ type: 'mrkdwn'; text: string }>;
    elements?: Array<{ type: 'button'; text: { type: 'plain_text'; text: string }; action_id: string; url?: string; style?: 'primary' | 'danger' }>;
  }>;
}
```

**Security**:
- Validate `X-Slack-Signature` header
- Validate `X-Slack-Request-Timestamp` (reject if > 5 min old)
- Check user permissions against PHG roles
- Use `timingSafeBearerMatch` pattern for signature verification

---

#### C. `slack-interactive` - Interactive Components Handler
**Path**: `supabase/functions/slack-interactive/index.ts`

**Purpose**: Handle button clicks, modal submissions, select menus

**Actions to Handle**:
1. **Training Actions**:
   - `training_start_[module_id]` - Launch training
   - `training_remind_[user_id]` - Send reminder
   - `training_complete_[assignment_id]` - Mark complete

2. **Review Actions**:
   - `review_ack_[review_id]` - Acknowledge review alert
   - `review_escalate_[review_id]` - Escalate to manager
   - `review_assign_[review_id]` - Assign owner

3. **Ops Actions**:
   - `ops_ack_[alert_id]` - Acknowledge ops alert
   - `ops_status_[ticket_id]` - Update ticket status

**Modal Views** (for complex interactions):
- Training assignment modal (for managers)
- Review response modal
- Quick announcement modal

---

#### D. `slack-training` - Training Module Integration
**Path**: `supabase/functions/slack-training/index.ts`

**Purpose**: Deep training integration - send daily reminders, quizzes, progress updates

**Features**:
1. **Daily Training Digest** (cron-triggered):
   ```typescript
   // Query learning_assignments for users with due_date within 3 days
   // Send personalized digest to each user's DM
   ```

2. **Quiz Delivery**:
   - Send quiz questions via Slack interactive blocks
   - Track answers in `learning_progress` table
   - Show immediate feedback

3. **Progress Notifications**:
   - When user completes module → Notify manager via DM
   - Weekly team progress summary to #training-hub

**Database Integration**:
```typescript
// Tables to query:
- learning_assignments (with filters: target_type, target_id, due_date)
- learning_progress (track completion)
- training_modules (get content)
- profiles (get user names/emails)
- user_roles (check permissions)
```

---

#### E. `slack-reviews` - Guest Reviews Integration
**Path**: `supabase/functions/slack-reviews/index.ts`

**Purpose**: Review summaries and alerts in Slack

**Features**:
1. **Daily Review Summary** (cron-triggered):
   - Total reviews today
   - Average rating by platform
   - Critical reviews requiring attention
   - SLA compliance status

2. **Critical Review Alerts** (real-time via queue):
   - Severity >= high → Immediate Slack alert
   - Include AI analysis summary
   - Link to review in PHG platform

3. **Weekly Executive Digest**:
   - Sent to Regional Admin/GM
   - Property comparison
   - Trending issues
   - Response time metrics

**Integration with Existing**:
- Use `guest_review_notification_queue` table
- Leverage `guest-review-analyzer` for AI summaries
- Follow `guest-review-notifier` patterns for Slack blocks

---

### 2. UI Components to Create/Update

#### A. `SlackIntegrationPanel.tsx` (New)
**Path**: `src/pages/admin/SlackIntegrationPanel.tsx`

**Purpose**: Admin interface to configure Slack workspace connections

**Features**:
- Connect new Slack workspace
- Configure channel mappings per property
- Test connections
- View integration logs
- Manage bot permissions per channel

**Database Table**: `slack_integrations`

**Fields to Display**:
- Workspace name
- Connected properties
- Channel mappings (training-hub, guest-reviews, operations)
- Connection status
- Last error message
- Test button

#### B. Update `ChannelConfigPanel.tsx` (Existing)
**Path**: `src/pages/admin/ChannelConfigPanel.tsx` (line ~516)

**Add**:
- Slack channel selector dropdown
- Test Slack webhook button
- Channel mapping configuration
- Permission scope display

---

### 3. Database Schema Alignment

Use these exact table structures (already exist or align with existing):

#### `slack_integrations` (existing - verify columns)
```sql
SELECT * FROM slack_integrations LIMIT 1;
-- Expected columns: id, property_id, workspace_name, workspace_id, 
--   bot_token_encrypted, webhook_url_encrypted, channel_mappings, 
--   is_active, connection_status, last_connected_at, last_error_message
```

#### `notification_queue` (extended - already exists)
```typescript
// Add channel 'slack' to existing enum
// Payload structure for Slack:
{
  channel: 'slack',
  webhook_secret_name: 'SLACK_GUEST_REVIEWS_WEBHOOK', // from vault
  slack_user_id?: string, // for DMs
  blocks: SlackBlock[],
  text: string // fallback
}
```

#### New Table: `slack_user_mappings` (if needed)
```sql
CREATE TABLE IF NOT EXISTS slack_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slack_team_id)
);
```

---

### 4. Security Requirements

**CRITICAL - Follow exactly**:

1. **Secret Storage** (from memory: never hardcode API keys):
   ```typescript
   // ALWAYS use Vault - example pattern:
   async function getVaultSecret(supabase, name: string): Promise<string | null> {
     const envValue = Deno.env.get(name);
     if (envValue && envValue.trim()) return envValue.trim();
     
     const { data, error } = await supabase
       .from("vault.decrypted_secrets")
       .select("decrypted_secret")
       .filter("name", "eq", name)
       .limit(1)
       .maybeSingle();
     if (error) return null;
     return typeof data?.decrypted_secret === "string" ? data.decrypted_secret : null;
   }
   
   // Secrets to store:
   // - SLACK_BOT_TOKEN
   // - SLACK_SIGNING_SECRET
   // - SLACK_GUEST_REVIEWS_WEBHOOK
   // - SLACK_TRAINING_WEBHOOK
   // - SLACK_OPERATIONS_WEBHOOK
   ```

2. **Request Verification**:
   ```typescript
   // For Slack events/commands - verify signature:
   function verifySlackRequest(req: Request, signingSecret: string): boolean {
     const timestamp = req.headers.get('X-Slack-Request-Timestamp');
     const signature = req.headers.get('X-Slack-Signature');
     const body = req.body;
     
     // Reject if timestamp > 5 minutes old
     const now = Math.floor(Date.now() / 1000);
     if (Math.abs(now - parseInt(timestamp || '0')) > 300) return false;
     
     const sigBasestring = `v0:${timestamp}:${body}`;
     const mySignature = 'v0=' + hmacSHA256(signingSecret, sigBasestring);
     
     // Timing-safe comparison
     return timingSafeEqual(signature || '', mySignature);
   }
   ```

3. **Auth Patterns** (from existing functions):
   - For internal calls (from other edge functions): Use service role validation
   - For Slack webhooks: Use Slack signature verification
   - For user-linked actions: Validate both Slack identity AND PHG role

---

### 5. Code Patterns to Follow

**CORS Handling** (from `_shared/cors.ts`):
```typescript
import { buildCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // ... handler
});
```

**Service Role Validation** (from training-notifications):
```typescript
function isAuthorizedServiceRoleRequest(authHeader: string | null, key: string): boolean {
  if (!key) return false;
  const expected = `Bearer ${key}`;
  const actual = authHeader ?? '';
  if (actual.length !== expected.length) return false;

  const a = new TextEncoder().encode(actual);
  const b = new TextEncoder().encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
```

**Slack Block Builder** (from guest-review-notifier):
```typescript
function buildSlackBlocks(payload: Record<string, unknown>) {
  const severityEmoji = payload.severity === "critical" ? "🚨" : 
                        payload.severity === "high" ? "🔴" : 
                        payload.severity === "medium" ? "🟠" : "🟢";
  
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${severityEmoji} ${payload.title}`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Property:*\n${payload.propertyName}` },
        { type: "mrkdwn", text: `*Priority:*\n${payload.priority}` },
      ],
    },
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in PHG", emoji: true },
          style: "primary",
          url: payload.actionUrl,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Acknowledge", emoji: true },
          action_id: `ack_${payload.id}`,
        },
      ],
    },
  ];
}
```

---

### 6. Integration Points

**Training System**:
- Tables: `learning_assignments`, `learning_progress`, `training_modules`, `learning_quizzes`
- Types: Import from `src/types/learning.ts`
- Functions: Reuse logic from `training-notifications`

**Review System**:
- Tables: `guest_reviews`, `guest_review_analyses`, `guest_review_notification_queue`
- Functions: Leverage `guest-review-analyzer`, `guest-review-notifier`
- Follow severity levels: 'critical', 'high', 'medium', 'low'

**Notification System**:
- Table: `notification_queue` (channel = 'slack')
- Batch processor: `bulk-notification-processor`
- Templates: Use `notification_email_templates` pattern for Slack

**User System**:
- Table: `profiles` (link by email)
- Roles: `user_roles` table
- Properties: `user_properties`, `properties`
- Departments: `user_departments`, `departments`

---

### 7. Testing Requirements

Each function must have a test mode:

```typescript
// Test mode handling
const isTestMode = body.test_mode === true || body.test === true;

if (isTestMode) {
  // Return test response without side effects
  return new Response(JSON.stringify({ 
    success: true, 
    test: true,
    message: "Slack integration test successful",
    user: { id: 'test-user', role: 'regional_admin' }
  }), { 
    status: 200, 
    headers: corsHeaders 
  });
}
```

**Test Commands**:
```bash
# Test events endpoint
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events \
  -H "Content-Type: application/json" \
  -d '{"test_mode": true, "type": "url_verification", "challenge": "test123"}'

# Test commands endpoint
curl -X POST https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "command=/training&user_id=U123&test_mode=true"
```

---

### 8. Deployment Checklist

Before deploying each function:

- [ ] Function follows Deno serve pattern
- [ ] CORS headers implemented correctly
- [ ] Auth validation appropriate for endpoint type
- [ ] Vault secrets used (no hardcoded tokens)
- [ ] Error handling with proper logging
- [ ] Test mode implemented
- [ ] Database queries use service role client
- [ ] Response format valid JSON
- [ ] TypeScript types defined

**Deploy commands**:
```bash
# Deploy individual function
supabase functions deploy slack-events
supabase functions deploy slack-commands
supabase functions deploy slack-interactive
supabase functions deploy slack-training
supabase functions deploy slack-reviews
```

---

### 9. Expected File Structure

```
supabase/
  functions/
    slack-events/
      index.ts
      deno.json (if needed for imports)
    slack-commands/
      index.ts
    slack-interactive/
      index.ts
    slack-training/
      index.ts
    slack-reviews/
      index.ts
    _shared/
      slack-utils.ts (NEW - shared Slack utilities)
        - verifySlackRequest()
        - buildSlackBlocks()
        - sendSlackMessage()
        - getSlackUserMapping()

src/
  pages/
    admin/
      SlackIntegrationPanel.tsx (NEW)
      ChannelConfigPanel.tsx (UPDATE)
  types/
    slack.ts (NEW)
      - SlackEvent
      - SlackCommand
      - SlackBlock
      - SlackUserMapping
  lib/
    slack.ts (NEW - client-side Slack helpers)
      - testSlackConnection()
      - getSlackIntegrations()
```

---

### 10. Key URLs for Configuration

| Service | URL |
|---------|-----|
| Supabase API | `https://htsvjfrofcpkfzvjpwvx.supabase.co` |
| Edge Functions Base | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/` |
| Slack Events | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-events` |
| Slack Commands | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-commands` |
| Slack Interactive | `https://htsvjfrofcpkfzvjpwvx.supabase.co/functions/v1/slack-interactive` |

---

## Output Requirements

Provide:
1. Complete Edge Function code for all 5 functions
2. Shared utility module (`_shared/slack-utils.ts`)
3. UI component (`SlackIntegrationPanel.tsx`)
4. TypeScript types (`src/types/slack.ts`)
5. SQL for any new tables
6. Test commands for each endpoint
7. Deployment instructions

**Important**: 
- Follow existing code style exactly
- Use the same patterns as `guest-review-notifier` and `training-notifications`
- Never hardcode secrets - always use Vault
- Implement proper error handling
- Include test mode in every function
- Use Block Kit for rich Slack messages
- Align with 6-role permission system

---

## Reference: Existing Similar Functions

Study these for patterns:
- `supabase/functions/guest-review-notifier/index.ts` - Slack webhook sending
- `supabase/functions/training-notifications/index.ts` - Service role auth, cron jobs
- `supabase/functions/bulk-notification-processor/index.ts` - Queue processing
- `supabase/functions/_shared/cors.ts` - CORS handling
- `src/pages/admin/ChannelConfigPanel.tsx` - Admin UI pattern
