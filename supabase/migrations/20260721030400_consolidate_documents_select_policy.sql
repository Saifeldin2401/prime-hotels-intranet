-- =============================================================================
-- Performance: consolidate multiple_permissive_policies on documents (SELECT)
-- =============================================================================
-- `documents_modify_author_approver` was FOR ALL, which implicitly also
-- enforces (as USING) on SELECT. `documents_select_consolidated` is a
-- separate FOR SELECT policy. Both therefore run for every SELECT — the
-- multiple_permissive_policies pattern.
--
-- Fix, with zero effective-access change:
--   1. Narrow documents_modify_author_approver to FOR INSERT, UPDATE, DELETE
--      only (its qual/with_check is unchanged) — it no longer participates
--      in SELECT.
--   2. Fold its qual as an additional OR-branch into the SELECT policy, so
--      authors/approvers (incl. property_hr, which had implicit SELECT via
--      the old ALL policy but was NOT listed in the old SELECT policy) keep
--      exactly the same read access they had before.
--   3. De-duplicate documents_select_consolidated: the existing qual had
--      several OR-branches repeated verbatim (regional_admin, regional_hr,
--      created_by, and the four visibility+PUBLISHED branches each appeared
--      twice). Removing exact duplicates does not change the boolean result,
--      only the cost of evaluating it.
--
-- Net result for SELECT: one policy, same truth table as
-- (old ALL.qual OR old SELECT.qual), just deduplicated.
-- =============================================================================

DROP POLICY IF EXISTS documents_modify_author_approver ON public.documents;
CREATE POLICY documents_modify_author_approver ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
    OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'property_hr'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
  );

CREATE POLICY documents_update_author_approver ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
    OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'property_hr'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
    OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'property_hr'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
  );

CREATE POLICY documents_delete_author_approver ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
    OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'property_hr'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
  );

DROP POLICY IF EXISTS documents_select_consolidated ON public.documents;
CREATE POLICY documents_select_consolidated ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'regional_admin'::app_role)
    OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)
    OR ((visibility = 'all_properties'::document_visibility) AND (status = 'PUBLISHED'::document_status))
    OR ((visibility = 'property'::document_visibility) AND (property_id IS NOT NULL) AND has_property_access((SELECT auth.uid()), property_id) AND (status = 'PUBLISHED'::document_status))
    OR ((visibility = 'department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS (
         SELECT 1 FROM user_departments ud
         WHERE ud.user_id = (SELECT auth.uid()) AND ud.department_id = documents.department_id
       )) AND (status = 'PUBLISHED'::document_status))
    OR ((visibility = 'group_department'::document_visibility) AND (department_id IS NOT NULL) AND (EXISTS (
         SELECT 1 FROM user_departments ud
         JOIN departments ud_dept ON ud.department_id = ud_dept.id
         JOIN departments doc_dept ON documents.department_id = doc_dept.id
         WHERE ud.user_id = (SELECT auth.uid()) AND lower(ud_dept.name) = lower(doc_dept.name)
       )) AND (status = 'PUBLISHED'::document_status))
    OR ((visibility = 'specific_departments'::document_visibility) AND (EXISTS (
         SELECT 1 FROM document_department_access dda
         JOIN user_departments ud ON dda.department_id = ud.department_id
         WHERE dda.document_id = documents.id AND ud.user_id = (SELECT auth.uid())
       )) AND (status = 'PUBLISHED'::document_status))
    OR ((visibility = 'role'::document_visibility) AND (role IS NOT NULL) AND (EXISTS (
         SELECT 1 FROM user_roles ur
         WHERE ur.user_id = (SELECT auth.uid()) AND ur.role = documents.role
       )) AND (status = 'PUBLISHED'::document_status))
    OR (created_by = (SELECT auth.uid()))
    OR (has_role((SELECT auth.uid()), 'property_manager'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'property_hr'::app_role) AND has_property_access((SELECT auth.uid()), property_id))
    OR (has_role((SELECT auth.uid()), 'department_head'::app_role) AND (EXISTS (
         SELECT 1 FROM user_departments ud
         WHERE ud.user_id = (SELECT auth.uid()) AND ud.department_id = documents.department_id
       )))
    OR ((content_type = ANY (ARRAY['training_block'::text, 'training_resource'::text, 'training_template'::text])) AND (
         (created_by = (SELECT auth.uid()))
         OR has_role((SELECT auth.uid()), 'regional_admin'::app_role)
         OR has_role((SELECT auth.uid()), 'regional_hr'::app_role)
         OR ((property_id IS NOT NULL) AND has_property_access((SELECT auth.uid()), property_id))
         OR (status = 'PUBLISHED'::document_status)
       ))
  );
