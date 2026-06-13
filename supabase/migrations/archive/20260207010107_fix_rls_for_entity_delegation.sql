-- Fix RLS policies to support approval-specific delegation (entity_type/entity_id)
-- This migration updates the RLS policies and helper functions to check entity_type/entity_id
-- when present in temporary_approvers, falling back to scope-based checks when null

-- Update can_user_act_on_document_approval function to check entity_type/entity_id
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
            AND ta.delegate_id = p_user_id
            AND ta.start_at <= now()
            AND ta.end_at >= now()
            AND (
              -- If entity_type/entity_id are set, check for exact match
              (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL 
               AND ta.entity_type = 'document_approval' 
               AND ta.entity_id = p_approval_id)
              OR
              -- If entity_type/entity_id are null, use scope-based delegation
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
        AND ta.delegate_id = auth.uid()
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (
          -- If entity_type/entity_id are set, check for exact match
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL 
           AND ta.entity_type = 'document_approval' 
           AND ta.entity_id = document_approvals.id)
          OR
          -- If entity_type/entity_id are null, use scope-based delegation
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
      AND ta.delegate_id = auth.uid()
      AND ta.start_at <= now()
      AND ta.end_at >= now()
      AND (
        -- If entity_type/entity_id are set, check for exact match
        (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL 
         AND ta.entity_type = 'document_approval' 
         AND ta.entity_id = document_approvals.id)
        OR
        -- If entity_type/entity_id are null, use scope-based delegation
        (ta.entity_type IS NULL AND ta.entity_id IS NULL
         AND (
           ta.scope_type = 'all'
           OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
           OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
         ))
      )
  )
);

-- Update approval_requests_select policy to support entity-specific delegation
DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
CREATE POLICY "approval_requests_select"
  ON public.approval_requests FOR SELECT
  TO authenticated
  USING (
    current_approver_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    EXISTS (
      SELECT 1 FROM public.temporary_approvers ta
      WHERE ta.delegate_id = auth.uid()
        AND ta.start_at <= now()
        AND ta.end_at >= now()
        AND (
          -- If entity_type/entity_id are set, check for exact match with approval_requests
          (ta.entity_type IS NOT NULL AND ta.entity_id IS NOT NULL 
           AND ta.entity_type = approval_requests.entity_type
           AND ta.entity_id = approval_requests.entity_id)
          OR
          -- If entity_type/entity_id are null, use scope-based delegation
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
        -- Also check that the delegator matches the current approver
        AND ta.delegator_id = approval_requests.current_approver_id
    )
  );;
