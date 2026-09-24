-- ============================================================================
-- Migration: 20260902040100_performance_covering_indexes.sql
-- Add covering indexes on high-frequency foreign keys for production performance
-- ============================================================================

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON public.api_keys(created_by);

-- competencies & course_competencies
CREATE INDEX IF NOT EXISTS idx_competencies_department_id ON public.competencies(department_id);
CREATE INDEX IF NOT EXISTS idx_course_competencies_competency_id ON public.course_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_user_competencies_competency_id ON public.user_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_user_competencies_assessed_by ON public.user_competencies(assessed_by);
CREATE INDEX IF NOT EXISTS idx_role_competency_requirements_dept ON public.role_competency_requirements(department_id);
CREATE INDEX IF NOT EXISTS idx_role_competency_requirements_created_by ON public.role_competency_requirements(created_by);

-- employee_transfer_logs
CREATE INDEX IF NOT EXISTS idx_emp_transfer_from_dept ON public.employee_transfer_logs(from_department_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_from_hotel ON public.employee_transfer_logs(from_hotel_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_new_dept ON public.employee_transfer_logs(new_department_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_new_hotel ON public.employee_transfer_logs(new_hotel_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_prev_dept ON public.employee_transfer_logs(previous_department_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_prev_hotel ON public.employee_transfer_logs(previous_hotel_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_to_dept ON public.employee_transfer_logs(to_department_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_to_hotel ON public.employee_transfer_logs(to_hotel_id);
CREATE INDEX IF NOT EXISTS idx_emp_transfer_by ON public.employee_transfer_logs(transferred_by);

-- learning_assignments & rules
CREATE INDEX IF NOT EXISTS idx_learning_assignments_assigned_by ON public.learning_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_rule_id ON public.learning_assignments(rule_id);
CREATE INDEX IF NOT EXISTS idx_learning_assignments_training_path_id ON public.learning_assignments(training_path_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_brand ON public.training_assignment_rules(brand_id);
CREATE INDEX IF NOT EXISTS idx_training_assignment_rules_hotel ON public.training_assignment_rules(hotel_id);

-- media
CREATE INDEX IF NOT EXISTS idx_media_asset_usages_asset_id ON public.media_asset_usages(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON public.media_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_collection_items_asset ON public.media_collection_items(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_collections_created_by ON public.media_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_media_collections_property ON public.media_collections(property_id);

-- platform & organizations
CREATE INDEX IF NOT EXISTS idx_org_memberships_invited_by ON public.organization_memberships(invited_by);
CREATE INDEX IF NOT EXISTS idx_org_feature_overrides_key ON public.organization_feature_overrides(key);
CREATE INDEX IF NOT EXISTS idx_org_feature_overrides_updated_by ON public.organization_feature_overrides(updated_by);
CREATE INDEX IF NOT EXISTS idx_org_notif_overrides_key ON public.organization_notification_overrides(policy_key);
CREATE INDEX IF NOT EXISTS idx_platform_flags_updated_by ON public.platform_feature_flags(updated_by);
CREATE INDEX IF NOT EXISTS idx_platform_roles_granted_by ON public.platform_role_assignments(granted_by);
CREATE INDEX IF NOT EXISTS idx_platform_roles_revoked_by ON public.platform_role_assignments(revoked_by);
CREATE INDEX IF NOT EXISTS idx_platform_users_created_by ON public.platform_users(created_by);
CREATE INDEX IF NOT EXISTS idx_service_accounts_created_by ON public.service_accounts(created_by);

-- practical assessments
CREATE INDEX IF NOT EXISTS idx_practical_assessments_course ON public.practical_assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_practical_assessments_dept ON public.practical_assessments(department_id);
CREATE INDEX IF NOT EXISTS idx_practical_assessments_org ON public.practical_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_practical_submissions_assessment ON public.practical_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_practical_submissions_evaluator ON public.practical_submissions(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_practical_submissions_hotel ON public.practical_submissions(hotel_id);

-- training sessions
CREATE INDEX IF NOT EXISTS idx_training_sessions_course ON public.training_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_instructor ON public.training_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_training_session_attendees_user ON public.training_session_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_training_session_attendees_marked ON public.training_session_attendees(marked_by);

-- webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON public.webhook_deliveries(event_id);
