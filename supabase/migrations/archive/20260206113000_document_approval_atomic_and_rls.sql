-- Document approval reliability: RLS + atomic approve/reject

-- RLS: allow authors/admins to create approval records when submitting for review
DROP POLICY IF EXISTS "document_approvals_insert_author_admin" ON public.document_approvals;
CREATE POLICY "document_approvals_insert_author_admin"
ON public.document_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_approvals.document_id
      AND (
        d.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
      )
  )
);

-- RLS: allow approvers (or active delegates) to update their pending approvals
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
          ta.scope_type = 'all'
          OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
          OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
        )
    )
  )
)
WITH CHECK (
  status IN ('pending', 'approved', 'rejected')
);

-- Helper: can user act on this approval row
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
              ta.scope_type = 'all'
              OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
              OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
            )
        )
      )
  );
$$;

-- Atomic approve: approve an approval row, and publish document if all approvals are done
CREATE OR REPLACE FUNCTION public.approve_document_atomic(
  p_approval_id UUID,
  p_approver_id UUID,
  p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id UUID;
  v_document_title TEXT;
  v_document_author UUID;
  v_remaining_pending INTEGER;
BEGIN
  IF NOT public.can_user_act_on_document_approval(p_approver_id, p_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to approve this item';
  END IF;

  SELECT da.document_id
  INTO v_document_id
  FROM public.document_approvals da
  WHERE da.id = p_approval_id
  FOR UPDATE;

  UPDATE public.document_approvals
  SET status = 'approved',
      approved_at = now(),
      feedback = COALESCE(p_feedback, feedback),
      approved_by = p_approver_id,
      is_active = FALSE,
      updated_at = now()
  WHERE id = p_approval_id
    AND status = 'pending'
    AND is_active = TRUE;

  SELECT d.title, d.created_by
  INTO v_document_title, v_document_author
  FROM public.documents d
  WHERE d.id = v_document_id;

  SELECT COUNT(*)
  INTO v_remaining_pending
  FROM public.document_approvals
  WHERE document_id = v_document_id
    AND status = 'pending'
    AND is_active = TRUE;

  IF v_remaining_pending = 0 THEN
    UPDATE public.documents
    SET status = 'PUBLISHED',
        updated_at = now()
    WHERE id = v_document_id;

    IF v_document_author IS NOT NULL AND v_document_author <> p_approver_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        v_document_author,
        'request_approved',
        'Document Approved',
        'Your document "' || COALESCE(v_document_title, 'Document') || '" has been approved and published.',
        jsonb_build_object(
          'entity_type', 'document',
          'entity_id', v_document_id,
          'link', '/documents/' || v_document_id::text,
          'approval_id', p_approval_id,
          'published', true
        )
      );
    END IF;

    RETURN jsonb_build_object('success', true, 'document_id', v_document_id, 'published', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'document_id', v_document_id, 'published', false, 'remaining_pending', v_remaining_pending);
END;
$$;

-- Atomic reject: reject an approval row and reject the document
CREATE OR REPLACE FUNCTION public.reject_document_atomic(
  p_approval_id UUID,
  p_approver_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id UUID;
  v_document_title TEXT;
  v_document_author UUID;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  IF NOT public.can_user_act_on_document_approval(p_approver_id, p_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to reject this item';
  END IF;

  SELECT da.document_id
  INTO v_document_id
  FROM public.document_approvals da
  WHERE da.id = p_approval_id
  FOR UPDATE;

  UPDATE public.document_approvals
  SET status = 'rejected',
      rejected_at = now(),
      rejected_by = p_approver_id,
      rejection_reason = p_reason,
      is_active = FALSE,
      updated_at = now()
  WHERE id = p_approval_id
    AND status = 'pending'
    AND is_active = TRUE;

  UPDATE public.documents
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = v_document_id;

  SELECT d.title, d.created_by
  INTO v_document_title, v_document_author
  FROM public.documents d
  WHERE d.id = v_document_id;

  IF v_document_author IS NOT NULL AND v_document_author <> p_approver_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      v_document_author,
      'request_rejected',
      'Document Rejected',
      'Your document "' || COALESCE(v_document_title, 'Document') || '" was rejected. Reason: ' || p_reason,
      jsonb_build_object(
        'entity_type', 'document',
        'entity_id', v_document_id,
        'link', '/documents/' || v_document_id::text,
        'approval_id', p_approval_id
      )
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'document_id', v_document_id, 'rejected', true);
END;
$$;
