-- Remediation continuing the full-system audit. All items re-verified live
-- immediately before writing this file.

-- ============================================================================
-- 1. journal_entries / tax_returns: SELECT had no role check at all and
--    treated property_id IS NULL as visible to every authenticated user
--    (contrast with the INSERT/UPDATE policies on the same tables, which
--    both require property_manager/regional_admin). Every currently-existing
--    row in both tables has property_id NULL, so right now any authenticated
--    user - any role, any property - can read all journal entries and tax
--    returns. Bring SELECT in line with the write policies: property-scoped
--    rows need property access AND a finance-ish role; NULL-property
--    (corporate-level) rows are regional_admin+ only (has_role's hierarchy
--    fallback already covers corporate_admin/super_admin).
-- ============================================================================
DROP POLICY IF EXISTS journal_entries_select ON public.journal_entries;
CREATE POLICY journal_entries_select ON public.journal_entries
  FOR SELECT USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id)
      AND (has_role((SELECT auth.uid()), 'property_manager'::public.app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)))
    OR (property_id IS NULL AND has_role((SELECT auth.uid()), 'regional_admin'::public.app_role))
  );

DROP POLICY IF EXISTS tax_returns_select ON public.tax_returns;
CREATE POLICY tax_returns_select ON public.tax_returns
  FOR SELECT USING (
    (property_id IS NOT NULL AND has_property_access((SELECT auth.uid()), property_id)
      AND (has_role((SELECT auth.uid()), 'property_manager'::public.app_role) OR has_role((SELECT auth.uid()), 'regional_admin'::public.app_role)))
    OR (property_id IS NULL AND has_role((SELECT auth.uid()), 'regional_admin'::public.app_role))
  );

-- ============================================================================
-- 2. employee_documents: DELETE was scoped to the document's SUBJECT only
--    (auth.uid() = user_id), with no HR/admin override at all - inconsistent
--    with INSERT/SELECT on the same table, which both route through
--    can_manage_employee_document()/can_view_employee_document() (self +
--    reporting manager + HR/admin roles + property-scoped HR/manager). Net
--    effect: an HR admin authorized to upload a document on an employee's
--    behalf could never delete/correct it, and nobody at all could delete a
--    document for a deactivated/off-boarded employee. Align DELETE with the
--    same function already used for INSERT.
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete own documents" ON public.employee_documents;
CREATE POLICY "Users can delete own documents" ON public.employee_documents
  FOR DELETE USING (can_manage_employee_document(user_id));

-- ============================================================================
-- 3. decide_purchase_request: unguarded TOCTOU race. The terminal UPDATE had
--    no "AND status = 'pending'" re-check and no FOUND/rowcount guard,
--    unlike every sibling approve/reject function in this schema
--    (approve_leave_request, reject_leave_request, approve_training_module,
--    reject_training_module, approve/reject_document_atomic,
--    request_apply_action). Two concurrent decide calls on the same pending
--    request could both pass the initial SELECT before either commits, and
--    both UPDATEs would then succeed unconditionally - the second silently
--    overwrites the first's decision (and both notifications fire) with no
--    error to either caller.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decide_purchase_request(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_request public.purchase_requests%ROWTYPE;
BEGIN
    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;

    SELECT * INTO v_request FROM public.purchase_requests WHERE id = p_id AND status = 'pending';
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Purchase request not found or not pending';
    END IF;

    IF v_request.requested_by = auth.uid() THEN
        RAISE EXCEPTION 'You cannot approve or reject your own purchase request';
    END IF;

    IF NOT public.can_approve_purchase_request(auth.uid(), v_request.property_id, v_request.department_id) THEN
        RAISE EXCEPTION 'Not authorized to decide this purchase request';
    END IF;

    UPDATE public.purchase_requests
    SET status = p_status, approved_by = auth.uid(), approved_at = now(), updated_at = now()
    WHERE id = p_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'This purchase request was already decided';
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (
        v_request.requested_by,
        CASE WHEN p_status = 'approved' THEN 'purchase_request_approved' ELSE 'purchase_request_rejected' END,
        CASE WHEN p_status = 'approved' THEN 'Purchase request approved' ELSE 'Purchase request rejected' END,
        '"' || v_request.item_description || '" was ' || p_status || '.',
        '/procurement/requests',
        'purchase_request',
        p_id
    );
END;
$function$;

-- ============================================================================
-- 4. content-media storage bucket: public bucket accepted image/svg+xml
--    uploads from any authenticated user (RLS INSERT policy only checks the
--    uploader owns the folder prefix, no role gate). SVG is XML and can carry
--    a <script>/onload payload; served back with Content-Type: image/svg+xml
--    from a public bucket, an uploaded SVG executes as live script when its
--    public URL is opened. No legitimate use of SVG uploads was found in the
--    editors that use this bucket.
-- ============================================================================
UPDATE storage.buckets
SET allowed_mime_types = array_remove(allowed_mime_types, 'image/svg+xml')
WHERE id = 'content-media';
