-- Document visibility enum
CREATE TYPE document_visibility AS ENUM (
  'all_properties',
  'property',
  'department',
  'role'
);

-- Document status enum
CREATE TYPE document_status AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED'
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  visibility document_visibility NOT NULL DEFAULT 'property',
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  role app_role,
  status document_status NOT NULL DEFAULT 'DRAFT',
  requires_acknowledgment BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Document approvals table
CREATE TABLE document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document acknowledgments table
CREATE TABLE document_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, user_id)
);

-- Triggers for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_approvals_updated_at
  BEFORE UPDATE ON document_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Documents RLS: Users can see documents based on visibility and property access
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
    -- Role-specific documents
    (visibility = 'role' AND role IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM user_roles ur
       WHERE ur.user_id = auth.uid() AND ur.role = documents.role
     ) AND status = 'PUBLISHED') OR
    -- Authors can see their own drafts
    created_by = auth.uid()
  );

-- Documents: Authors and approvers can modify
CREATE POLICY "documents_modify_author_approver"
  ON documents FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     public.has_property_access(auth.uid(), property_id)) OR
    (public.has_role(auth.uid(), 'property_hr') AND
     public.has_property_access(auth.uid(), property_id))
  )
  WITH CHECK (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     public.has_property_access(auth.uid(), property_id)) OR
    (public.has_role(auth.uid(), 'property_hr') AND
     public.has_property_access(auth.uid(), property_id))
  );

-- Document versions: Same visibility as documents
CREATE POLICY "document_versions_select"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_versions.document_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        d.created_by = auth.uid() OR
        (d.status = 'PUBLISHED' AND public.has_property_access(auth.uid(), d.property_id))
      )
    )
  );

-- Document approvals: Approvers and document authors can view
CREATE POLICY "document_approvals_select"
  ON document_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_approvals.document_id
      AND (d.created_by = auth.uid() OR public.has_role(auth.uid(), 'regional_admin'))
    )
  );

-- Document acknowledgments: Users can view their own
CREATE POLICY "document_acknowledgments_select"
  ON document_acknowledgments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_acknowledgments.document_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        (public.has_role(auth.uid(), 'property_manager') AND
         public.has_property_access(auth.uid(), d.property_id)) OR
        (public.has_role(auth.uid(), 'department_head') AND
         EXISTS (
           SELECT 1 FROM departments dept
           JOIN user_departments ud ON dept.id = ud.department_id
           WHERE dept.id = d.department_id AND ud.user_id = auth.uid()
         ))
      )
    )
  );

