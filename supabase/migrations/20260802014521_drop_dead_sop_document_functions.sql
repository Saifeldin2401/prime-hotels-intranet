-- ============================================================================
-- MIGRATION: drop_dead_sop_document_functions
-- approve_sop_document, reject_sop_document, create_sop_document,
-- update_sop_document all reference sop_documents/sop_document_versions/
-- sop_document_approvals -- none of which exist in this database. A code
-- comment in src/services/knowledgeService.ts confirms these were already
-- consolidated into the generic `documents` table (content_type='sop') plus
-- sop_comments/sop_comment_votes, which do exist and are what the frontend
-- actually uses. These 4 functions only appear in the auto-generated
-- database.generated.ts types file -- grep confirms zero call sites in
-- application code. They were also a live security liability (no
-- authorization checks: approve/reject didn't verify auth.uid() = approver,
-- create/update let status be set directly to 'approved' bypassing any
-- workflow) but since the underlying tables don't exist they've never
-- actually been exploitable or functional -- every call throws "relation
-- does not exist". Dropping as dead code from a superseded schema design
-- rather than patching security holes in permanently-broken, unused
-- functions.
--
-- Applied live via Supabase MCP apply_migration on 2026-08-01.
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_sop_document(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.reject_sop_document(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_sop_document(text, uuid, uuid, text, text, text, uuid, uuid, jsonb, text, boolean, uuid);
DROP FUNCTION IF EXISTS public.update_sop_document(uuid, uuid, text, text, text, text, uuid, uuid, uuid, jsonb, text, text);
