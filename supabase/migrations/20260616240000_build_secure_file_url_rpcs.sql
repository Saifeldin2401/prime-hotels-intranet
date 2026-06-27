-- Secure file-access RPCs expected by src/lib/secureFileAccess.ts. Each authorizes
-- the caller then returns the storage path; the client mints the signed URL.

CREATE OR REPLACE FUNCTION public.get_secure_document_version_url(p_version_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v record;
BEGIN
  SELECT dv.file_url, dv.document_id, dv.created_by INTO v
  FROM document_versions dv WHERE dv.id = p_version_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Document version not found'; END IF;
  IF v.file_url IS NULL THEN RAISE EXCEPTION 'Document version file not available'; END IF;
  IF v.created_by <> (SELECT auth.uid())
     AND NOT can_view_document(v.document_id)
     AND NOT (has_role_optimized('corporate_admin') OR has_role_optimized('regional_admin') OR has_role_optimized('regional_hr')) THEN
    RAISE EXCEPTION 'Not authorized to access this document version';
  END IF;
  RETURN v.file_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secure_expense_receipt_url(p_claim_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v record;
BEGIN
  SELECT ec.receipt_path, ec.requester_id, ec.approved_by_id INTO v
  FROM expense_claims ec WHERE ec.id = p_claim_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense claim not found'; END IF;
  IF v.receipt_path IS NULL THEN RAISE EXCEPTION 'Receipt file not available'; END IF;
  IF v.requester_id <> (SELECT auth.uid()) AND v.approved_by_id IS DISTINCT FROM (SELECT auth.uid())
     AND NOT (has_role_optimized('corporate_admin') OR has_role_optimized('regional_admin')
              OR has_role_optimized('regional_hr') OR has_role_optimized('property_hr')) THEN
    RAISE EXCEPTION 'Not authorized to access this receipt';
  END IF;
  RETURN v.receipt_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secure_maintenance_attachment_url(p_attachment_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v record; v_prop uuid;
BEGIN
  SELECT ma.file_path, ma.uploaded_by_id, ma.ticket_id INTO v
  FROM maintenance_attachments ma WHERE ma.id = p_attachment_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attachment not found'; END IF;
  IF v.file_path IS NULL THEN RAISE EXCEPTION 'Attachment file not available'; END IF;
  SELECT mt.property_id INTO v_prop FROM maintenance_tickets mt WHERE mt.id = v.ticket_id;
  IF v.uploaded_by_id <> (SELECT auth.uid())
     AND NOT has_property_access((SELECT auth.uid()), v_prop)
     AND NOT (has_role_optimized('corporate_admin') OR has_role_optimized('regional_admin')) THEN
    RAISE EXCEPTION 'Not authorized to access this attachment';
  END IF;
  RETURN v.file_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_secure_report_run_url(p_run_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v record;
BEGIN
  SELECT rr.output_path, rr.triggered_by INTO v
  FROM report_runs rr WHERE rr.id = p_run_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report run not found'; END IF;
  IF v.output_path IS NULL THEN RAISE EXCEPTION 'Report file not available'; END IF;
  IF v.triggered_by IS DISTINCT FROM (SELECT auth.uid())
     AND NOT (has_role_optimized('corporate_admin') OR has_role_optimized('regional_admin') OR has_role_optimized('regional_hr')) THEN
    RAISE EXCEPTION 'Not authorized to access this report';
  END IF;
  RETURN v.output_path;
END;
$$;
