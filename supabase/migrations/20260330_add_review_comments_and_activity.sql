-- Add guest review comments table
CREATE TABLE IF NOT EXISTS guest_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES guest_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  mentions TEXT[],
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_review_comments_review_id ON guest_review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_guest_review_comments_user_id ON guest_review_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_review_comments_created_at ON guest_review_comments(created_at DESC);

-- Add RLS policies
ALTER TABLE guest_review_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on reviews they have access to
CREATE POLICY "Users can view review comments" ON guest_review_comments
  FOR SELECT USING (
    -- Check if user has access to the review's property
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN guest_reviews gr ON gr.property_id = up.property_id
      WHERE gr.id = review_id AND up.user_id = auth.uid()
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN app_roles ar ON ar.name = ur.role
      WHERE ur.user_id = auth.uid() AND ar.name IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- Users can create comments on reviews they have access to
CREATE POLICY "Users can create review comments" ON guest_review_comments
  FOR INSERT WITH CHECK (
    -- Check if user has access to the review's property
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN guest_reviews gr ON gr.property_id = up.property_id
      WHERE gr.id = review_id AND up.user_id = auth.uid()
    )
    OR
    -- Admins can create on all
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN app_roles ar ON ar.name = ur.role
      WHERE ur.user_id = auth.uid() AND ar.name IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON guest_review_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own comments (admins can delete any)
CREATE POLICY "Users can delete own comments" ON guest_review_comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN app_roles ar ON ar.name = ur.role
      WHERE ur.user_id = auth.uid() AND ar.name IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- Add guest review activity log table
CREATE TABLE IF NOT EXISTS guest_review_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES guest_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'viewed', 'responded', 'assigned', 'escalated', 'commented', 'reanalyzed', etc.
  details JSONB, -- Additional context about the action
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_review_activity_review_id ON guest_review_activity(review_id);
CREATE INDEX IF NOT EXISTS idx_guest_review_activity_user_id ON guest_review_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_review_activity_created_at ON guest_review_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_review_activity_action ON guest_review_activity(action);

-- Add RLS policies
ALTER TABLE guest_review_activity ENABLE ROW LEVEL SECURITY;

-- Users can view activity on reviews they have access to
CREATE POLICY "Users can view review activity" ON guest_review_activity
  FOR SELECT USING (
    -- Check if user has access to the review's property
    EXISTS (
      SELECT 1 FROM user_properties up
      JOIN guest_reviews gr ON gr.property_id = up.property_id
      WHERE gr.id = review_id AND up.user_id = auth.uid()
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN app_roles ar ON ar.name = ur.role
      WHERE ur.user_id = auth.uid() AND ar.name IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr')
    )
  );

-- System can create activity entries (for automated actions)
CREATE POLICY "System can create activity entries" ON guest_review_activity
  FOR INSERT WITH CHECK (
    user_id IS NULL -- For system-generated activities
    OR
    -- Users can create activity for their own actions
    auth.uid() = user_id
  );

-- Add function to automatically log activity
CREATE OR REPLACE FUNCTION log_review_activity(
  p_review_id UUID,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO guest_review_activity (review_id, user_id, action, details)
  VALUES (
    p_review_id,
    COALESCE(p_user_id, auth.uid()),
    p_action,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically log when reviews are updated
CREATE OR REPLACE FUNCTION auto_log_review_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_review_activity(
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  -- Log when response is posted
  IF OLD.responded_at IS DISTINCT FROM NEW.responded_at AND NEW.responded_at IS NOT NULL THEN
    PERFORM log_review_activity(
      NEW.id,
      'responded',
      jsonb_build_object(
        'responded_at', NEW.responded_at
      )
    );
  END IF;
  
  -- Log when review is reanalyzed
  IF OLD.updated_at IS DISTINCT FROM NEW.updated_at AND 
     EXTRACT(EPOCH FROM (NEW.updated_at - OLD.updated_at)) < 60 THEN
    PERFORM log_review_activity(
      NEW.id,
      'reanalyzed',
      jsonb_build_object(
        'updated_at', NEW.updated_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_review_changes ON guest_reviews;
CREATE TRIGGER trigger_log_review_changes
  AFTER UPDATE ON guest_reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_review_changes();

-- Add trigger to log when assignments are created/updated
CREATE OR REPLACE FUNCTION log_assignment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_review_activity(
      NEW.review_id,
      'assigned',
      jsonb_build_object(
        'responsibility_code', NEW.responsibility_code,
        'assignee_id', NEW.assignee_profile_id,
        'status', NEW.status
      ),
      NEW.assignee_profile_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_review_activity(
        NEW.review_id,
        'assignment_updated',
        jsonb_build_object(
          'responsibility_code', NEW.responsibility_code,
          'assignee_id', NEW.assignee_profile_id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        NEW.assignee_profile_id
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for assignments
DROP TRIGGER IF EXISTS trigger_log_assignment_insert ON guest_review_assignments;
CREATE TRIGGER trigger_log_assignment_insert
  AFTER INSERT ON guest_review_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_assignment_changes();

DROP TRIGGER IF EXISTS trigger_log_assignment_update ON guest_review_assignments;
CREATE TRIGGER trigger_log_assignment_update
  AFTER UPDATE ON guest_review_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_assignment_changes();

-- Add trigger to log when responses are created/updated
CREATE OR REPLACE FUNCTION log_response_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_review_activity(
      NEW.review_id,
      'response_created',
      jsonb_build_object(
        'posted_externally', NEW.posted_externally,
        'has_internal_notes', NEW.internal_notes IS NOT NULL
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.posted_externally IS DISTINCT FROM NEW.posted_externally AND NEW.posted_externally = true THEN
      PERFORM log_review_activity(
        NEW.review_id,
        'response_posted_externally',
        jsonb_build_object(
          'posted_at', NEW.updated_at
        )
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for responses
DROP TRIGGER IF EXISTS trigger_log_response_insert ON guest_review_responses;
CREATE TRIGGER trigger_log_response_insert
  AFTER INSERT ON guest_review_responses
  FOR EACH ROW
  EXECUTE FUNCTION log_response_changes();

DROP TRIGGER IF EXISTS trigger_log_response_update ON guest_review_responses;
CREATE TRIGGER trigger_log_response_update
  AFTER UPDATE ON guest_review_responses
  FOR EACH ROW
  EXECUTE FUNCTION log_response_changes();
