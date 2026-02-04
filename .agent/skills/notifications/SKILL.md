---
name: Notifications System
description: Guidelines for implementing notifications and preferences
---

# Notifications System Skill

## Overview
Multi-channel notification system with user preferences.

## Database Tables
- `notifications` - Notification records
- `notification_preferences` - User preferences
- `notification_queue` - Pending sends

## Hooks
- `useNotifications` - Read notifications
- `useNotificationPreferences` - User settings
- `useNotificationTriggers` - Send notifications
- `useBulkNotifications` - Batch operations

## Notification Types
- `approval_required`
- `request_approved` / `request_rejected`
- `training_assigned` / `training_deadline`
- `document_published`
- `announcement_new`
- `maintenance_assigned`
- `task_assigned`
- `message`
- `system`

## Channels
- In-app (always)
- Email (configurable)
- Browser push (configurable)

## Usage
```typescript
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';

const { sendNotification } = useNotificationTriggers();

await sendNotification({
  user_id: userId,
  type: 'task_assigned',
  title: 'New Task Assigned',
  message: 'You have been assigned a new task',
  entity_type: 'task',
  entity_id: taskId
});
```

## Edge Function
Email sending: `supabase/functions/send-notification/`

## Translations
Namespace: `common` (notifications section)

## Preferences Schema
```typescript
interface NotificationPreference {
  email_enabled: boolean;
  approval_email: boolean;
  training_email: boolean;
  announcement_email: boolean;
  maintenance_email: boolean;
  browser_push_enabled: boolean;
}
```
