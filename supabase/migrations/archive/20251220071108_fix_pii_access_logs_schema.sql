-- Fix pii_access_logs table to match application requirements
-- Fix pii_access_logs table conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_access_logs' AND column_name='actor_id') THEN
    ALTER TABLE public.pii_access_logs RENAME COLUMN actor_id TO accessed_by;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_access_logs' AND column_name='target_user_id') THEN
    ALTER TABLE public.pii_access_logs RENAME COLUMN target_user_id TO user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_access_logs' AND column_name='fields_accessed') THEN
    ALTER TABLE public.pii_access_logs RENAME COLUMN fields_accessed TO pii_fields;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pii_access_logs' AND column_name='reason') THEN
    ALTER TABLE public.pii_access_logs RENAME COLUMN reason TO justification;
  END IF;
END $$;

-- Add missing columns
ALTER TABLE public.pii_access_logs 
  ADD COLUMN IF NOT EXISTS resource_type TEXT,
  ADD COLUMN IF NOT EXISTS resource_id UUID,
  ADD COLUMN IF NOT EXISTS access_type TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update the logging function
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_access_type TEXT,
  p_pii_fields TEXT[],
  p_justification TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pii_access_logs (
    accessed_by,
    user_id,
    resource_type,
    resource_id,
    access_type,
    pii_fields,
    justification,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_access_type,
    p_pii_fields,
    p_justification,
    NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', ''),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;
;
