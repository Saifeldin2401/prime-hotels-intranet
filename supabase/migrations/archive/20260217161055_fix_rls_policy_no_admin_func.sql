DROP POLICY IF EXISTS "documents_select_by_visibility" ON documents;

CREATE POLICY "documents_select_by_visibility"
  ON documents FOR SELECT
  TO authenticated
  USING (
    -- Admin roles see all
    (
        public.has_role(auth.uid(), 'corporate_admin') OR
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr')
    ) OR
    
    -- Authors can see their own
    created_by = auth.uid() OR
    
    -- APPROVED/PUBLISHED documents visible based on rules
    (
        status IN ('APPROVED', 'PUBLISHED') AND (
        
            -- Chain-wide documents visible to all
            visibility = 'all_properties' OR
            
            -- Property-specific documents
            (visibility = 'property' AND property_id IS NOT NULL AND 
             public.has_property_access(auth.uid(), property_id)) OR
            
            -- Department-specific documents (Single Property)
            (visibility = 'department' AND department_id IS NOT NULL AND
             EXISTS (
               SELECT 1 FROM user_departments ud
               WHERE ud.user_id = auth.uid() AND ud.department_id = documents.department_id
             )) OR

            -- Group Department documents (All Properties match by name)
            (visibility = 'group_department' AND department_id IS NOT NULL AND 
             EXISTS (
                SELECT 1 
                FROM departments doc_dept
                WHERE doc_dept.id = documents.department_id
                AND EXISTS (
                    SELECT 1 
                    FROM user_departments ud
                    JOIN departments user_dept ON ud.department_id = user_dept.id
                    WHERE ud.user_id = auth.uid()
                    AND LOWER(user_dept.name) = LOWER(doc_dept.name)
                )
             )) OR
        
            -- Role-specific documents
            (visibility = 'role' AND role IS NOT NULL AND
             EXISTS (
               SELECT 1 FROM user_roles ur
               WHERE ur.user_id = auth.uid() AND ur.role = documents.role
             ))
        )
    )
  );;
