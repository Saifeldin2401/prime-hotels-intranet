# PHG Connect Email Notification Framework

## Overview

This framework standardizes in-app and email notifications across PHG Connect using:

- `bulk-notification-processor` (batch orchestration and queue processing)
- `send-email` (single-message or custom message delivery)
- Resend for outbound email delivery
- Database-backed templates and delivery tracking

## Database Objects

Migration: `supabase/migrations/20260217120000_domain_email_notification_framework.sql`

### Extended Tables

- `notification_queue`
  - Added `channels`, `template_key`, `business_domain`, `email_payload`, `send_email`, `scheduled_for`, `priority`
- `notification_batches`
  - Added `email_sent_count`, `email_failed_count`, `last_processed_at`

### New Tables

- `notification_email_templates`
  - Stores branded templates with dynamic placeholders (`{{title}}`, `{{message}}`, `{{action_url}}`, etc.)
- `notification_delivery_events`
  - Tracks delivery status, provider message ID, attempts, errors, and payload metadata

### Helper Functions

- `create_workflow_notification_batch(...)`
  - Creates a batch + queue items with domain/template/channel metadata
- `increment_batch_email_counters(...)`
  - Updates aggregate email success/failure counts on each batch

## Supported Domains

- `system`
- `user_management`
- `operations`
- `hr`
- `finance`
- `sales`
- `management`

## Seeded Template Keys

- `user_management_welcome`
- `operations_incident_alert`
- `hr_employee_update`
- `finance_approval_alert`
- `sales_pipeline_alert`
- `management_kpi_alert`
- `system_generic_alert`

## Edge Function Payloads

### Create Batch

```json
{
  "action": "create_batch",
  "userIds": ["uuid-1", "uuid-2"],
  "notificationType": "training_assigned",
  "businessDomain": "operations",
  "templateKey": "operations_incident_alert",
  "channels": ["in_app", "email"],
  "sendEmail": true,
  "notificationData": {
    "title": "Training Assigned",
    "message": "You were assigned a new training module.",
    "link": "/learning/training/abc123",
    "priority": "high"
  }
}
```

### Process Batch

```json
{
  "action": "process_batch",
  "batchId": "batch-uuid",
  "batchSize": 50
}
```

### Get Batch Status

```json
{
  "action": "get_status",
  "batchId": "batch-uuid"
}
```

## Required Secrets

Set in Supabase project secrets:

- `RESEND_API_KEY`
- `APP_BASE_URL` (recommended: `https://phg-connect.com`)
- `EMAIL_FROM_ADDRESS` (recommended: `notifications@phg-connect.com`)
- `EMAIL_FROM_NAME` (recommended: `PHG Connect`)

## Security

- Both edge functions require a valid auth token and privileged role checks.
- Delivery tracking is written with service-role access.
- User-level access to delivery logs is limited to their own records via RLS.

## Existing UI Integrations Updated

- Training module assignment bulk notifications
- Training assignment management bulk notifications
- Announcement broadcast bulk notifications
- Frontend notification service bulk email queueing
