-- Create maintenance tickets table with proper enums, columns, and RLS policies

-- Create enum types
CREATE TYPE maintenance_ticket_status AS ENUM ('open', 'in_progress', 'pending_parts', 'completed', 'cancelled');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent', 'critical');
CREATE TYPE maintenance_category AS ENUM ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'cosmetic', 'safety', 'other');

-- Create maintenance_tickets table
CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category maintenance_category NOT NULL,
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  status maintenance_ticket_status NOT NULL DEFAULT 'open',
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  room_number TEXT,
  reported_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estimated_completion_date DATE,
  actual_completion_date DATE,
  parts_needed TEXT,
  labor_hours DECIMAL(5,2),
  material_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at),
  CHECK (estimated_completion_date IS NULL OR estimated_completion_date >= created_at::date),
  CHECK (labor_hours IS NULL OR labor_hours >= 0),
  CHECK (material_cost IS NULL OR material_cost >= 0)
);

-- Create maintenance_comments table for ticket updates
CREATE TABLE maintenance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  internal_only BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create maintenance_attachments table for photos and documents
CREATE TABLE maintenance_attachments (
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

-- Enable Row Level Security
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_tickets
-- Users can see tickets for their property
CREATE POLICY "Users can view property maintenance tickets" ON maintenance_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() 
      AND property_id = maintenance_tickets.property_id
    )
  );

-- Users can create tickets for their property
CREATE POLICY "Users can create maintenance tickets" ON maintenance_tickets
  FOR INSERT WITH CHECK (
    auth.uid() = reported_by_id AND
    EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() 
      AND property_id = maintenance_tickets.property_id
    )
  );

-- Users can update their own reported tickets (limited fields)
CREATE POLICY "Users can update own reported tickets" ON maintenance_tickets
  FOR UPDATE USING (
    auth.uid() = reported_by_id AND
    status IN ('open', 'in_progress')
  );

-- Maintenance staff can view all tickets for their assigned properties
CREATE POLICY "Maintenance staff can view assigned property tickets" ON maintenance_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_properties 
      WHERE user_id = auth.uid() 
      AND property_id = maintenance_tickets.property_id
    ) AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('property_manager', 'department_head')
    )
  );

-- Maintenance staff can update tickets
CREATE POLICY "Maintenance staff can update tickets" ON maintenance_tickets
  FOR UPDATE USING (
    auth.uid() = assigned_to_id OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('property_manager', 'department_head')
    )
  );

-- Regional admins can view all tickets
CREATE POLICY "Regional admins can view all maintenance tickets" ON maintenance_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('regional_admin', 'regional_hr')
    )
  );

-- Regional admins can do everything
CREATE POLICY "Regional admins full access to maintenance tickets" ON maintenance_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('regional_admin')
    )
  );

-- RLS Policies for maintenance_comments
-- Users can view comments on tickets they can see
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

-- Users can create comments on tickets they can see
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

-- RLS Policies for maintenance_attachments
-- Similar to comments policies
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

-- Users can upload attachments to tickets they can see
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

-- Create indexes for performance
CREATE INDEX idx_maintenance_tickets_property_id ON maintenance_tickets(property_id);
CREATE INDEX idx_maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX idx_maintenance_tickets_priority ON maintenance_tickets(priority);
CREATE INDEX idx_maintenance_tickets_category ON maintenance_tickets(category);
CREATE INDEX idx_maintenance_tickets_assigned_to ON maintenance_tickets(assigned_to_id);
CREATE INDEX idx_maintenance_tickets_created_at ON maintenance_tickets(created_at);

CREATE INDEX idx_maintenance_comments_ticket_id ON maintenance_comments(ticket_id);
CREATE INDEX idx_maintenance_comments_created_at ON maintenance_comments(created_at);

CREATE INDEX idx_maintenance_attachments_ticket_id ON maintenance_attachments(ticket_id);

-- Create trigger for updated_at timestamp
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
$$ language plpgsql;

CREATE TRIGGER update_maintenance_tickets_updated_at_trigger
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_tickets_updated_at();
