-- Unified Requests Workflow Migration
-- This migration creates the generic request workflow system

-- Extend notification_type enum for request workflow notifications
ALTER TYPE notification_type ADD VALUE 'request_submitted';
ALTER TYPE notification_type ADD VALUE 'comment_added';
ALTER TYPE notification_type ADD VALUE 'request_returned';
ALTER TYPE notification_type ADD VALUE 'request_closed';

-- Requests table (generic request tracking)
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no BIGSERIAL UNIQUE NOT NULL,
  entity_type TEXT NOT NULL, -- 'leave_request', 'document', 'transfer', etc.
  entity_id UUID NOT NULL,
  requester_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_supervisor_approval', 'pending_hr_review', 'approved', 'rejected', 'returned_for_correction', 'closed')),
  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Request steps table (approval workflow steps)
CREATE TABLE request_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_role TEXT, -- 'supervisor', 'hr', 'admin', etc.
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'returned', 'skipped')),
  acted_at TIMESTAMPTZ,
  comment TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Request comments table
CREATE TABLE request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
  comment TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'internal')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Request events table (audit trail)
CREATE TABLE request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'submitted', 'status_changed', 'approved', 'rejected', 'forwarded', 'returned_for_correction', 'closed', 'comment_added', 'attachment_added')),
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Request attachments table
CREATE TABLE request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_requests_entity ON requests(entity_type, entity_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_requester ON requests(requester_id);
CREATE INDEX idx_requests_current_assignee ON requests(current_assignee_id);
CREATE INDEX idx_requests_created_at ON requests(created_at);
CREATE INDEX idx_request_steps_request ON request_steps(request_id);
CREATE INDEX idx_request_steps_assignee ON request_steps(assignee_id);
CREATE INDEX idx_request_comments_request ON request_comments(request_id);
CREATE INDEX idx_request_events_request ON request_events(request_id);
CREATE INDEX idx_request_attachments_request ON request_attachments(request_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper functions for request workflow
CREATE OR REPLACE FUNCTION is_hr(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = is_hr.user_id
    AND r.name IN ('regional_admin', 'regional_hr', 'property_hr')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = is_admin.user_id
    AND r.name = 'regional_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_view_request(user_id UUID, request_id UUID) RETURNS BOOLEAN AS $$
  DECLARE
    req RECORD;
    req_user_id UUID;
  BEGIN
    -- Get request details
    SELECT * INTO req FROM requests WHERE id = can_view_request.request_id;
    IF NOT FOUND THEN RETURN FALSE;
    
    -- User can view their own requests
    IF req.requester_id = can_view_request.user_id THEN RETURN TRUE;
    
    -- HR and admin can view all requests
    IF is_hr(can_view_request.user_id) THEN RETURN TRUE;
    
    -- Current assignee can view
    IF req.current_assignee_id = can_view_request.user_id THEN RETURN TRUE;
    
    -- Supervisor can view their team's requests
    IF req.supervisor_id = can_view_request.user_id THEN RETURN TRUE;
    
    RETURN FALSE;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_hr_assignee(property_id UUID) RETURNS UUID AS $$
  DECLARE
    hr_user_id UUID;
  BEGIN
    -- Find property HR first
    SELECT p.user_id INTO hr_user_id
    FROM user_properties up
    JOIN user_roles ur ON up.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE up.property_id = find_hr_assignee.property_id
    AND r.name = 'property_hr'
    LIMIT 1;
    
    -- If no property HR, find regional HR
    IF hr_user_id IS NULL THEN
      SELECT ur.user_id INTO hr_user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'regional_hr'
      LIMIT 1;
    END IF;
    
    RETURN hr_user_id;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Event triggers for notifications
CREATE OR REPLACE FUNCTION notify_request_submitted() RETURNS TRIGGER AS $$
BEGIN
  -- Notify supervisor
  IF NEW.supervisor_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.supervisor_id,
      'request_submitted',
      'New Request Submitted',
      format('Request #%s from %s requires your approval', NEW.request_no, COALESCE((SELECT full_name FROM profiles WHERE id = NEW.requester_id), 'Unknown')),
      jsonb_build_object('request_id', NEW.id, 'entity_type', NEW.entity_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_request_status_changed() RETURNS TRIGGER AS $$
BEGIN
  -- Notify requester if status changed
  IF OLD.status != NEW.status AND NEW.requester_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.requester_id,
      CASE NEW.status
        WHEN 'approved' THEN 'request_approved'
        WHEN 'rejected' THEN 'request_rejected'
        WHEN 'returned_for_correction' THEN 'request_returned'
        WHEN 'closed' THEN 'request_closed'
        ELSE 'request_approved' -- fallback
      END,
      format('Request #%s %s', NEW.request_no, REPLACE(NEW.status, '_', ' ')),
      format('Your request has been %s', REPLACE(NEW.status, '_', ' ')),
      jsonb_build_object('request_id', NEW.id, 'entity_type', NEW.entity_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_comment_added() RETURNS TRIGGER AS $$
BEGIN
  -- Notify current assignee and requester about new comment
  IF NEW.request_id IS NOT NULL THEN
    DECLARE
      req RECORD;
    BEGIN
      SELECT * INTO req FROM requests WHERE id = NEW.request_id;
      
      -- Notify current assignee (if not the commenter)
      IF req.current_assignee_id IS NOT NULL AND req.current_assignee_id != NEW.author_id THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          req.current_assignee_id,
          'comment_added',
          'New Comment Added',
          format('A new comment was added to request #%s', req.request_no),
          jsonb_build_object('request_id', NEW.request_id, 'comment_id', NEW.id)
        );
      END IF;
      
      -- Notify requester (if not the commenter and different from assignee)
      IF req.requester_id != NEW.author_id AND req.requester_id != req.current_assignee_id THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          req.requester_id,
          'comment_added',
          'New Comment Added',
          format('A new comment was added to request #%s', req.request_no),
          jsonb_build_object('request_id', NEW.request_id, 'comment_id', NEW.id)
        );
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER request_submitted_trigger
  AFTER UPDATE ON requests
  FOR EACH ROW
  WHEN (OLD.status = 'draft' AND NEW.status = 'pending_supervisor_approval')
  EXECUTE FUNCTION notify_request_submitted();

CREATE TRIGGER request_status_changed_trigger
  AFTER UPDATE ON requests
  FOR EACH ROW
  WHEN (OLD.status != NEW.status)
  EXECUTE FUNCTION notify_request_status_changed();

CREATE TRIGGER comment_added_trigger
  AFTER INSERT ON request_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_added();

-- RPC function for applying actions to requests
CREATE OR REPLACE FUNCTION request_apply_action(
  p_request_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL,
  p_forward_to UUID DEFAULT NULL,
  p_visibility TEXT DEFAULT 'all'
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  req RECORD;
  current_step RECORD;
  next_step RECORD;
  actor_id UUID := auth.uid();
BEGIN
  -- Get request and validate access
  SELECT * INTO req FROM requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Request not found';
    RETURN;
  END IF;
  
  IF NOT can_view_request(actor_id, p_request_id) THEN
    RETURN QUERY SELECT FALSE, 'Access denied';
    RETURN;
  END IF;
  
  -- Get current step
  SELECT * INTO current_step FROM request_steps 
  WHERE request_id = p_request_id AND status = 'pending' 
  ORDER BY step_order LIMIT 1;
  
  CASE p_action
    WHEN 'approve' THEN
      -- Update current step
      UPDATE request_steps 
      SET status = 'approved', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      -- Find next step
      SELECT * INTO next_step FROM request_steps 
      WHERE request_id = p_request_id AND step_order > current_step.step_order AND status = 'waiting'
      ORDER BY step_order LIMIT 1;
      
      IF next_step IS NOT NULL THEN
        -- Activate next step
        UPDATE request_steps 
        SET status = 'pending', assignee_id = next_step.assignee_id
        WHERE id = next_step.id;
        
        -- Update request status and assignee
        UPDATE requests 
        SET status = 'pending_hr_review', current_assignee_id = next_step.assignee_id
        WHERE id = p_request_id;
      ELSE
        -- No more steps, approve the request
        UPDATE requests 
        SET status = 'approved', current_assignee_id = NULL, closed_at = now()
        WHERE id = p_request_id;
      END IF;
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'approved', jsonb_build_object('comment', p_comment));
      
    WHEN 'reject' THEN
      -- Reject the request
      UPDATE request_steps 
      SET status = 'rejected', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE requests 
      SET status = 'rejected', current_assignee_id = NULL, closed_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'rejected', jsonb_build_object('comment', p_comment));
      
    WHEN 'return' THEN
      -- Return for correction
      UPDATE request_steps 
      SET status = 'returned', acted_at = now(), comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE requests 
      SET status = 'returned_for_correction', current_assignee_id = req.requester_id
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'returned_for_correction', jsonb_build_object('comment', p_comment));
      
    WHEN 'forward' THEN
      -- Forward to different person
      UPDATE request_steps 
      SET assignee_id = p_forward_to, comment = p_comment
      WHERE id = current_step.id;
      
      UPDATE requests 
      SET current_assignee_id = p_forward_to
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'forwarded', jsonb_build_object('forward_to', p_forward_to, 'comment', p_comment));
      
    WHEN 'close' THEN
      -- Close the request
      UPDATE requests 
      SET status = 'closed', current_assignee_id = NULL, closed_at = now()
      WHERE id = p_request_id;
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'closed', jsonb_build_object('comment', p_comment));
      
    WHEN 'add_comment' THEN
      -- Add comment
      INSERT INTO request_comments (request_id, author_id, comment, visibility)
      VALUES (p_request_id, actor_id, p_comment, p_visibility);
      
      -- Log event
      INSERT INTO request_events (request_id, actor_id, event_type, payload)
      VALUES (p_request_id, actor_id, 'comment_added', jsonb_build_object('comment', p_comment, 'visibility', p_visibility));
      
  END CASE;
  
  RETURN QUERY SELECT TRUE, 'Action completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "requests_select_visible" ON requests FOR SELECT
  TO authenticated
  USING (can_view_request(auth.uid(), id));

CREATE POLICY "requests_insert_authenticated" ON requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "requests_update_authorized" ON requests FOR UPDATE
  TO authenticated
  USING (can_view_request(auth.uid(), id))
  WITH CHECK (can_view_request(auth.uid(), id));

CREATE POLICY "request_steps_select_visible" ON request_steps FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_steps.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_steps_insert_authorized" ON request_steps FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_steps.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_steps_update_authorized" ON request_steps FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_steps.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_comments_select_visible" ON request_comments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_comments.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_comments_insert_authorized" ON request_comments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_comments.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_events_select_visible" ON request_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_events.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_events_insert_authorized" ON request_events FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_events.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_attachments_select_visible" ON request_attachments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_attachments.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

CREATE POLICY "request_attachments_insert_authorized" ON request_attachments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_attachments.request_id 
    AND can_view_request(auth.uid(), r.id)
  ));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON request_steps TO authenticated;
GRANT SELECT, INSERT ON request_comments TO authenticated;
GRANT SELECT, INSERT ON request_events TO authenticated;
GRANT SELECT, INSERT ON request_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION request_apply_action TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_request TO authenticated;
GRANT EXECUTE ON FUNCTION is_hr TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
