
-- Drop the recursive policy causing 500 errors
DROP POLICY IF EXISTS "Manage department access" ON document_department_access;

-- Recreate policies for specific operations (excluding SELECT)
-- Check if user can manage the document (created_by or admin/manager role)

-- INSERT
CREATE POLICY "Manage department access insert" ON document_department_access
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_department_access.document_id
        AND (
            documents.created_by = auth.uid() OR 
            public.has_role(auth.uid(), 'regional_admin') OR 
            public.has_role(auth.uid(), 'property_manager')
        )
    )
);

-- UPDATE
CREATE POLICY "Manage department access update" ON document_department_access
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_department_access.document_id
        AND (
            documents.created_by = auth.uid() OR 
            public.has_role(auth.uid(), 'regional_admin') OR 
            public.has_role(auth.uid(), 'property_manager')
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_department_access.document_id
        AND (
            documents.created_by = auth.uid() OR 
            public.has_role(auth.uid(), 'regional_admin') OR 
            public.has_role(auth.uid(), 'property_manager')
        )
    )
);

-- DELETE
CREATE POLICY "Manage department access delete" ON document_department_access
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_department_access.document_id
        AND (
            documents.created_by = auth.uid() OR 
            public.has_role(auth.uid(), 'regional_admin') OR 
            public.has_role(auth.uid(), 'property_manager')
        )
    )
);

-- Re-enable the related articles trigger (after verifying the fix works)
ALTER TABLE documents ENABLE TRIGGER documents_related_refresh;
;
