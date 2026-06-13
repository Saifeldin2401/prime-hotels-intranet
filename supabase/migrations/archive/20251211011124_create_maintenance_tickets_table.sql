CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT,
  location TEXT,
  reported_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view maintenance tickets for their property" ON maintenance_tickets
  FOR SELECT USING (
    property_id IN (
      SELECT property_id FROM user_properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create maintenance tickets" ON maintenance_tickets
  FOR INSERT WITH CHECK (
    reported_by = auth.uid() AND
    property_id IN (
      SELECT property_id FROM user_properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tickets" ON maintenance_tickets
  FOR UPDATE USING (
    reported_by = auth.uid() OR
    assigned_to = auth.uid()
  );;
