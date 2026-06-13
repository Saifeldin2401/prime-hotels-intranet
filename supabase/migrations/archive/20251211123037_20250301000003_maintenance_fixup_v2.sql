-- Fixup migration for maintenance schema: comments, attachments, RLS, trigger

-- 1) Ensure comments and attachments tables exist
CREATE TABLE IF NOT EXISTS maintenance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  internal_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  uploaded_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Ensure RLS is enabled
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies for comments (assume they do not yet exist in this project)
CREATE POLICY "Users can view maintenance comments" ON maintenance_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = maintenance_comments.ticket_id
      AND (
        (EXISTS (
          SELECT 1 FROM user_properties 
          WHERE user_id = auth.uid() 
          AND property_id = mt.property_id
        )) OR
        (EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'department_head')
        ))
      )
    )
  );

CREATE POLICY "Users can create maintenance comments" ON maintenance_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = maintenance_comments.ticket_id
      AND (
        (EXISTS (
          SELECT 1 FROM user_properties 
          WHERE user_id = auth.uid() 
          AND property_id = mt.property_id
        )) OR
        (EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'department_head')
        ))
      )
    )
  );

-- 4) RLS policies for attachments
CREATE POLICY "Users can view maintenance attachments" ON maintenance_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = maintenance_attachments.ticket_id
      AND (
        (EXISTS (
          SELECT 1 FROM user_properties 
          WHERE user_id = auth.uid() 
          AND property_id = mt.property_id
        )) OR
        (EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'department_head')
        ))
      )
    )
  );

CREATE POLICY "Users can upload maintenance attachments" ON maintenance_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by_id AND
    EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = maintenance_attachments.ticket_id
      AND (
        (EXISTS (
          SELECT 1 FROM user_properties 
          WHERE user_id = auth.uid() 
          AND property_id = mt.property_id
        )) OR
        (EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'department_head')
        ))
      )
    )
  );

-- 5) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_ticket_id ON maintenance_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_comments_created_at ON maintenance_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_attachments_ticket_id ON maintenance_attachments(ticket_id);

-- 6) Ensure updated_at trigger on maintenance_tickets exists
CREATE OR REPLACE FUNCTION update_maintenance_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-set completed_at when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = now();
    NEW.actual_completion_date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_maintenance_tickets_updated_at_trigger ON maintenance_tickets;

CREATE TRIGGER update_maintenance_tickets_updated_at_trigger
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_tickets_updated_at();;
