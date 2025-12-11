-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE sop_document_status AS ENUM ('draft', 'under_review', 'approved', 'obsolete');
CREATE TYPE sop_approval_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');

-- SOP Categories
CREATE TABLE sop_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOP Documents
CREATE TABLE sop_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL GENERATED ALWAYS AS (
    'SOP-' || 
    (SELECT short_code FROM departments WHERE id = department_id) || 
    '-' || 
    lpad((row_number() OVER (PARTITION BY department_id ORDER BY created_at) + 1000)::TEXT, 4, '0')
  ) STORED,
  description TEXT,
  description_ar TEXT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES sop_categories(id) ON DELETE SET NULL,
  status sop_document_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  current_version_id UUID,
  review_frequency_months INTEGER NOT NULL DEFAULT 12,
  next_review_date DATE,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  template_id UUID REFERENCES sop_documents(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT fk_current_version FOREIGN KEY (current_version_id) 
    REFERENCES sop_document_versions(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
);

-- SOP Document Versions
CREATE TABLE sop_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  change_summary TEXT,
  status sop_document_status NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(document_id, version_number)
);

-- Update the foreign key in sop_documents to reference sop_document_versions
ALTER TABLE sop_documents 
  ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) 
  REFERENCES sop_document_versions(id) 
  ON DELETE SET NULL 
  DEFERRABLE INITIALLY DEFERRED;

-- SOP Approval Workflows
CREATE TABLE sop_approval_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES sop_document_versions(id) ON DELETE CASCADE,
  status sop_approval_status NOT NULL DEFAULT 'pending',
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

-- SOP Approval Steps
CREATE TABLE sop_approval_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES sop_approval_workflows(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status sop_approval_status NOT NULL DEFAULT 'pending',
  comments TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_approver CHECK (
    (approver_role = 'specific' AND approver_id IS NOT NULL) OR 
    (approver_role != 'specific' AND approver_id IS NULL)
  )
);

-- SOP Document Attachments
CREATE TABLE sop_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES sop_document_versions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_version_or_document CHECK (
    (version_id IS NOT NULL) OR (document_id IS NOT NULL)
  )
);

-- SOP Document Acknowledgment
CREATE TABLE sop_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES sop_document_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, version_id, user_id)
);

-- SOP Document Access Logs
CREATE TABLE sop_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES sop_document_versions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOP Document Tags
CREATE TABLE sop_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name)
);

-- SOP Document - Tag Mapping
CREATE TABLE sop_document_tags (
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES sop_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_id, tag_id)
);

-- SOP Document Relations
CREATE TABLE sop_document_relations (
  source_document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'related_to', 'replaces', 'replaced_by', 'supersedes', 'superseded_by'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_document_id, target_document_id, relation_type),
  CHECK (source_document_id != target_document_id)
);

-- SOP Document Review Reminders
CREATE TABLE sop_review_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'completed'
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sop_documents_department ON sop_documents(department_id);
CREATE INDEX idx_sop_documents_category ON sop_documents(category_id);
CREATE INDEX idx_sop_documents_status ON sop_documents(status);
CREATE INDEX idx_sop_document_versions_document ON sop_document_versions(document_id);
CREATE INDEX idx_sop_approval_workflows_document ON sop_approval_workflows(document_id);
CREATE INDEX idx_sop_approval_workflows_version ON sop_approval_workflows(version_id);
CREATE INDEX idx_sop_approval_steps_workflow ON sop_approval_steps(workflow_id);
CREATE INDEX idx_sop_acknowledgments_document ON sop_acknowledgments(document_id, version_id);
CREATE INDEX idx_sop_acknowledgments_user ON sop_acknowledgments(user_id);

-- Add RLS policies for security
ALTER TABLE sop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_review_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified example, should be expanded based on your security requirements)
CREATE POLICY "Enable read access for authenticated users" ON sop_documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for users with appropriate permissions" ON sop_documents
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.uid() = created_by OR 
     EXISTS (
       SELECT 1 FROM user_roles 
       WHERE user_id = auth.uid() 
       AND role IN ('regional_admin', 'regional_hr', 'property_manager')
     ))
  );

-- Create update trigger for timestamps
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW; 
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER update_sop_documents_modtime
BEFORE UPDATE ON sop_documents
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sop_document_versions_modtime
BEFORE UPDATE ON sop_document_versions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sop_approval_workflows_modtime
BEFORE UPDATE ON sop_approval_workflows
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_sop_approval_steps_modtime
BEFORE UPDATE ON sop_approval_steps
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create function to handle document versioning
CREATE OR REPLACE FUNCTION create_new_sop_version()
RETURNS TRIGGER AS $$
DECLARE
  new_version_id UUID;
  new_version_number INTEGER;
BEGIN
  -- Only proceed if status is changing to a new version-worthy status
  IF NEW.status != OLD.status AND 
     (NEW.status = 'under_review' OR NEW.status = 'approved' OR NEW.status = 'obsolete') THEN
    
    -- Get the next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO new_version_number
    FROM sop_document_versions 
    WHERE document_id = NEW.id;
    
    -- Create the new version
    INSERT INTO sop_document_versions (
      document_id, 
      version_number, 
      content, 
      change_summary, 
      status, 
      created_by,
      published_at,
      published_by
    ) VALUES (
      NEW.id, 
      new_version_number,
      (SELECT content FROM sop_document_versions WHERE id = OLD.current_version_id),
      'Status changed to ' || NEW.status,
      NEW.status,
      auth.uid(),
      CASE WHEN NEW.status = 'approved' THEN NOW() ELSE NULL END,
      CASE WHEN NEW.status = 'approved' THEN auth.uid() ELSE NULL END
    )
    RETURNING id INTO new_version_id;
    
    -- Update the document with the new current version
    NEW.current_version_id := new_version_id;
    NEW.version := new_version_number;
    
    -- If approved, set published_at
    IF NEW.status = 'approved' THEN
      NEW.published_at := NOW();
      NEW.published_by := auth.uid();
      
      -- Set next review date
      NEW.next_review_date := (NOW() + (NEW.review_frequency_months || ' months')::INTERVAL)::DATE;
      
      -- Create review reminder
      INSERT INTO sop_review_reminders (
        document_id,
        reminder_date,
        status
      ) VALUES (
        NEW.id,
        (NOW() + ((NEW.review_frequency_months - 1) || ' months')::INTERVAL)::DATE,
        'pending'
      );
    END IF;
    
    -- If obsolete, archive the document
    IF NEW.status = 'obsolete' THEN
      NEW.archived_at := NOW();
      NEW.archived_by := auth.uid();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the versioning trigger
CREATE TRIGGER handle_sop_versioning
BEFORE UPDATE ON sop_documents
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status AND 
  (NEW.status = 'under_review' OR NEW.status = 'approved' OR NEW.status = 'obsolete')
)
EXECUTE FUNCTION create_new_sop_version();

-- Create function to log access
CREATE OR REPLACE FUNCTION log_sop_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sop_access_logs (
    document_id, 
    version_id, 
    user_id, 
    action, 
    ip_address, 
    user_agent
  ) VALUES (
    NEW.id, 
    NEW.current_version_id, 
    auth.uid(), 
    'view', 
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for document search
CREATE MATERIALIZED VIEW sop_document_search AS
SELECT 
  d.id,
  d.code,
  d.title,
  d.title_ar,
  d.description,
  d.description_ar,
  d.status,
  d.version,
  d.department_id,
  d.category_id,
  d.subcategory_id,
  d.created_at,
  d.updated_at,
  d.published_at,
  d.next_review_date,
  -- Text search vector for full-text search
  to_tsvector('english', 
    COALESCE(d.title, '') || ' ' ||
    COALESCE(d.title_ar, '') || ' ' ||
    COALESCE(d.description, '') || ' ' ||
    COALESCE(d.description_ar, '') || ' ' ||
    COALESCE(d.code, '')
  ) ||
  to_tsvector('english', 
    string_agg(DISTINCT t.name, ' ')
  ) ||
  to_tsvector('english', 
    string_agg(DISTINCT t.name_ar, ' ')
  ) AS search_vector
FROM 
  sop_documents d
LEFT JOIN 
  sop_document_tags dt ON d.id = dt.document_id
LEFT JOIN 
  sop_tags t ON dt.tag_id = t.id
GROUP BY 
  d.id;

-- Create index for faster text search
CREATE INDEX idx_sop_document_search ON sop_document_search USING GIN(search_vector);

-- Create function to refresh the search view
CREATE OR REPLACE FUNCTION refresh_sop_document_search()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sop_document_search;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the search view
CREATE TRIGGER refresh_sop_document_search_after_document
AFTER INSERT OR UPDATE OR DELETE ON sop_documents
FOR EACH STATEMENT EXECUTE FUNCTION refresh_sop_document_search();

CREATE TRIGGER refresh_sop_document_search_after_tags
AFTER INSERT OR UPDATE OR DELETE ON sop_document_tags
FOR EACH STATEMENT EXECUTE FUNCTION refresh_sop_document_search();

-- Create function to get document history
CREATE OR REPLACE FUNCTION get_document_history(document_id UUID)
RETURNS TABLE (
  version_number INTEGER,
  status TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  user_name TEXT,
  user_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.version_number,
    v.status::TEXT,
    v.change_summary,
    v.created_at,
    v.created_by,
    p.full_name AS user_name,
    p.avatar_url AS user_avatar
  FROM 
    sop_document_versions v
  LEFT JOIN 
    profiles p ON v.created_by = p.id
  WHERE 
    v.document_id = $1
  ORDER BY 
    v.version_number DESC;
END;
$$ LANGUAGE plpgsql STABLE;
