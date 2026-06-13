-- Prevent multiple active published versions of the same module title in the same scope.
-- Scope is property_id + department_id (NULL treated as global scope).

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(trim(title)),
        coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.training_modules
  WHERE coalesce(is_deleted, false) = false
    AND coalesce(is_active, false) = true
    AND status = 'published'
)
UPDATE public.training_modules tm
SET
  status = 'archived',
  is_active = false,
  updated_at = now()
FROM ranked r
WHERE tm.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_training_modules_active_published_title_scope
ON public.training_modules (
  lower(trim(title)),
  coalesce(property_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE coalesce(is_deleted, false) = false
  AND coalesce(is_active, false) = true
  AND status = 'published';;
