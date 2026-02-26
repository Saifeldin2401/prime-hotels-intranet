WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, type, entity_type, entity_id
           ORDER BY created_at DESC
         ) AS rn
  FROM public.notifications
  WHERE type = 'message_received'
    AND entity_type = 'message'
    AND entity_id IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;;
