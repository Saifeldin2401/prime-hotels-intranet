-- Add missing notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_overdue';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'promotion_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'transfer_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'message_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mention';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_due_soon';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_overdue';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_completed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sop_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sop_quiz_required';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sop_quiz_passed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sop_quiz_failed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system';;
