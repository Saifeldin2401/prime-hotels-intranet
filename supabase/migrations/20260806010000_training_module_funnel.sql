-- TrainingPlayer already writes one training_block_progress row per completed block
-- (recordBlockCompletion), but nothing in admin ever reads it -- so "where do people abandon
-- this module" was unanswerable despite the data existing. This RPC turns it into a per-block
-- completion funnel: block order, title, type, and how many of the module's assignees
-- completed that block. A steep drop between two rows is exactly where people quit.

CREATE OR REPLACE FUNCTION public.get_training_module_funnel(p_module_id uuid)
RETURNS TABLE(
    block_id uuid,
    block_title text,
    block_type text,
    block_order integer,
    completed_count bigint,
    completion_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH enrolled AS (
        SELECT count(*) AS total
        FROM public.training_progress tp
        WHERE tp.training_id = p_module_id
          AND tp.lp_content_type = 'module'
          AND tp.is_deleted = false
    )
    SELECT
        b.id,
        b.title,
        b.type,
        b."order",
        count(bp.user_id) AS completed_count,
        CASE WHEN (SELECT total FROM enrolled) > 0
            THEN round(100.0 * count(bp.user_id) / (SELECT total FROM enrolled), 1)
            ELSE 0
        END AS completion_rate
    FROM public.training_content_blocks_v b
    LEFT JOIN public.training_block_progress bp
      ON bp.block_id = b.id AND bp.completed_at IS NOT NULL
    WHERE b.training_module_id = p_module_id
      AND b.is_deleted = false
      AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND (ur.role)::text = ANY (ARRAY['super_admin','corporate_admin','regional_admin','regional_hr','property_hr','department_head'])
      )
    GROUP BY b.id, b.title, b.type, b."order"
    ORDER BY b."order";
$$;

COMMENT ON FUNCTION public.get_training_module_funnel IS
    'Per-block completion funnel for a module (admin/manager only): shows where learners drop off.';

REVOKE EXECUTE ON FUNCTION public.get_training_module_funnel(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_training_module_funnel(uuid) TO authenticated;
