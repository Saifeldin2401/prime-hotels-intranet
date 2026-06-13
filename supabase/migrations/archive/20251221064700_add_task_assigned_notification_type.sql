-- Add task_assigned to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_assigned';;
