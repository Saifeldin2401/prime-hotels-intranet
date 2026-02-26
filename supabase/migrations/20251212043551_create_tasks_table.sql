-- Create tasks table for task management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES profiles(id),
  assigned_to_id UUID REFERENCES profiles(id), -- Alias for compatibility
  assigned_by UUID REFERENCES profiles(id),
  created_by_id UUID REFERENCES profiles(id),
  department_id UUID REFERENCES departments(id),
  property_id UUID REFERENCES properties(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);

-- Create RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks assigned to them
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT
    USING (
        assigned_to = auth.uid() OR 
        assigned_to_id = auth.uid() OR
        created_by_id = auth.uid()
    );

-- Admins and managers can view all tasks
CREATE POLICY "Admins and managers can view all tasks" ON tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Users can create tasks
CREATE POLICY "Authenticated users can create tasks" ON tasks
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update their tasks" ON tasks
    FOR UPDATE
    USING (
        assigned_to = auth.uid() OR 
        assigned_to_id = auth.uid() OR
        created_by_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager', 'property_hr', 'department_head')
        )
    );

-- Only admins and task creators can delete tasks
CREATE POLICY "Task creators and admins can delete tasks" ON tasks
    FOR DELETE
    USING (
        created_by_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('regional_admin', 'regional_hr', 'property_manager')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();;
