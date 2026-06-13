-- Request Attachments Storage and Leave Request Link Migration
-- This migration creates storage for request attachments and links leave requests

-- Create private storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'requests', 
  'requests', 
  false, 
  50 * 1024 * 1024, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Helper function to extract request ID from storage path
CREATE OR REPLACE FUNCTION request_id_from_storage_path(storage_path TEXT) RETURNS UUID AS $$
BEGIN
  -- Storage path format: requests/{request_id}/{filename}
  RETURN (split_part(storage_path, '/', 2))::UUID;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for request attachments storage
CREATE POLICY "request_attachments_select_own" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'requests' 
    AND can_view_request(auth.uid(), request_id_from_storage_path(name))
  );

CREATE POLICY "request_attachments_insert_authorized" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'requests' 
    AND can_view_request(auth.uid(), request_id_from_storage_path(name))
  );

CREATE POLICY "request_attachments_update_own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'requests' 
    AND can_view_request(auth.uid(), request_id_from_storage_path(name))
  );

-- Add workflow_request_id to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN workflow_request_id UUID REFERENCES requests(id) ON DELETE SET NULL;

-- Create trigger to automatically create workflow request for leave requests
CREATE OR REPLACE FUNCTION create_request_for_leave_request() RETURNS TRIGGER AS $$
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
  
  -- Create the request
  INSERT INTO requests (entity_type, entity_id, requester_id, supervisor_id, current_assignee_id, status, submitted_at, metadata)
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
    )
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

-- Create trigger for new leave requests
CREATE TRIGGER leave_request_workflow_trigger
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_request_for_leave_request();

-- Function to handle leave request status changes
CREATE OR REPLACE FUNCTION sync_leave_request_status() RETURNS TRIGGER AS $$
BEGIN
  -- Update leave request status based on workflow request status
  UPDATE leave_requests 
  SET status = CASE NEW.status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'returned_for_correction' THEN 'pending' -- Reset to pending for correction
    ELSE OLD.status
  END
  WHERE id = NEW.entity_id AND NEW.entity_type = 'leave_request';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync status changes
CREATE TRIGGER sync_leave_request_status_trigger
  AFTER UPDATE ON requests
  FOR EACH ROW
  WHEN (OLD.status != NEW.status)
  EXECUTE FUNCTION sync_leave_request_status();

-- Grant permissions for storage operations
GRANT SELECT, INSERT, UPDATE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;
