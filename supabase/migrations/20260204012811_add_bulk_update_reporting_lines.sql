-- Atomic bulk update for reporting lines (2026-02-04)
-- Ensures all updates succeed or none do (transactional)

CREATE OR REPLACE FUNCTION bulk_update_reporting_lines(
  p_updates JSONB
) RETURNS JSONB AS $$
DECLARE
  v_update RECORD;
  v_success_count INTEGER := 0;
  v_employee_id UUID;
  v_new_manager_id UUID;
BEGIN
  -- Validate input is an array
  IF jsonb_typeof(p_updates) != 'array' THEN
    RAISE EXCEPTION 'Updates must be a JSON array';
  END IF;

  -- Process each update within the same transaction
  FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    v_employee_id := (v_update.value->>'employee_id')::UUID;
    v_new_manager_id := CASE 
      WHEN v_update.value->>'new_manager_id' IS NULL OR v_update.value->>'new_manager_id' = '' 
      THEN NULL 
      ELSE (v_update.value->>'new_manager_id')::UUID 
    END;

    -- Check for circular reporting (uses existing trigger, but let's add explicit check)
    IF v_new_manager_id IS NOT NULL THEN
      -- Check if new_manager_id reports to employee_id (would create circular)
      IF EXISTS (
        WITH RECURSIVE chain AS (
          SELECT reporting_to FROM profiles WHERE id = v_new_manager_id
          UNION ALL
          SELECT p.reporting_to FROM profiles p JOIN chain c ON p.id = c.reporting_to
        )
        SELECT 1 FROM chain WHERE reporting_to = v_employee_id LIMIT 1
      ) THEN
        RAISE EXCEPTION 'Cannot assign manager %: would create circular reporting chain for employee %', 
          v_new_manager_id, v_employee_id;
      END IF;
    END IF;

    -- Perform the update
    UPDATE profiles
    SET reporting_to = v_new_manager_id, updated_at = NOW()
    WHERE id = v_employee_id;

    v_success_count := v_success_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_success_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION bulk_update_reporting_lines(JSONB) TO authenticated;;
