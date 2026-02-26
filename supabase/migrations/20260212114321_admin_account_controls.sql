-- Phase 1: Admin account action controls (notes, suspension scheduling)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

-- Admin action notes for user accounts
CREATE TABLE IF NOT EXISTS public.account_action_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  note text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_action_notes_user_id
  ON public.account_action_notes(user_id, created_at DESC);

ALTER TABLE public.account_action_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_action_notes_select ON public.account_action_notes;
DROP POLICY IF EXISTS account_action_notes_insert ON public.account_action_notes;

CREATE POLICY account_action_notes_select
  ON public.account_action_notes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr')
  );

CREATE POLICY account_action_notes_insert
  ON public.account_action_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'property_hr')
  );

-- Auto-reactivate accounts once suspension ends
CREATE OR REPLACE FUNCTION public.auto_reactivate_suspended_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET account_status = 'active',
      is_active = true,
      suspended_at = NULL,
      suspended_by = NULL,
      suspend_reason = NULL,
      suspended_until = NULL,
      updated_at = now()
  WHERE account_status = 'suspended'
    AND suspended_until IS NOT NULL
    AND suspended_until <= now();
END;
$$;

-- Schedule (enable if pg_cron is available)
-- SELECT cron.schedule('auto-reactivate-suspended-accounts', '0 * * * *', 'SELECT public.auto_reactivate_suspended_accounts();');;
