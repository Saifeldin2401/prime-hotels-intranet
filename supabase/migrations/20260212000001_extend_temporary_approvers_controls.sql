-- Extend temporary_approvers with advanced controls and update policies for fallback delegates

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'fallback_delegate_ids'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN fallback_delegate_ids UUID[] DEFAULT '{}'::uuid[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'max_approvals'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN max_approvals INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'approvals_used'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN approvals_used INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'allow_redelegate'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN allow_redelegate BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'notify_delegate'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN notify_delegate BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'notify_delegator'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN notify_delegator BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'notify_on_action'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN notify_on_action BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temporary_approvers' AND column_name = 'notify_on_expiry'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD COLUMN notify_on_expiry BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'temporary_approvers' AND constraint_name = 'temporary_approvers_max_approvals_check'
  ) THEN
    ALTER TABLE public.temporary_approvers
      ADD CONSTRAINT temporary_approvers_max_approvals_check
      CHECK (max_approvals IS NULL OR max_approvals >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_temporary_approvers_fallbacks ON public.temporary_approvers USING GIN (fallback_delegate_ids);

-- Update temporary_approvers select policy to include fallback delegates
ALTER TABLE public.temporary_approvers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temporary_approvers_select_delegation" ON public.temporary_approvers;
CREATE POLICY "temporary_approvers_select_delegation"
  ON public.temporary_approvers FOR SELECT
  TO authenticated
  USING (
    delegator_id = auth.uid()
    OR delegate_id = auth.uid()
    OR auth.uid() = ANY(fallback_delegate_ids)
    OR public.has_role(auth.uid(), 'regional_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'regional_hr'::public.app_role)
    OR public.has_role(auth.uid(), 'property_hr'::public.app_role)
  );

-- Update can_user_act_on_document_approval to support fallback delegates and limits
CREATE OR REPLACE FUNCTION public.can_user_act_on_document_approval(
  p_user_id UUID,
  p_approval_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.document_approvals da
    JOIN public.documents d ON d.id = da.document_id
    WHERE da.id = p_approval_id
      AND da.status = 'pending'
      AND da.is_active = TRUE
      AND (
        da.approver_id = p_user_id
        OR public.has_role(p_user_id, 'regional_admin')
        OR EXISTS (
          SELECT 1
          FROM public.temporary_approvers ta
          WHERE ta.delegator_id = da.approver_id
            AND (ta.delegate_id = p_user_id OR p_user_id = ANY(ta.fallback_delegate_ids))
            AND ta.start_at <= now()
            AND ta.end_at >= now()
            AND (ta.max_approvals IS NULL OR ta.approvals_used < ta.max_approvals)
            AND (
              (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
               AND ta.entity_type = 'document_approval'
               AND ta.entity_id = p_approval_id)
              OR
              (ta.entity_type IS NULL AND ta.entity_id IS NULL
               AND (
                 ta.scope_type = 'all'
                 OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
                 OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
               ))
            )
        )
      )
  );
$$;

-- Update document_approvals_update_approver_or_delegate policy
DROP POLICY IF EXISTS "document_approvals_update_approver_or_delegate" ON public.document_approvals;
CREATE POLICY "document_approvals_update_approver_or_delegate"
ON public.document_approvals
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND is_active = TRUE
  AND (
    approver_id = auth.uid()
    OR public.has_role(auth.uid(), 'regional_admin')
    OR EXISTS (
      SELECT 1
      FROM public.temporary_approvers ta
      JOIN public.documents d ON d.id = document_approvals.document_id
      WHERE ta.delegator_id = document_approvals.approver_id
        AND (ta.delegate_id = auth.uid() OR auth.uid() = ANY(ta.fallback_delegate_ids))
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (ta.max_approvals IS NULL OR ta.approvals_used < ta.max_approvals)
        AND (
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
           AND ta.entity_type = 'document_approval'
           AND ta.entity_id = document_approvals.id)
          OR
          (ta.entity_type IS NULL AND ta.entity_id IS NULL
           AND (
             ta.scope_type = 'all'
             OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
             OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
           ))
        )
    )
  )
)
WITH CHECK (
  status IN ('pending', 'approved', 'rejected')
);

-- Update document_approvals_select_approver_or_delegate policy
DROP POLICY IF EXISTS "document_approvals_select_approver_or_delegate" ON public.document_approvals;
CREATE POLICY "document_approvals_select_approver_or_delegate"
ON public.document_approvals
FOR SELECT
TO authenticated
USING (
  approver_id = auth.uid()
  OR public.has_role(auth.uid(), 'regional_admin')
  OR EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.temporary_approvers ta ON ta.delegator_id = document_approvals.approver_id
    WHERE d.id = document_approvals.document_id
      AND (ta.delegate_id = auth.uid() OR auth.uid() = ANY(ta.fallback_delegate_ids))
      AND ta.start_at <= now()
      AND ta.end_at >= now()
      AND (
        (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
         AND ta.entity_type = 'document_approval'
         AND ta.entity_id = document_approvals.id)
        OR
        (ta.entity_type IS NULL AND ta.entity_id IS NULL
         AND (
           ta.scope_type = 'all'
           OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
           OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
         ))
      )
  )
);

-- Update approval_requests_select policy to support fallback delegates
DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
CREATE POLICY "approval_requests_select"
  ON public.approval_requests FOR SELECT
  TO authenticated
  USING (
    current_approver_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    EXISTS (
      SELECT 1 FROM public.temporary_approvers ta
      WHERE (ta.delegate_id = auth.uid() OR auth.uid() = ANY(ta.fallback_delegate_ids))
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL
           AND ta.entity_type = approval_requests.entity_type
           AND ta.entity_id = approval_requests.entity_id)
          OR
          (ta.entity_type IS NULL AND ta.entity_id IS NULL
           AND (
             ta.scope_type = 'all' OR
             (ta.scope_type = 'property' AND ta.scope_id IN (
               SELECT property_id FROM user_properties WHERE user_id = approval_requests.current_approver_id
             )) OR
             (ta.scope_type = 'department' AND ta.scope_id IN (
               SELECT department_id FROM user_departments WHERE user_id = approval_requests.current_approver_id
             ))
           ))
        )
        AND ta.delegator_id = approval_requests.current_approver_id
    )
  );
