-- Atomic replacement of workflow steps (2026-02-04)
-- Ensures deletes and inserts happen in a single transaction

CREATE OR REPLACE FUNCTION replace_workflow_steps(
  p_workflow_id UUID,
  p_steps JSONB
) RETURNS JSONB AS $$
DECLARE
  v_step RECORD;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Validate input
  IF jsonb_typeof(p_steps) != 'array' THEN
    RAISE EXCEPTION 'Steps must be a JSON array';
  END IF;

  -- Verify workflow exists
  IF NOT EXISTS (SELECT 1 FROM workflows WHERE id = p_workflow_id) THEN
    RAISE EXCEPTION 'Workflow not found: %', p_workflow_id;
  END IF;

  -- Delete existing steps
  DELETE FROM workflow_steps WHERE workflow_id = p_workflow_id;

  -- Insert new steps
  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO workflow_steps (
      workflow_id,
      step_order,
      action_type,
      config,
      name,
      description
    )
    VALUES (
      p_workflow_id,
      COALESCE((v_step.value->>'step_order')::INTEGER, (v_step.value->>'order')::INTEGER, v_inserted_count + 1),
      (v_step.value->>'action_type'),
      COALESCE(v_step.value->'config', '{}'::jsonb),
      (v_step.value->>'name'),
      (v_step.value->>'description')
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'workflow_id', p_workflow_id,
    'steps_created', v_inserted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION replace_workflow_steps(UUID, JSONB) TO authenticated;;
