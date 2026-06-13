-- Drop and recreate the documents RLS policy with stricter draft visibility
DROP POLICY IF EXISTS "documents_select_by_visibility" ON documents;

-- Documents RLS: Strict visibility rules
-- DRAFTS: Only visible to document creators and specific approvers
-- PUBLISHED: Visible based on visibility rules
CREATE POLICY "documents_select_by_visibility"
ON documents FOR SELECT
TO authenticated
USING (
  -- Regional admins see all documents
  public.has_role(auth.uid(), 'regional_admin') OR
  -- Regional HR see all documents  
  public.has_role(auth.uid(), 'regional_hr') OR
  -- Property managers see documents for their properties (including drafts for approval)
  (public.has_role(auth.uid(), 'property_manager') AND 
   public.has_property_access(auth.uid(), property_id)) OR
  -- Property HR see documents for their properties (including drafts for approval)
  (public.has_role(auth.uid(), 'property_hr') AND 
   public.has_property_access(auth.uid(), property_id)) OR
  -- Department heads see documents for their departments (including drafts for approval)
  (public.has_role(auth.uid(), 'department_head') AND
   EXISTS (
     SELECT 1 FROM user_departments ud
     WHERE ud.user_id = auth.uid() AND ud.department_id = documents.department_id
   )) OR
  -- Chain-wide published documents visible to all
  (visibility = 'all_properties' AND status = 'PUBLISHED') OR
  -- Property-specific published documents
  (visibility = 'property' AND property_id IS NOT NULL AND 
   public.has_property_access(auth.uid(), property_id) AND status = 'PUBLISHED') OR
  -- Department-specific published documents
  (visibility = 'department' AND department_id IS NOT NULL AND
   EXISTS (
     SELECT 1 FROM user_departments ud
     WHERE ud.user_id = auth.uid() AND ud.department_id = documents.department_id
   ) AND status = 'PUBLISHED') OR
  -- Role-specific published documents
  (visibility = 'role' AND role IS NOT NULL AND
   EXISTS (
     SELECT 1 FROM user_roles ur
     WHERE ur.user_id = auth.uid() AND ur.role = documents.role
   ) AND status = 'PUBLISHED') OR
  -- Authors can see their own documents (any status)
  created_by = auth.uid()
);;
