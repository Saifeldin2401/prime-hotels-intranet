-- Fix permissions for Data Import workflow
-- Adds missing UPDATE and DELETE policies for import logs and operational data

-- 1. Allow Managers/Admins to UPDATE import logs (e.g. marking as complete/failed)
CREATE POLICY "Managers can update import logs" ON data_import_logs
    FOR UPDATE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- 2. Allow Managers/Admins to DELETE import logs
CREATE POLICY "Managers can delete import logs" ON data_import_logs
    FOR DELETE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- 3. Allow Managers/Admins to DELETE occupancy data (for cleanup/rollback)
CREATE POLICY "Managers can delete occupancy data" ON daily_occupancy
    FOR DELETE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );

-- 4. Allow Managers/Admins to DELETE revenue data (for cleanup/rollback)
CREATE POLICY "Managers can delete revenue data" ON daily_revenue
    FOR DELETE USING (
        (public.has_role(auth.uid(), 'regional_admin') OR 
         public.has_role(auth.uid(), 'property_manager')) AND
        public.has_property_access(auth.uid(), property_id)
    );
