-- Allow document authors/admins to clean up pending approval rows for their document (used when resubmitting)

CREATE POLICY IF NOT EXISTS "document_approvals_delete_author_admin_pending"
ON public.document_approvals
FOR DELETE
TO authenticated
USING (
  status = 'pending'
  AND is_active = TRUE
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_approvals.document_id
      AND (
        d.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
      )
  )
);
