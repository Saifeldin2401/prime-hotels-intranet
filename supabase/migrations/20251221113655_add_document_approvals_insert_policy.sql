-- Add INSERT policy for document_approvals
-- Allow authenticated users to insert approval records for their own decisions
CREATE POLICY "document_approvals_insert" ON document_approvals
FOR INSERT TO authenticated
WITH CHECK (approver_id = auth.uid());;
