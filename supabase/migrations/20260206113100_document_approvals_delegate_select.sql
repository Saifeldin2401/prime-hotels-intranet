-- Allow delegates (temporary approvers) to view approvals they can act on

CREATE POLICY IF NOT EXISTS "document_approvals_select_approver_or_delegate"
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
        ta.scope_type = 'all'
        OR (ta.scope_type = 'property' AND ta.scope_id IS NOT DISTINCT FROM d.property_id)
        OR (ta.scope_type = 'department' AND ta.scope_id IS NOT DISTINCT FROM d.department_id)
      )
  )
);
