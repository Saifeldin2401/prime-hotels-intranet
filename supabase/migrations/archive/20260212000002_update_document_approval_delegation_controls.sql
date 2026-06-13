-- Update document approval RPCs to enforce delegation limits and notify delegators

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
  v_delegator_id UUID;
  v_delegation_id UUID;
  v_max_approvals INTEGER;
  v_approvals_used INTEGER;
  v_notify_on_action BOOLEAN;
  v_notify_delegator BOOLEAN;
  v_delegate_name TEXT;
  v_is_delegate BOOLEAN := FALSE;
BEGIN
  IF NOT public.can_user_act_on_document_approval(p_approver_id, p_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to approve this item';
  END IF;

  SELECT da.document_id, da.approver_id
  INTO v_document_id, v_delegator_id
  FROM public.document_approvals da
  WHERE da.id = p_approval_id
  FOR UPDATE;

  -- Resolve applicable delegation (if acting as a delegate or fallback)
  SELECT ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  INTO v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  FROM public.temporary_approvers ta
  JOIN public.documents d ON d.id = v_document_id
  WHERE ta.delegator_id = v_delegator_id
    AND (ta.delegate_id = p_approver_id OR p_approver_id = ANY(ta.fallback_delegate_ids))
    AND ta.start_at <= now()
    AND ta.end_at >= now()
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
  ORDER BY (ta.entity_id IS NOT NULL) DESC, (ta.entity_type IS NOT NULL) DESC, ta.start_at DESC
  LIMIT 1;

  v_is_delegate := v_delegation_id IS NOT NULL AND p_approver_id <> v_delegator_id;

  IF v_is_delegate AND v_max_approvals IS NOT NULL AND v_approvals_used >= v_max_approvals THEN
    RAISE EXCEPTION 'Delegation approval limit reached';
  END IF;

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

  IF v_is_delegate THEN
    UPDATE public.temporary_approvers
    SET approvals_used = COALESCE(approvals_used, 0) + 1
    WHERE id = v_delegation_id;
  END IF;

  SELECT d.title, d.created_by
  INTO v_document_title, v_document_author
  FROM public.documents d
  WHERE d.id = v_document_id;

  IF v_is_delegate AND COALESCE(v_notify_on_action, TRUE) AND COALESCE(v_notify_delegator, TRUE) THEN
    SELECT full_name INTO v_delegate_name FROM public.profiles WHERE id = p_approver_id;
    IF v_delegator_id IS NOT NULL AND v_delegator_id <> p_approver_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        v_delegator_id,
        'approval_delegated_action',
        'Delegated Approval Completed',
        COALESCE(v_delegate_name, 'A delegate') || ' approved a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    END IF;
  END IF;

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
  v_delegator_id UUID;
  v_delegation_id UUID;
  v_max_approvals INTEGER;
  v_approvals_used INTEGER;
  v_notify_on_action BOOLEAN;
  v_notify_delegator BOOLEAN;
  v_delegate_name TEXT;
  v_is_delegate BOOLEAN := FALSE;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  IF NOT public.can_user_act_on_document_approval(p_approver_id, p_approval_id) THEN
    RAISE EXCEPTION 'Not authorized to reject this item';
  END IF;

  SELECT da.document_id, da.approver_id
  INTO v_document_id, v_delegator_id
  FROM public.document_approvals da
  WHERE da.id = p_approval_id
  FOR UPDATE;

  -- Resolve applicable delegation (if acting as a delegate or fallback)
  SELECT ta.id,
         ta.max_approvals,
         ta.approvals_used,
         ta.notify_on_action,
         ta.notify_delegator
  INTO v_delegation_id,
       v_max_approvals,
       v_approvals_used,
       v_notify_on_action,
       v_notify_delegator
  FROM public.temporary_approvers ta
  JOIN public.documents d ON d.id = v_document_id
  WHERE ta.delegator_id = v_delegator_id
    AND (ta.delegate_id = p_approver_id OR p_approver_id = ANY(ta.fallback_delegate_ids))
    AND ta.start_at <= now()
    AND ta.end_at >= now()
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
  ORDER BY (ta.entity_id IS NOT NULL) DESC, (ta.entity_type IS NOT NULL) DESC, ta.start_at DESC
  LIMIT 1;

  v_is_delegate := v_delegation_id IS NOT NULL AND p_approver_id <> v_delegator_id;

  IF v_is_delegate AND v_max_approvals IS NOT NULL AND v_approvals_used >= v_max_approvals THEN
    RAISE EXCEPTION 'Delegation approval limit reached';
  END IF;

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

  IF v_is_delegate THEN
    UPDATE public.temporary_approvers
    SET approvals_used = COALESCE(approvals_used, 0) + 1
    WHERE id = v_delegation_id;
  END IF;

  UPDATE public.documents
  SET status = 'REJECTED',
      updated_at = now()
  WHERE id = v_document_id;

  SELECT d.title, d.created_by
  INTO v_document_title, v_document_author
  FROM public.documents d
  WHERE d.id = v_document_id;

  IF v_is_delegate AND COALESCE(v_notify_on_action, TRUE) AND COALESCE(v_notify_delegator, TRUE) THEN
    SELECT full_name INTO v_delegate_name FROM public.profiles WHERE id = p_approver_id;
    IF v_delegator_id IS NOT NULL AND v_delegator_id <> p_approver_id THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        v_delegator_id,
        'approval_delegated_action',
        'Delegated Approval Completed',
        COALESCE(v_delegate_name, 'A delegate') || ' rejected a document on your behalf.',
        jsonb_build_object(
          'entity_type', 'document_approval',
          'entity_id', p_approval_id,
          'document_id', v_document_id
        )
      );
    END IF;
  END IF;

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
