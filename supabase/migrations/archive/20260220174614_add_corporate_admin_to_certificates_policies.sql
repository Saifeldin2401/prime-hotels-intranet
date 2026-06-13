-- Fix the RLS policies for the certificates table to include corporate_admin

-- Drop the old policies
DROP POLICY IF EXISTS "consolidated_certificates_select" ON "public"."certificates";
DROP POLICY IF EXISTS "Authenticated can insert certificates" ON "public"."certificates";

-- Recreate SELECT policy
CREATE POLICY "consolidated_certificates_select" ON "public"."certificates" FOR SELECT TO "public" USING (
    (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['property_manager'::app_role, 'property_hr'::app_role, 'department_head'::app_role]))))) AND (EXISTS ( SELECT 1
   FROM user_properties up
  WHERE ((up.user_id = auth.uid()) AND (up.property_id = certificates.property_id))))) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role]))))) OR (user_id = auth.uid()))
);

-- Recreate INSERT policy
CREATE POLICY "Authenticated can insert certificates" ON "public"."certificates" FOR INSERT TO "authenticated" WITH CHECK (
    ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR has_any_role(auth.uid(), ARRAY['corporate_admin'::app_role, 'regional_admin'::app_role, 'regional_hr'::app_role, 'property_hr'::app_role, 'property_manager'::app_role])))
);
