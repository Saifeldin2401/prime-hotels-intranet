-- Backfill admin_delegations with advanced control fields and policies

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'max_approvals'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN max_approvals INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'approvals_used'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN approvals_used INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'allow_redelegate'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN allow_redelegate BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'fallback_delegate_ids'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN fallback_delegate_ids UUID[] DEFAULT '{}'::uuid[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'notify_delegate'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN notify_delegate BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'notify_delegator'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN notify_delegator BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'notify_on_action'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN notify_on_action BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_delegations' AND column_name = 'notify_on_expiry'
  ) THEN
    ALTER TABLE public.admin_delegations ADD COLUMN notify_on_expiry BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

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
  );;
