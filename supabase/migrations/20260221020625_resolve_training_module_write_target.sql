-- Resolve stale Training Builder module URLs to the active writable module.
-- Returns NULL when no writable replacement exists.
CREATE OR REPLACE FUNCTION public.resolve_training_module_write_target(p_module_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_module RECORD;
  v_target uuid;
BEGIN
  SELECT id, title, status, is_active, is_deleted, property_id, department_id
  INTO v_module
  FROM public.training_modules
  WHERE id = p_module_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_module.is_deleted, false) = false
     AND COALESCE(v_module.is_active, true) = true
     AND COALESCE(v_module.status, 'draft') <> 'archived' THEN
    RETURN v_module.id;
  END IF;

  SELECT tm.id
  INTO v_target
  FROM public.training_modules tm
  WHERE tm.id <> v_module.id
    AND tm.title = v_module.title
    AND COALESCE(tm.is_deleted, false) = false
    AND COALESCE(tm.is_active, true) = true
    AND COALESCE(tm.status, 'draft') <> 'archived'
    AND tm.property_id IS NOT DISTINCT FROM v_module.property_id
    AND tm.department_id IS NOT DISTINCT FROM v_module.department_id
  ORDER BY tm.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_target;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_training_module_write_target(uuid)
TO authenticated, service_role;;
