-- Create junction table
CREATE TABLE IF NOT EXISTS document_department_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, department_id)
);

-- RLS for junction table
ALTER TABLE document_department_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View department access" ON document_department_access;
CREATE POLICY "View department access"
  ON document_department_access FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Manage department access" ON document_department_access;
CREATE POLICY "Manage department access"
  ON document_department_access FOR ALL
  TO authenticated
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

-- Update detailed RLS policy for documents
DROP POLICY IF EXISTS "documents_select_by_visibility" ON documents;

CREATE POLICY "documents_select_by_visibility"
  ON documents FOR SELECT
  TO authenticated
  USING (
    -- Regional roles see all
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    -- Chain-wide documents visible to all
    (visibility = 'all_properties' AND status = 'PUBLISHED') OR
    -- Property-specific documents
    (visibility = 'property' AND property_id IS NOT NULL AND
     public.has_property_access(auth.uid(), property_id) AND status = 'PUBLISHED') OR
    -- Department-specific documents
    (visibility = 'department' AND department_id IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM user_departments ud
       WHERE ud.user_id = auth.uid() AND ud.department_id = documents.department_id
     ) AND status = 'PUBLISHED') OR
    -- Group Department (Name matching)
    (visibility = 'group_department' AND department_id IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM user_departments ud
       JOIN departments ud_dept ON ud.department_id = ud_dept.id
       JOIN departments doc_dept ON documents.department_id = doc_dept.id
       WHERE ud.user_id = auth.uid() 
       AND LOWER(ud_dept.name) = LOWER(doc_dept.name)
     ) AND status = 'PUBLISHED') OR
    -- Specific Departments (Multi-select)
    (visibility = 'specific_departments' AND 
     EXISTS (
       SELECT 1 FROM document_department_access dda
       JOIN user_departments ud ON dda.department_id = ud.department_id
       WHERE dda.document_id = documents.id
       AND ud.user_id = auth.uid()
     ) AND status = 'PUBLISHED') OR
    -- Role-specific documents
    (visibility = 'role' AND role IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM user_roles ur
       WHERE ur.user_id = auth.uid() AND ur.role = documents.role
     ) AND status = 'PUBLISHED') OR
    -- Authors can see their own drafts
    created_by = auth.uid()
  );;
