-- Requests storage bucket + leave_requests link to workflow request

-- 1) Private bucket for request attachments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'requests') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('requests', 'requests', false);
  END IF;
END $$;

-- Helper to parse request_id from object path "{request_id}/{file}"
DROP FUNCTION IF EXISTS public.request_id_from_storage_path(text) CASCADE;
CREATE OR REPLACE FUNCTION public.request_id_from_storage_path(p_path text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_part text;
  v_uuid uuid;
BEGIN
  v_part := split_part(p_path, '/', 1);
  v_uuid := v_part::uuid;
  RETURN v_uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Storage policies for 'requests' bucket
DROP POLICY IF EXISTS requests_objects_select ON storage.objects;
DROP POLICY IF EXISTS requests_objects_insert ON storage.objects;
DROP POLICY IF EXISTS requests_objects_update ON storage.objects;
DROP POLICY IF EXISTS requests_objects_delete ON storage.objects;

CREATE POLICY requests_objects_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'requests'
    AND public.can_view_request(public.request_id_from_storage_path(name))
  );

CREATE POLICY requests_objects_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'requests'
    AND public.can_view_request(public.request_id_from_storage_path(name))
  );

CREATE POLICY requests_objects_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'requests'
    AND public.can_view_request(public.request_id_from_storage_path(name))
  )
  WITH CHECK (
    bucket_id = 'requests'
    AND public.can_view_request(public.request_id_from_storage_path(name))
  );

CREATE POLICY requests_objects_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'requests'
    AND (public.is_hr(auth.uid()) OR public.is_admin(auth.uid()))
    AND public.can_view_request(public.request_id_from_storage_path(name))
  );

-- 2) Link leave_requests -> workflow requests
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS workflow_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='leave_requests'
      AND constraint_type='FOREIGN KEY'
      AND constraint_name='leave_requests_workflow_request_id_fkey'
  ) THEN
    ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_workflow_request_id_fkey
      FOREIGN KEY (workflow_request_id) REFERENCES requests(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leave_requests_workflow_request_id ON leave_requests(workflow_request_id);

UPDATE leave_requests lr
SET workflow_request_id = r.id
FROM requests r
WHERE r.entity_type = 'leave_request'
  AND r.entity_id = lr.id
  AND (lr.workflow_request_id IS NULL OR lr.workflow_request_id <> r.id);

-- 3) Ensure trigger writes workflow_request_id
CREATE OR REPLACE FUNCTION public.create_request_for_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_id UUID;
  v_hr_id UUID;
  v_request_id UUID;
BEGIN
  SELECT reporting_to INTO v_supervisor_id
  FROM profiles
  WHERE id = NEW.requester_id;

  v_hr_id := public.find_hr_assignee(NEW.property_id);

  INSERT INTO requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    metadata
  )
  VALUES (
    'leave_request',
    NEW.id,
    NEW.requester_id,
    v_supervisor_id,
    COALESCE(v_supervisor_id, v_hr_id),
    CASE WHEN v_supervisor_id IS NULL THEN 'pending_hr_review' ELSE 'pending_supervisor_approval' END,
    now(),
    jsonb_build_object('property_id', NEW.property_id, 'department_id', NEW.department_id)
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    requester_id = EXCLUDED.requester_id,
    supervisor_id = EXCLUDED.supervisor_id,
    current_assignee_id = EXCLUDED.current_assignee_id,
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_request_id;

  UPDATE leave_requests
  SET workflow_request_id = v_request_id
  WHERE id = NEW.id;

  DELETE FROM request_steps WHERE request_id = v_request_id;

  IF v_supervisor_id IS NOT NULL THEN
    INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
    VALUES (v_request_id, 1, v_supervisor_id, 'pending', NEW.requester_id);

    IF v_hr_id IS NOT NULL THEN
      INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
      VALUES (v_request_id, 2, v_hr_id, 'waiting', NEW.requester_id);
    END IF;
  ELSE
    IF v_hr_id IS NOT NULL THEN
      INSERT INTO request_steps (request_id, step_order, assignee_id, status, created_by)
      VALUES (v_request_id, 1, v_hr_id, 'pending', NEW.requester_id);
    END IF;
  END IF;

  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (v_request_id, NEW.requester_id, 'submitted', jsonb_build_object('entity_type', 'leave_request'));

  IF COALESCE(v_supervisor_id, v_hr_id) IS NOT NULL AND COALESCE(v_supervisor_id, v_hr_id) <> NEW.requester_id THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      COALESCE(v_supervisor_id, v_hr_id),
      'approval_required',
      'Approval required',
      'A new leave request requires your approval.',
      jsonb_build_object('request_id', v_request_id, 'entity_type', 'leave_request', 'entity_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;;
