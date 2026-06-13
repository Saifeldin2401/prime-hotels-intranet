-- ============================================
-- FIX MISSING RLS ON DOCUMENTS TABLE
-- Uses SECURITY DEFINER functions to handle access safely
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop any existing (potentially broken) policies
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_manage" ON documents;
DROP POLICY IF EXISTS "documents_read_access" ON documents;
DROP POLICY IF EXISTS "documents_write_access" ON documents;

-- 1. READ POLICY
CREATE POLICY "documents_select" ON documents
FOR SELECT USING (
  -- Admins see everything
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr'])
  
  OR (
    -- Property managers see everything in their property
    auth_has_role(auth.uid(), 'property_manager')
    AND check_property_access(property_id)
  )

  OR (
    -- Everyone else sees PUBLISHED, non-deleted content
    status = 'PUBLISHED' 
    AND is_deleted = false
    AND (
      -- Global content
      visibility = 'all_properties'
      OR 
      -- Property content
      (visibility = 'property' AND check_property_access(property_id))
    )
  )
);

-- 2. MANAGE POLICY (Insert, Update, Delete)
CREATE POLICY "documents_manage" ON documents
FOR ALL USING (
  -- Admins have full access
  auth_has_any_role(auth.uid(), ARRAY['regional_admin', 'regional_hr'])
  
  OR (
    -- Property managers can manage their property's documents
    auth_has_role(auth.uid(), 'property_manager')
    AND check_property_access(property_id)
  )
);;
