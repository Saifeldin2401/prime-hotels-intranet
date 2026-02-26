BEGIN;

WITH first_last_actor AS (
  SELECT
    d.id AS document_id,
    (
      SELECT al.user_id
      FROM public.audit_logs al
      WHERE al.entity_type = 'documents'
        AND al.entity_id = d.id
        AND al.user_id IS NOT NULL
      ORDER BY al.created_at ASC
      LIMIT 1
    ) AS first_user_id,
    (
      SELECT al.user_id
      FROM public.audit_logs al
      WHERE al.entity_type = 'documents'
        AND al.entity_id = d.id
        AND al.user_id IS NOT NULL
      ORDER BY al.created_at DESC
      LIMIT 1
    ) AS last_user_id
  FROM public.documents d
),
resolved AS (
  SELECT
    fla.document_id,
    p_first.id AS created_by_candidate,
    p_last.id AS updated_by_candidate
  FROM first_last_actor fla
  LEFT JOIN public.profiles p_first ON p_first.id = fla.first_user_id
  LEFT JOIN public.profiles p_last ON p_last.id = fla.last_user_id
)
UPDATE public.documents d
SET
  created_by = COALESCE(d.created_by, r.created_by_candidate),
  updated_by = COALESCE(d.updated_by, r.updated_by_candidate)
FROM resolved r
WHERE d.id = r.document_id
  AND d.is_deleted = false
  AND (
    (d.created_by IS NULL AND r.created_by_candidate IS NOT NULL)
    OR (d.updated_by IS NULL AND r.updated_by_candidate IS NOT NULL)
  );

COMMIT;;
