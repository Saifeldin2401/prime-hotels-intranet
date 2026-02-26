-- Atomic Document Approval function to prevent race conditions
-- When multiple approvers approve simultaneously (2026-02-04)

CREATE OR REPLACE FUNCTION approve_document_atomic(
  p_approval_id UUID,
  p_approver_id UUID,
  p_feedback TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_approval RECORD;
  v_pending_count INTEGER;
  v_document_id UUID;
  v_document_title TEXT;
  v_document_creator UUID;
BEGIN
  -- Security check
  IF p_approver_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Approver ID mismatch';
  END IF;

  -- Lock the approval record for update
  SELECT da.*, d.id as doc_id, d.title as doc_title, d.created_by as doc_creator
  INTO v_approval
  FROM document_approvals da
  JOIN documents d ON d.id = da.document_id
  WHERE da.id = p_approval_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval record not found';
  END IF;

  IF v_approval.status != 'pending' THEN
    RAISE EXCEPTION 'Approval is not pending (current status: %)', v_approval.status;
  END IF;

  v_document_id := v_approval.doc_id;
  v_document_title := v_approval.doc_title;
  v_document_creator := v_approval.doc_creator;

  -- Update this approval
  UPDATE document_approvals
  SET 
    status = 'approved',
    approved_by = p_approver_id,
    approved_at = NOW(),
    feedback = p_feedback
  WHERE id = p_approval_id;

  -- Count remaining pending approvals (with FOR UPDATE to lock)
  SELECT COUNT(*)
  INTO v_pending_count
  FROM document_approvals
  WHERE document_id = v_document_id
    AND status = 'pending'
  FOR UPDATE;

  -- If no more pending approvals, update document status
  IF v_pending_count = 0 THEN
    UPDATE documents
    SET status = 'APPROVED', updated_at = NOW()
    WHERE id = v_document_id;
  END IF;

  -- Create notification for document creator (if not self)
  IF v_document_creator IS NOT NULL AND v_document_creator != p_approver_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      v_document_creator,
      'document_approved',
      'Document Approved',
      format('Your document "%s" has been approved.', v_document_title),
      format('/documents/%s', v_document_id),
      jsonb_build_object('documentId', v_document_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'approval_id', p_approval_id,
    'document_id', v_document_id,
    'remaining_approvals', v_pending_count,
    'document_status', CASE WHEN v_pending_count = 0 THEN 'APPROVED' ELSE 'PENDING_REVIEW' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION approve_document_atomic(UUID, UUID, TEXT) TO authenticated;;
