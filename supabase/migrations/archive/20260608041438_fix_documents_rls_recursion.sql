-- Drop the existing ALL policy on document_department_access
DROP POLICY IF EXISTS "Manage department access" ON document_department_access;

-- Create individual policies for INSERT, UPDATE, DELETE to avoid SELECT recursion
CREATE POLICY "Manage department access (INSERT)" ON document_department_access
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_id
    AND (
      documents.created_by = auth.uid() OR
      has_role(auth.uid(), 'regional_admin'::app_role) OR
      has_role(auth.uid(), 'property_manager'::app_role)
    )
  )
);

CREATE POLICY "Manage department access (UPDATE)" ON document_department_access
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_id
    AND (
      documents.created_by = auth.uid() OR
      has_role(auth.uid(), 'regional_admin'::app_role) OR
      has_role(auth.uid(), 'property_manager'::app_role)
    )
  )
);

CREATE POLICY "Manage department access (DELETE)" ON document_department_access
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_id
    AND (
      documents.created_by = auth.uid() OR
      has_role(auth.uid(), 'regional_admin'::app_role) OR
      has_role(auth.uid(), 'property_manager'::app_role)
    )
  )
);
