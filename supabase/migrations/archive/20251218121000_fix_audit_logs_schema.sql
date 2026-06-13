
-- 1. Drop the check constraint that enforces uppercase 'INSERT', 'UPDATE', etc.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_operation_check;

-- Rename columns to match the application code conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='operation') THEN
    ALTER TABLE public.audit_logs RENAME COLUMN operation TO action;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='table_name') THEN
    ALTER TABLE public.audit_logs RENAME COLUMN table_name TO entity_type;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='record_id') THEN
    ALTER TABLE public.audit_logs RENAME COLUMN record_id TO entity_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='changed_by') THEN
    ALTER TABLE public.audit_logs RENAME COLUMN changed_by TO user_id;
  END IF;
END $$;

-- Add new columns
ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.audit_logs 
    ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Transform existing data
-- Lowercase the action (UPDATE -> update)
UPDATE public.audit_logs 
SET action = LOWER(action);

-- Migrate old_data/new_data into details
UPDATE public.audit_logs
SET details = jsonb_build_object(
    'old', old_data,
    'new', new_data
)
WHERE details = '{}'::jsonb; 

-- Drop old columns
ALTER TABLE public.audit_logs 
    DROP COLUMN IF EXISTS old_data;

ALTER TABLE public.audit_logs 
    DROP COLUMN IF EXISTS new_data;

-- Re-establish RLS
DROP POLICY IF EXISTS "Admins and HR can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and HR can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
        )
    );
