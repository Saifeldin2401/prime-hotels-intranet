-- Announcement priority enum
CREATE TYPE announcement_priority AS ENUM (
  'normal',
  'important',
  'critical'
);

-- Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  pinned BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcement targets table
CREATE TABLE announcement_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  target_properties UUID[],
  target_departments UUID[],
  target_roles app_role[],
  UNIQUE(announcement_id)
);

-- Announcement attachments table
CREATE TABLE announcement_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcement reads table
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Triggers
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements: Users see announcements that match their properties/departments/roles
CREATE POLICY "announcements_select_by_target"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    -- Not expired
    (expires_at IS NULL OR expires_at > now()) AND
    -- Scheduled or already published
    (scheduled_at IS NULL OR scheduled_at <= now()) AND
    (
      -- Regional admins see all
      public.has_role(auth.uid(), 'regional_admin') OR
      -- Check if user matches any target criteria
      EXISTS (
        SELECT 1 FROM announcement_targets at
        WHERE at.announcement_id = announcements.id
        AND (
          -- No targets means all users
          (at.target_properties IS NULL AND at.target_departments IS NULL AND at.target_roles IS NULL) OR
          -- User's properties match
          (at.target_properties IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_properties up
            WHERE up.user_id = auth.uid() AND up.property_id = ANY(at.target_properties)
          )) OR
          -- User's departments match
          (at.target_departments IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_departments ud
            WHERE ud.user_id = auth.uid() AND ud.department_id = ANY(at.target_departments)
          )) OR
          -- User's roles match
          (at.target_roles IS NOT NULL AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = ANY(at.target_roles)
          ))
        )
      )
    )
  );

-- Announcements: Only admins, regional HR, and property managers can create
CREATE POLICY "announcements_insert_admin_hr_pm"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'regional_hr') OR
    public.has_role(auth.uid(), 'property_manager')
  );

-- Announcement targets: Same visibility as announcements
CREATE POLICY "announcement_targets_select"
  ON announcement_targets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_targets.announcement_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        (a.expires_at IS NULL OR a.expires_at > now())
      )
    )
  );

-- Announcement reads: Users can view their own reads
CREATE POLICY "announcement_reads_select"
  ON announcement_reads FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'property_manager')
  );

