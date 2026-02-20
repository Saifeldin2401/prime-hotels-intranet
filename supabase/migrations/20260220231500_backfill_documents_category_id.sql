-- Backfill missing document categories for production reporting/filter completeness.
-- Uses a dedicated global "Uncategorized" category to avoid incorrect department mapping.

INSERT INTO public.categories (name, department_id)
SELECT 'Uncategorized', NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories
  WHERE lower(name) = 'uncategorized'
    AND department_id IS NULL
);

WITH fallback_category AS (
  SELECT id
  FROM public.categories
  WHERE lower(name) = 'uncategorized'
    AND department_id IS NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 1
)
UPDATE public.documents d
SET category_id = fc.id,
    updated_at = now()
FROM fallback_category fc
WHERE coalesce(d.is_deleted, false) = false
  AND d.category_id IS NULL;
