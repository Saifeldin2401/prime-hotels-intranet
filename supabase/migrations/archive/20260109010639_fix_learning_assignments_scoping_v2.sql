-- Fix learning_assignments RLS to enforce property scoping for HR/Managers (v2)
-- Corrects profiles lookup to use user_properties

DROP POLICY IF EXISTS "HR can manage assignments" ON learning_assignments;
CREATE POLICY "HR can manage assignments" ON learning_assignments
    FOR ALL USING (
        -- Regional admins/HR see everything
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        -- Property HR and Dept Managers only see assignments they share a property with
        (
            (public.has_role(auth.uid(), 'property_hr') OR public.has_role(auth.uid(), 'department_manager')) AND
            (
                -- Case 1: They created it
                assigned_by = auth.uid() OR
                -- Case 2: It targets a property they have access to
                (target_type = 'property' AND public.has_property_access(auth.uid(), target_id::uuid)) OR
                -- Case 3: It targets a department they have access to
                (target_type = 'department' AND EXISTS (
                    SELECT 1 FROM departments d
                    WHERE d.id = target_id::uuid
                    AND public.has_property_access(auth.uid(), d.property_id)
                )) OR
                -- Case 4: They share a property with the creator (assigned_by)
                EXISTS (
                    SELECT 1 FROM user_properties up_me
                    JOIN user_properties up_creator ON up_me.property_id = up_creator.property_id
                    WHERE up_me.user_id = auth.uid()
                    AND up_creator.user_id = learning_assignments.assigned_by
                )
            )
        )
    );

-- Similar fix for learning_progress
DROP POLICY IF EXISTS "HR can view all progress" ON learning_progress;
CREATE POLICY "HR can view all progress" ON learning_progress
    FOR SELECT USING (
        public.has_role(auth.uid(), 'regional_admin') OR
        public.has_role(auth.uid(), 'regional_hr') OR
        (
            (public.has_role(auth.uid(), 'property_hr') OR public.has_role(auth.uid(), 'department_manager')) AND
            EXISTS (
                SELECT 1 FROM user_properties up_me
                JOIN user_properties up_target ON up_me.property_id = up_target.property_id
                WHERE up_me.user_id = auth.uid()
                AND up_target.user_id = learning_progress.user_id
            )
        )
    );
;
