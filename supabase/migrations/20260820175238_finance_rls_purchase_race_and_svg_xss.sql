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

DROP POLICY IF EXISTS "Users can delete own documents" ON public.employee_documents;
CREATE POLICY "Users can delete own documents" ON public.employee_documents
  FOR DELETE USING (can_manage_employee_document(user_id));

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

UPDATE storage.buckets
SET allowed_mime_types = array_remove(allowed_mime_types, 'image/svg+xml')
WHERE id = 'content-media';
