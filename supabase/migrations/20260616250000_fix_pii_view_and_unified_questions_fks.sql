-- 1. unified_questions: add the FK constraints the frontend embeds expect
--    (profiles!unified_questions_created_by_fkey / _reviewed_by_fkey).
ALTER TABLE public.unified_questions
  ADD CONSTRAINT unified_questions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.unified_questions
  ADD CONSTRAINT unified_questions_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Rebuild pii_access_logs_v (original columns kept in order, new ones appended)
--    so the frontend no longer needs FK embeds on a view: exposes the filter
--    columns (user_id/resource_type/access_type), the approval fields persisted in
--    metadata, and the actor/target/approver profiles as JSON.
CREATE OR REPLACE VIEW public.pii_access_logs_v WITH (security_invoker = true) AS
SELECT
  se.id,
  se.actor_id,
  se.entity_id AS target_user_id,
  ARRAY(SELECT jsonb_array_elements_text(se.metadata->'fields_accessed')) AS fields_accessed,
  se.metadata->>'reason' AS reason,
  se.created_at,
  se.entity_id AS user_id,
  se.metadata->>'resource_type' AS resource_type,
  se.metadata->>'access_type'   AS access_type,
  se.metadata->>'approved_by'   AS approved_by,
  se.metadata->>'justification' AS justification,
  NULLIF(se.metadata->>'approved_at','')::timestamptz AS approved_at,
  (SELECT jsonb_build_object('full_name', ap.full_name, 'email', ap.email)
     FROM public.profiles ap WHERE ap.id = se.actor_id) AS accessed_by_profile,
  (SELECT jsonb_build_object('full_name', tp.full_name, 'email', tp.email)
     FROM public.profiles tp WHERE tp.id = se.entity_id) AS "user",
  (SELECT jsonb_build_object('full_name', pp.full_name, 'email', pp.email)
     FROM public.profiles pp WHERE pp.id = NULLIF(se.metadata->>'approved_by','')::uuid) AS approved_by_profile
FROM public.system_events se
WHERE se.event_type = 'pii_access';
