-- Add property_id to announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Add property_id to training_modules
ALTER TABLE training_modules ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

-- Helper function to check property access
CREATE OR REPLACE FUNCTION public.check_property_access(required_property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Corporate admins/regional can access everything
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('corporate_admin', 'regional_admin', 'regional_hr')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Global items (property_id IS NULL) are accessible to everyone
  IF required_property_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if user is assigned to this property
  IF EXISTS (
    SELECT 1 FROM user_properties
    WHERE user_id = auth.uid()
    AND property_id = required_property_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for DOCUMENTS
DROP POLICY IF EXISTS "property_isolation_documents" ON documents;
CREATE POLICY "property_isolation_documents" ON documents
  FOR ALL USING (public.check_property_access(property_id));

-- Policies for ANNOUNCEMENTS
DROP POLICY IF EXISTS "property_isolation_announcements" ON announcements;
CREATE POLICY "property_isolation_announcements" ON announcements
  FOR ALL USING (public.check_property_access(property_id));

-- Policies for DEPARTMENTS
DROP POLICY IF EXISTS "property_isolation_departments" ON departments;
CREATE POLICY "property_isolation_departments" ON departments
  FOR ALL USING (public.check_property_access(property_id));

-- Policies for TRAINING_MODULES
DROP POLICY IF EXISTS "property_isolation_training_modules" ON training_modules;
CREATE POLICY "property_isolation_training_modules" ON training_modules
  FOR ALL USING (public.check_property_access(property_id));
