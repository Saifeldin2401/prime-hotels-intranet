-- Add UPDATE policy for document_approvals
CREATE POLICY "document_approvals_update" ON document_approvals
FOR UPDATE TO authenticated
USING (approver_id = auth.uid())
WITH CHECK (approver_id = auth.uid());;
