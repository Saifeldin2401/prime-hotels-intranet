-- Fix restrictive notification type check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add INSERT policy for notifications
-- Allowing authenticated users to create notifications. 
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can insert notifications'
    ) THEN
        CREATE POLICY "Users can insert notifications"
        ON public.notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;
;
