
-- Audit pass: 26 duplicate indexes reappeared (same `idx_x_col` vs `x_col_idx` collision
-- pattern fixed earlier today -- newer migrations re-added the second spelling), 2 new
-- FKs landed without covering indexes, and one new RLS policy re-evaluates auth.<fn>()
-- per row instead of once per query.

-- 1. Drop duplicate indexes (keeping one of each identical pair).
DROP INDEX IF EXISTS public.idx_ai_usage_log_user;
DROP INDEX IF EXISTS public.ae_user_idx;
DROP INDEX IF EXISTS public.idx_competencies_org;
DROP INDEX IF EXISTS public.courses_department_idx;
DROP INDEX IF EXISTS public.courses_property_idx;
DROP INDEX IF EXISTS public.idx_document_comments_user;
DROP INDEX IF EXISTS public.idx_document_notification_rules_user;
DROP INDEX IF EXISTS public.idx_documents_folder;
DROP INDEX IF EXISTS public.idx_documents_owner;
DROP INDEX IF EXISTS public.idx_idp_org;
DROP INDEX IF EXISTS public.knowledge_chunks_document_id_idx;
DROP INDEX IF EXISTS public.idx_learning_assignment_exemptions_user;
DROP INDEX IF EXISTS public.idx_learning_assignment_user_overrides_user;
DROP INDEX IF EXISTS public.lesson_progress_enrollment_idx;
DROP INDEX IF EXISTS public.idx_master_deployments_org;
DROP INDEX IF EXISTS public.idx_notification_delivery_events_org;
DROP INDEX IF EXISTS public.idx_notification_queue_org;
DROP INDEX IF EXISTS public.idx_platform_audit_org;
DROP INDEX IF EXISTS public.idx_question_banks_dept;
DROP INDEX IF EXISTS public.idx_question_banks_property;
DROP INDEX IF EXISTS public.idx_quota_warning_logs_org_id;
DROP INDEX IF EXISTS public.idx_rcr_org;
DROP INDEX IF EXISTS public.idx_unified_question_attempts_question;
DROP INDEX IF EXISTS public.idx_unified_questions_bank;
DROP INDEX IF EXISTS public.idx_user_achievements_user;
DROP INDEX IF EXISTS public.idx_webhooks_org;

-- 2. Cover the two new unindexed foreign keys.
CREATE INDEX IF NOT EXISTS idx_wizard_definitions_created_by
  ON public.wizard_definitions (created_by);
CREATE INDEX IF NOT EXISTS idx_wizard_user_progress_wizard_id
  ON public.wizard_user_progress (wizard_id);
