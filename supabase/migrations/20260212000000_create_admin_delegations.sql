-- Create admin_delegations table with advanced control fields

CREATE TABLE IF NOT EXISTS public.admin_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegation_type TEXT NOT NULL DEFAULT 'approval_authority' CHECK (delegation_type IN ('full_access', 'specific_permissions', 'approval_authority')),
  permissions TEXT[] DEFAULT '{}'::text[],
  reason TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_approvals INTEGER,
  approvals_used INTEGER DEFAULT 0,
  allow_redelegate BOOLEAN DEFAULT FALSE,
  fallback_delegate_ids UUID[] DEFAULT '{}'::uuid[],
  notify_delegate BOOLEAN DEFAULT TRUE,
  notify_delegator BOOLEAN DEFAULT TRUE,
  notify_on_action BOOLEAN DEFAULT TRUE,
  notify_on_expiry BOOLEAN DEFAULT TRUE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'admin_delegations' AND constraint_name = 'admin_delegations_valid_range'
  ) THEN
    ALTER TABLE public.admin_delegations
      ADD CONSTRAINT admin_delegations_valid_range CHECK (ends_at > starts_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'admin_delegations' AND constraint_name = 'admin_delegations_max_approvals_check'
  ) THEN
    ALTER TABLE public.admin_delegations
      ADD CONSTRAINT admin_delegations_max_approvals_check
      CHECK (max_approvals IS NULL OR max_approvals >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_delegations_delegator ON public.admin_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_admin_delegations_delegate ON public.admin_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_admin_delegations_active ON public.admin_delegations(is_active, ends_at);
CREATE INDEX IF NOT EXISTS idx_admin_delegations_fallbacks ON public.admin_delegations USING GIN (fallback_delegate_ids);

ALTER TABLE public.admin_delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_delegations_select" ON public.admin_delegations;
CREATE POLICY "admin_delegations_select"
  ON public.admin_delegations FOR SELECT
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR delegate_id = auth.uid()
    OR auth.uid() = ANY(fallback_delegate_ids)
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "admin_delegations_insert" ON public.admin_delegations;
CREATE POLICY "admin_delegations_insert"
  ON public.admin_delegations FOR INSERT
  TO authenticated
  WITH CHECK (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "admin_delegations_update" ON public.admin_delegations;
CREATE POLICY "admin_delegations_update"
  ON public.admin_delegations FOR UPDATE
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  )
  WITH CHECK (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

DROP POLICY IF EXISTS "admin_delegations_delete" ON public.admin_delegations;
CREATE POLICY "admin_delegations_delete"
  ON public.admin_delegations FOR DELETE
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );
