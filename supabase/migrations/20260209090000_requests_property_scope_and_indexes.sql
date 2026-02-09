-- Add property/department scoping to workflow requests + performance indexes

-- 1) Add scoping columns to requests
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 2) Backfill scope for leave_request workflows (best-effort)
UPDATE public.requests r
SET
  property_id = lr.property_id,
  department_id = lr.department_id
FROM public.leave_requests lr
WHERE lr.workflow_request_id = r.id
  AND r.entity_type = 'leave_request'
  AND (r.property_id IS NULL OR r.department_id IS NULL);

-- 3) Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_requests_property_id ON public.requests(property_id);
CREATE INDEX IF NOT EXISTS idx_requests_department_id ON public.requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_status_property ON public.requests(status, property_id);
CREATE INDEX IF NOT EXISTS idx_requests_status_department ON public.requests(status, department_id);

-- 4) Notification + messaging + training progress indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(recipient_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_training_progress_user_status ON public.training_progress(user_id, status);

-- 5) Update leave-request workflow trigger to persist scope on requests
CREATE OR REPLACE FUNCTION public.create_request_for_leave_request() RETURNS TRIGGER AS $$
DECLARE
  supervisor_id UUID;
  hr_assignee_id UUID;
  request_id UUID;
BEGIN
  -- Get supervisor from profiles
  SELECT reporting_to INTO supervisor_id 
  FROM profiles 
  WHERE id = NEW.requester_id;
  
  -- Find HR assignee
  hr_assignee_id := find_hr_assignee(NEW.property_id);
  
  -- Create the request with scope
  INSERT INTO requests (
    entity_type,
    entity_id,
    requester_id,
    supervisor_id,
    current_assignee_id,
    status,
    submitted_at,
    metadata,
    property_id,
    department_id
  )
  VALUES (
    'leave_request',
    NEW.id,
    NEW.requester_id,
    supervisor_id,
    COALESCE(supervisor_id, hr_assignee_id), -- Start with supervisor, fallback to HR
    CASE WHEN NEW.status = 'pending' THEN 'pending_supervisor_approval' ELSE 'draft' END,
    CASE WHEN NEW.status = 'pending' THEN now() ELSE NULL END,
    jsonb_build_object(
      'leave_type', NEW.type,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'reason', NEW.reason
    ),
    NEW.property_id,
    NEW.department_id
  )
  RETURNING id INTO request_id;
  
  -- Update leave request with workflow request ID
  UPDATE leave_requests 
  SET workflow_request_id = request_id 
  WHERE id = NEW.id;
  
  -- Create workflow steps
  IF supervisor_id IS NOT NULL THEN
    -- Supervisor step
    INSERT INTO request_steps (request_id, step_order, assignee_id, assignee_role, status, created_by)
    VALUES (request_id, 1, supervisor_id, 'supervisor', 
            CASE WHEN NEW.status = 'pending' THEN 'pending' ELSE 'waiting' END, NEW.requester_id);
  END IF;
  
  -- HR step (always created)
  INSERT INTO request_steps (request_id, step_order, assignee_id, assignee_role, status, created_by)
  VALUES (request_id, 
          CASE WHEN supervisor_id IS NOT NULL THEN 2 ELSE 1 END, 
          hr_assignee_id, 'hr', 'waiting', NEW.requester_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
