-- Add invitation tracking and push subscription storage for newly introduced admin/features UI.

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  role public.app_role NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token_hash text,
  invite_url text,
  accepted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_auth_user_id
  ON public.user_invitations(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_invitations_email
  ON public.user_invitations(lower(email));

CREATE INDEX IF NOT EXISTS idx_user_invitations_status
  ON public.user_invitations(status, invited_at DESC);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_invitations_admin_select ON public.user_invitations;
CREATE POLICY user_invitations_admin_select
  ON public.user_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
  );

DROP POLICY IF EXISTS user_invitations_admin_insert ON public.user_invitations;
CREATE POLICY user_invitations_admin_insert
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
  );

DROP POLICY IF EXISTS user_invitations_admin_update ON public.user_invitations;
CREATE POLICY user_invitations_admin_update
  ON public.user_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
  )
  WITH CHECK (
    invited_by = auth.uid()
    OR public.has_role_optimized('corporate_admin'::public.app_role)
    OR public.has_role_optimized('regional_admin'::public.app_role)
    OR public.has_role_optimized('regional_hr'::public.app_role)
  );

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
