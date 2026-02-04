---
name: Supabase Database
description: Guidelines for database operations, migrations, and RLS policies in PRIME Hotels
---

# Supabase Database Skill

## Overview
PRIME Hotels uses Supabase as its backend, providing PostgreSQL database, authentication, storage, and edge functions.

## Project Configuration

### Supabase Client
Located in `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables
Required in `.env.development` and `.env.production`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

### Core Tables

#### `profiles` (User Profiles)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  hire_date DATE,
  job_title TEXT,
  staff_id TEXT UNIQUE,
  reporting_to UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  is_temp_password BOOLEAN DEFAULT true,
  password_initialized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `properties` (Hotel Properties)
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `departments`
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enum
CREATE TYPE app_role AS ENUM ('staff', 'manager', 'admin', 'super_admin');
```

### Key Tables by Feature

| Feature | Tables |
|---------|--------|
| Tasks | `tasks`, `task_comments`, `task_attachments`, `task_watchers` |
| Training | `training_modules`, `training_content_blocks`, `learning_assignments`, `training_progress`, `training_certificates` |
| Knowledge | `knowledge_articles`, `knowledge_categories`, `knowledge_questions`, `knowledge_acknowledgments` |
| Documents | `documents`, `document_versions`, `document_approvals`, `document_acknowledgments` |
| Maintenance | `maintenance_tickets`, `maintenance_comments`, `maintenance_attachments` |
| Leave | `leave_requests` |
| Announcements | `announcements`, `announcement_targets`, `announcement_reads` |
| Messaging | `messages`, `message_attachments`, `conversations` |
| Notifications | `notifications`, `notification_preferences` |
| Approvals | `approval_requests`, `temporary_approvers`, `escalation_rules` |
| Onboarding | `onboarding_templates`, `onboarding_tasks`, `onboarding_progress` |
| Jobs | `job_postings`, `job_applications` |
| HR | `employee_promotions`, `employee_transfers` |
| Audit | `audit_logs`, `pii_access_logs` |

## Naming Conventions

### Tables
- Use **snake_case**, **plural** names
- Examples: `training_modules`, `leave_requests`, `notification_preferences`

### Columns
- Use **snake_case**
- Foreign keys: `{table}_id` (e.g., `property_id`, `department_id`)
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Booleans: `is_` prefix (e.g., `is_active`, `is_read`)
- User references: `{action}_by` or `{action}_by_id` (e.g., `created_by`, `approved_by_id`)

### Enums
- Use **snake_case** values
- Examples: `'pending'`, `'in_progress'`, `'completed'`, `'all_properties'`

## Migrations

### Location
All migrations are in `supabase/migrations/`

### Naming Convention
```
{timestamp}_{description}.sql
Example: 20251218000300_create_onboarding_schema.sql
```

### Creating a Migration

**ALWAYS run `/database-changes` workflow before modifying schema!**

#### Via MCP Tool (Recommended)
```typescript
mcp_supabase-mcp-server_apply_migration({
  project_id: "your-project-id",
  name: "add_new_feature",
  query: `
    CREATE TABLE new_feature (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `
});
```

#### Via SQL File
Create file: `supabase/migrations/{timestamp}_{name}.sql`
```sql
-- Migration: Add new feature
-- Description: Creates table for new feature

CREATE TABLE new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view new_feature"
  ON new_feature FOR SELECT
  USING (auth.role() = 'authenticated');
```

## Row Level Security (RLS)

### CRITICAL: RLS is mandatory for all tables

Every table must have:
1. RLS enabled: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. Appropriate policies for SELECT, INSERT, UPDATE, DELETE

### Common Policy Patterns

#### Authenticated Users Can Read
```sql
CREATE POLICY "Authenticated users can view"
  ON table_name FOR SELECT
  USING (auth.role() = 'authenticated');
```

#### Users Can Only See Their Own Data
```sql
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

#### Property-Based Access
```sql
CREATE POLICY "Users can view property data"
  ON table_name FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM user_properties WHERE user_id = auth.uid()
    )
  );
```

#### Role-Based Access
```sql
CREATE POLICY "Admins can manage"
  ON table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
```

#### Manager Can See Department Staff
```sql
CREATE POLICY "Managers can view department"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.reporting_to = profiles.id
    )
  );
```

## Querying Data

### Basic Queries
```typescript
// Select all
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// Select with filter
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });

// Select with relations
const { data, error } = await supabase
  .from('tasks')
  .select(`
    *,
    assigned_to:profiles!assigned_to_id(id, full_name, avatar_url),
    property:properties(id, name)
  `);
```

### Insert
```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert({
    title: 'New Task',
    assigned_to_id: userId,
    status: 'todo'
  })
  .select()
  .single();
```

### Update
```typescript
const { data, error } = await supabase
  .from('tasks')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('id', taskId)
  .select()
  .single();
```

### Delete (Soft Delete Preferred)
```typescript
// Soft delete
const { error } = await supabase
  .from('tasks')
  .update({ is_active: false, deleted_at: new Date().toISOString() })
  .eq('id', taskId);

// Hard delete (only when appropriate)
const { error } = await supabase
  .from('tasks')
  .delete()
  .eq('id', taskId);
```

### RPC (Stored Procedures)
```typescript
const { data, error } = await supabase
  .rpc('get_task_stats', { user_id: userId });
```

## Edge Functions

Located in `supabase/functions/`:
- `approval-escalation/` - Auto-escalate overdue approvals
- `training-notifications/` - Send training reminders
- `manager-report/` - Generate manager reports

### Creating Edge Function
```typescript
// supabase/functions/my-function/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  const { data } = await req.json();
  
  // Process data
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## Common Patterns

### Soft Deletes
All important tables use soft deletes:
```sql
is_active BOOLEAN DEFAULT true,
deleted_at TIMESTAMPTZ
```

Always filter by `is_active = true` in queries.

### Audit Trails
Include audit columns:
```sql
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now(),
created_by UUID REFERENCES profiles(id),
updated_by UUID REFERENCES profiles(id)
```

### Entity Status
Common status enum used across tables:
```sql
CREATE TYPE entity_status AS ENUM (
  'draft', 'pending', 'in_progress', 'review', 
  'approved', 'rejected', 'completed', 'cancelled'
);
```

## Validation Checklist

Before applying migrations:

- [ ] Run `/database-changes` workflow
- [ ] RLS is enabled on new tables
- [ ] Appropriate policies created
- [ ] Foreign keys have proper cascading
- [ ] Indexes added for frequently queried columns
- [ ] Audit columns included
- [ ] TypeScript types updated in `src/lib/types.ts`
- [ ] Test in development before production

## Security Rules

### ❌ NEVER Do These
- Bypass RLS with service role key in frontend
- Store sensitive data without encryption
- Expose service role key to client
- Delete from `auth.users` directly
- Create tables without RLS policies

### ✅ Always Do These
- Use RLS for all data access
- Validate input on both client and server
- Use parameterized queries (Supabase handles this)
- Log sensitive data access to audit tables
- Test RLS policies thoroughly
