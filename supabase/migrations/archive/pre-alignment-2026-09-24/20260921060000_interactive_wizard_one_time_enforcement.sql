-- Migration: 20260921060000_interactive_wizard_one_time_enforcement.sql
-- Description: Ensures skip_or_complete_wizard marks all orphaned not_started rows as skipped/completed
--              and cleans up existing users who have already skipped/completed.

-- 1. Replace skip_or_complete_wizard with cross-row cleanup logic
CREATE OR REPLACE FUNCTION public.skip_or_complete_wizard(
  p_wizard_id TEXT,
  p_status TEXT,
  p_org_id UUID DEFAULT NULL
)
RETURNS public.wizard_user_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_user_id UUID := auth.uid();
  v_progress public.wizard_user_progress;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_status NOT IN ('skipped', 'completed', 'in_progress', 'reset') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update target row if it exists
  UPDATE public.wizard_user_progress
  SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    last_activity_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id
    AND ((p_org_id IS NULL AND organization_id IS NULL) OR organization_id = p_org_id)
    AND wizard_id = p_wizard_id
  RETURNING * INTO v_progress;

  -- If status is skipped or completed, also cascade to any other not_started rows for this user
  -- so orphaned records from intermediate role/org evaluations never re-trigger onboarding.
  IF p_status IN ('skipped', 'completed') THEN
    UPDATE public.wizard_user_progress
    SET
      status = p_status,
      completed_at = CASE WHEN p_status = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
      last_activity_at = now(),
      updated_at = now()
    WHERE user_id = v_user_id
      AND status = 'not_started';
  END IF;

  -- If target row was not found (e.g. org/wizard mismatch), return the user's latest progress row
  IF v_progress IS NULL THEN
    SELECT * INTO v_progress
    FROM public.wizard_user_progress
    WHERE user_id = v_user_id
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  RETURN v_progress;
END;
$func$;

-- 2. Clean up existing users who already completed or skipped in one role/org but have orphaned not_started rows
UPDATE public.wizard_user_progress p
SET
  status = (
    SELECT sub.status 
    FROM public.wizard_user_progress sub
    WHERE sub.user_id = p.user_id 
      AND sub.status IN ('completed', 'skipped')
    ORDER BY 
      CASE WHEN sub.status = 'completed' THEN 1 ELSE 2 END,
      sub.updated_at DESC
    LIMIT 1
  ),
  updated_at = now(),
  last_activity_at = now()
WHERE p.status = 'not_started'
  AND EXISTS (
    SELECT 1 
    FROM public.wizard_user_progress sub2
    WHERE sub2.user_id = p.user_id 
      AND sub2.status IN ('completed', 'skipped')
  );
