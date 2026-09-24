-- ============================================================================
-- MIGRATION: drop_dead_compliance_export_and_sop_functions
--
-- Two clusters of functions that reference tables which do not exist, and which
-- have no reachable caller. Both are removed rather than repaired.
--
-- 1. AUDIT-EXPORT / COMPLIANCE (4 functions -> missing `audit_exports` table)
--    The frontend module behind these was deleted in the same change. Evidence
--    for deletion rather than completion:
--      * ComplianceDashboard.tsx was never routed -- no route module imports it,
--        so no user could reach it.
--      * The hook called 12 RPCs, of which 6 did not exist at all
--        (create_audit_export, list_audit_exports, get_audit_export_details,
--         record_audit_export_download, detect_suspicious_export_activity,
--         list_audit_export_templates).
--      * No edge function or storage bucket existed to actually generate,
--        hash, or store an export file.
--    A dashboard advertising cryptographic "audit export integrity
--    verification" that cannot produce an export is a compliance liability,
--    not a partial feature.
--
--    RETAINED: audit_export_retention_policies (table) and the routed admin
--    page AuditRetentionPolicies.tsx, which are real and working.
--
-- 2. SOP MODULE (8 functions -> missing sop_documents / sop_categories /
--    sop_document_versions / sop_document_approvals). SOP content was already
--    consolidated into the generic `documents` table (content_type='sop'), per
--    the comment in src/services/knowledgeService.ts. Zero frontend callers
--    confirmed by grep for all 8 RPC names.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-03.
-- ============================================================================

-- Compliance / audit-export
DROP FUNCTION IF EXISTS public.get_audit_chain_of_custody(uuid);
DROP FUNCTION IF EXISTS public.verify_audit_export_integrity(uuid);
DROP FUNCTION IF EXISTS public.generate_report_signature(uuid, jsonb);
DROP FUNCTION IF EXISTS public.get_compliance_dashboard_metrics(date, date);

-- SOP module
DROP FUNCTION IF EXISTS public.get_contextual_help(text, text);
DROP FUNCTION IF EXISTS public.get_required_reading(uuid);
DROP FUNCTION IF EXISTS public.get_sop_document_details(uuid);
DROP FUNCTION IF EXISTS public.get_sop_summary_stats();
DROP FUNCTION IF EXISTS public.increment_sop_view_count(uuid);
DROP FUNCTION IF EXISTS public.search_sop_documents(text, uuid, uuid, text, boolean, integer, integer, text, text);
DROP FUNCTION IF EXISTS public.create_new_sop_version();
DROP FUNCTION IF EXISTS public.get_document_history(uuid);
