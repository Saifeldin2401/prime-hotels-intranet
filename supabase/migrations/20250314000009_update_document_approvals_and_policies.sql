-- Extend document_approvals schema to support workflow used in the app

-- New columns (added defensively with IF NOT EXISTS)
ALTER TABLE document_approvals
  ADD COLUMN IF NOT EXISTS approver_role app_role,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'document',
  ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Ensure existing rows are treated as document approvals
UPDATE document_approvals
SET entity_type = 'document',
    entity_id = document_id
WHERE entity_type IS NULL;

-- RLS: allow insert of document_versions for document authors and regional admins
CREATE POLICY IF NOT EXISTS "document_versions_insert_for_document_authors"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_versions.document_id
      AND (
        d.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'regional_admin')
      )
  )
);

-- RLS: allow users to insert their own document acknowledgments when they can see the document
CREATE POLICY IF NOT EXISTS "document_acknowledgments_insert"
ON public.document_acknowledgments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_acknowledgments.document_id
      AND (
        d.created_by = auth.uid()
        OR d.status = 'PUBLISHED'
      )
  )
);
