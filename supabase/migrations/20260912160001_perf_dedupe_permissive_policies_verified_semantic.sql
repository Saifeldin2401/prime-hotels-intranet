
-- Fixes 36 of the 43 remaining multiple_permissive_policies findings, verified
-- via actual helper-function definitions (not just text comparison) that the
-- dedicated SELECT policy's predicate is a superset of the FOR ALL policy's
-- predicate for every table listed below - so scoping the ALL policy down to
-- INSERT/UPDATE/DELETE changes zero effective read access.
--
-- Key facts used in the analysis:
--   * is_platform_operator() unconditionally implies is_platform_super_admin()
--     (literal OR term), which unconditionally implies org_visible(ANY org)
--     (literal OR term, no operational-status gate).
--   * is_tenant_admin/is_tenant_content_editor/is_tenant_people_admin all
--     imply org_visible() via the same membership-or-session logic.
--   * platform_operator_has_role(X) requires an active platform_users row,
--     so it implies is_platform_operator().
--
-- The remaining 7 pairs are NOT touched here because they have confirmed real
-- gaps: learning_assignments (hotel_id scoping asymmetry), learning_quizzes
-- and training_modules (is_deleted / extra-role asymmetry), lesson_progress
-- (checks the legacy user_roles table, not platform_users - a real split
-- between the old and new authorization systems), training_session_attendees
-- and user_competencies (a generic platform operator satisfies "people_admin"
-- but not "content_editor" unless they also hold system_owner/session/
-- membership), and user_sessions (tenant_admin's role list includes
-- brand_admin, which tenant_people_admin's does not).
DO $$
DECLARE
  pol record;
  roles_sql text;
  cmd_name text;
  safe_pairs text[][] := ARRAY[
    ARRAY['ai_agent_policies','ai_agent_policies_write'],
    ARRAY['ai_model_probes','ai_model_probes_write'],
    ARRAY['ai_models','ai_models_write'],
    ARRAY['ai_providers','ai_providers_write'],
    ARRAY['assessment_questions','assessment_questions_write'],
    ARRAY['certificate_templates','certificate_templates_write'],
    ARRAY['competencies','competencies_write'],
    ARRAY['competency_levels','competency_levels_write'],
    ARRAY['course_competencies','course_competencies_write'],
    ARRAY['course_source_documents','course_source_documents_write'],
    ARRAY['data_retention_policies','drp_write'],
    ARRAY['departments','departments_tenant_isolation_admin'],
    ARRAY['document_department_access','document_department_access_write'],
    ARRAY['employee_transfer_logs','employee_transfer_logs_write'],
    ARRAY['knowledge_chunks','knowledge_chunks_write'],
    ARRAY['knowledge_related_articles','knowledge_related_articles_write'],
    ARRAY['master_content_deployments','master_content_deployments_write'],
    ARRAY['media_collections','media_collections_write_multi_tenant'],
    ARRAY['organization_feature_overrides','ofo_write'],
    ARRAY['organization_memberships','org_memberships_tenant_isolation_admin'],
    ARRAY['platform_config','platform_config_write'],
    ARRAY['platform_feature_flags','pff_write'],
    ARRAY['platform_notification_policies','platform_notification_policies_write'],
    ARRAY['platform_role_assignments','pra_write'],
    ARRAY['platform_users','platform_users_write'],
    ARRAY['practical_assessments','practical_assessments_write'],
    ARRAY['question_banks','question_banks_write'],
    ARRAY['quota_warning_logs','quota_warning_logs_write'],
    ARRAY['role_competency_requirements','rcr_write'],
    ARRAY['subscription_plans','subscription_plans_admin_write'],
    ARRAY['subscriptions','subscriptions_admin_write'],
    ARRAY['training_paths','training_paths_write'],
    ARRAY['training_sessions','training_sessions_write'],
    ARRAY['unified_question_usages','unified_question_usages_manage'],
    ARRAY['unified_quiz_questions','unified_quiz_questions_manage'],
    ARRAY['wizard_definitions','Platform operators can manage wizard definitions']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY safe_pairs
  LOOP
    SELECT schemaname, tablename, policyname, roles, qual, with_check, permissive
      INTO pol
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = pair[1] AND policyname = pair[2] AND cmd = 'ALL';

    IF NOT FOUND THEN
      RAISE NOTICE 'Skipping %.% - policy not found (already changed?)', pair[1], pair[2];
      CONTINUE;
    END IF;

    roles_sql := array_to_string(pol.roles, ', ');

    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    FOREACH cmd_name IN ARRAY ARRAY['INSERT','UPDATE','DELETE']
    LOOP
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
        pol.policyname || '_' || lower(cmd_name),
        pol.schemaname,
        pol.tablename,
        CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        cmd_name,
        roles_sql,
        CASE WHEN cmd_name IN ('UPDATE','DELETE') AND pol.qual IS NOT NULL THEN format(' USING (%s)', pol.qual) ELSE '' END,
        CASE WHEN cmd_name IN ('INSERT','UPDATE') THEN
          CASE WHEN pol.with_check IS NOT NULL THEN format(' WITH CHECK (%s)', pol.with_check)
               WHEN pol.qual IS NOT NULL THEN format(' WITH CHECK (%s)', pol.qual)
               ELSE '' END
        ELSE '' END
      );
    END LOOP;
  END LOOP;
END $$;
