-- Unified Requests Workflow (v1)

-- 1) Extend notification types for request workflow (in-app). Safe DO blocks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'request_submitted'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'request_submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'comment_added'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'comment_added';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'request_returned'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'request_returned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type' AND e.enumlabel = 'request_closed'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'request_closed';
  END IF;
END $$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,

  entity_type TEXT NOT NULL, -- e.g. 'leave_request', 'transfer_request', ...
  entity_id UUID NOT NULL,

  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'pending_supervisor_approval',
      'pending_hr_review',
      'approved',
      'rejected',
      'returned_for_correction',
      'closed'
    )
  ),

  submitted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS request_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,

  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_role app_role,

  status TEXT NOT NULL DEFAULT 'waiting' CHECK (
    status IN ('waiting', 'pending', 'approved', 'rejected', 'returned', 'skipped')
  ),

  acted_at TIMESTAMPTZ,
  comment TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (request_id, step_order)
);

CREATE TABLE IF NOT EXISTS request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  comment TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'internal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'created',
      'submitted',
      'status_changed',
      'approved',
      'rejected',
      'forwarded',
      'returned_for_correction',
      'closed',
      'comment_added',
      'attachment_added'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'requests',
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_current_assignee_id ON requests(current_assignee_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_steps_request_id ON request_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id ON request_attachments(request_id);

-- 3) updated_at trigger
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4) Helper functions
CREATE OR REPLACE FUNCTION public.is_hr(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.has_role(user_id, 'regional_hr') OR
    public.has_role(user_id, 'property_hr');
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.has_role(user_id, 'regional_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_view_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM requests r
    JOIN profiles req ON req.id = r.requester_id
    WHERE r.id = request_id
      AND (
        r.requester_id = auth.uid() OR
        r.current_assignee_id = auth.uid() OR
        r.supervisor_id = auth.uid() OR
        req.reporting_to = auth.uid() OR
        public.is_hr(auth.uid()) OR
        public.is_admin(auth.uid())
      )
  );
$$;

-- 5) Event triggers (status changes + comment/attachment logging)
CREATE OR REPLACE FUNCTION public.request_insert_created_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.id, NEW.requester_id, 'created', jsonb_build_object('status', NEW.status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_after_insert_event ON requests;
CREATE TRIGGER requests_after_insert_event
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION public.request_insert_created_event();

CREATE OR REPLACE FUNCTION public.request_after_update_status_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO request_events (request_id, actor_id, event_type, payload)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_after_update_status ON requests;
CREATE TRIGGER requests_after_update_status
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION public.request_after_update_status_event();

CREATE OR REPLACE FUNCTION public.request_comment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_id UUID;
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.request_id, NEW.author_id, 'comment_added', jsonb_build_object('visibility', NEW.visibility));

  SELECT r.current_assignee_id INTO assignee_id FROM requests r WHERE r.id = NEW.request_id;

  -- In-app notification to current assignee (if any and not self)
  IF assignee_id IS NOT NULL AND assignee_id <> NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      assignee_id,
      'comment_added',
      'New comment on request',
      'A new comment was added to a request requiring attention.',
      jsonb_build_object('request_id', NEW.request_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS request_comments_after_insert_event ON request_comments;
CREATE TRIGGER request_comments_after_insert_event
  AFTER INSERT ON request_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.request_comment_event();

CREATE OR REPLACE FUNCTION public.request_attachment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO request_events (request_id, actor_id, event_type, payload)
  VALUES (NEW.request_id, NEW.uploaded_by, 'attachment_added', jsonb_build_object('file_name', NEW.file_name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS request_attachments_after_insert_event ON request_attachments;
CREATE TRIGGER request_attachments_after_insert_event
  AFTER INSERT ON request_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.request_attachment_event();

-- 6) RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (defensive)
DROP POLICY IF EXISTS requests_select ON requests;
DROP POLICY IF EXISTS requests_insert_own ON requests;
DROP POLICY IF EXISTS requests_update_owner_or_assignee ON requests;

DROP POLICY IF EXISTS request_steps_select ON request_steps;
DROP POLICY IF EXISTS request_steps_insert_admin_hr ON request_steps;
DROP POLICY IF EXISTS request_steps_update_assignee ON request_steps;

DROP POLICY IF EXISTS request_comments_select ON request_comments;
DROP POLICY IF EXISTS request_comments_insert ON request_comments;

DROP POLICY IF EXISTS request_events_select ON request_events;

DROP POLICY IF EXISTS request_attachments_select ON request_attachments;
DROP POLICY IF EXISTS request_attachments_insert ON request_attachments;

-- Requests
CREATE POLICY requests_select
  ON requests FOR SELECT
  TO authenticated
  USING (public.can_view_request(id));

CREATE POLICY requests_insert_own
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY requests_update_owner_or_assignee
  ON requests FOR UPDATE
  TO authenticated
  USING (
    public.can_view_request(id) AND (
      -- requester can edit only in draft/returned
      (requester_id = auth.uid() AND status IN ('draft', 'returned_for_correction')) OR
      -- current assignee (supervisor/HR/admin) can update
      (current_assignee_id = auth.uid()) OR
      public.is_hr(auth.uid()) OR
      public.is_admin(auth.uid())
    )
  )
  WITH CHECK (
    requester_id = requests.requester_id
  );

-- Steps
CREATE POLICY request_steps_select
  ON request_steps FOR SELECT
  TO authenticated
  USING (public.can_view_request(request_id));

CREATE POLICY request_steps_insert_admin_hr
  ON request_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_hr(auth.uid()) OR public.is_admin(auth.uid())
  );

CREATE POLICY request_steps_update_assignee
  ON request_steps FOR UPDATE
  TO authenticated
  USING (
    public.can_view_request(request_id) AND (
      assignee_id = auth.uid() OR public.is_hr(auth.uid()) OR public.is_admin(auth.uid())
    )
  )
  WITH CHECK (true);

-- Comments
CREATE POLICY request_comments_select
  ON request_comments FOR SELECT
  TO authenticated
  USING (
    public.can_view_request(request_id) AND (
      visibility = 'all' OR public.is_hr(auth.uid()) OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY request_comments_insert
  ON request_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND public.can_view_request(request_id) AND (
      visibility = 'all' OR public.is_hr(auth.uid()) OR public.is_admin(auth.uid())
    )
  );

-- Events (timeline)
CREATE POLICY request_events_select
  ON request_events FOR SELECT
  TO authenticated
  USING (public.can_view_request(request_id));

-- Attachments
CREATE POLICY request_attachments_select
  ON request_attachments FOR SELECT
  TO authenticated
  USING (public.can_view_request(request_id));

CREATE POLICY request_attachments_insert
  ON request_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND public.can_view_request(request_id)
  );
;
