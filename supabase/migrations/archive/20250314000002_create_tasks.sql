-- Create task status enum
CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'review',
  'completed',
  'cancelled'
);

-- Create task priority enum
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  
  -- Assignment
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Organization
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Dates
  due_date DATE,
  start_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  tags TEXT[],
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date),
  CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  CHECK (actual_hours IS NULL OR actual_hours >= 0)
);

-- Task comments table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task attachments table
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task watchers (users following a task)
CREATE TABLE task_watchers (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by_id);
CREATE INDEX idx_tasks_property ON tasks(property_id);
CREATE INDEX idx_tasks_department ON tasks(department_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_author ON task_comments(author_id);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX idx_task_watchers_user ON task_watchers(user_id);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
-- Users can view tasks they created, are assigned to, or are watching
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT USING (
    auth.uid() = created_by_id OR
    auth.uid() = assigned_to_id OR
    EXISTS (
      SELECT 1 FROM task_watchers 
      WHERE task_id = tasks.id AND user_id = auth.uid()
    ) OR
    -- Managers can see all tasks in their property
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('regional_admin', 'property_manager', 'department_head')
    )
  );

-- Users can create tasks
CREATE POLICY "tasks_insert_policy" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by_id
  );

-- Users can update tasks they created or are assigned to
CREATE POLICY "tasks_update_policy" ON tasks
  FOR UPDATE USING (
    auth.uid() = created_by_id OR
    auth.uid() = assigned_to_id OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('regional_admin', 'property_manager', 'department_head')
    )
  );

-- Users can delete tasks they created (or admins)
CREATE POLICY "tasks_delete_policy" ON tasks
  FOR DELETE USING (
    auth.uid() = created_by_id OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('regional_admin', 'property_manager')
    )
  );

-- RLS Policies for task_comments
CREATE POLICY "task_comments_select_policy" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (
        auth.uid() = tasks.created_by_id OR
        auth.uid() = tasks.assigned_to_id OR
        EXISTS (
          SELECT 1 FROM task_watchers 
          WHERE task_id = tasks.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "task_comments_insert_policy" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id
    )
  );

-- RLS Policies for task_attachments (similar to comments)
CREATE POLICY "task_attachments_select_policy" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_attachments.task_id 
      AND (
        auth.uid() = tasks.created_by_id OR
        auth.uid() = tasks.assigned_to_id OR
        EXISTS (
          SELECT 1 FROM task_watchers 
          WHERE task_id = tasks.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "task_attachments_insert_policy" ON task_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by_id
  );

-- RLS Policies for task_watchers
CREATE POLICY "task_watchers_select_policy" ON task_watchers
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_watchers.task_id 
      AND auth.uid() = tasks.created_by_id
    )
  );

CREATE POLICY "task_watchers_insert_policy" ON task_watchers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "task_watchers_delete_policy" ON task_watchers
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Auto-set completed_at when status changes to completed
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Clear completed_at if status changes from completed
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

CREATE TRIGGER update_task_comments_updated_at_trigger
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get task statistics
CREATE OR REPLACE FUNCTION get_task_stats(user_id_param UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  todo_tasks BIGINT,
  in_progress_tasks BIGINT,
  review_tasks BIGINT,
  completed_tasks BIGINT,
  overdue_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'todo')::BIGINT AS todo_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT AS in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'review')::BIGINT AS review_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed_tasks,
    COUNT(*) FILTER (WHERE status != 'completed' AND status != 'cancelled' AND due_date < CURRENT_DATE)::BIGINT AS overdue_tasks
  FROM tasks
  WHERE assigned_to_id = user_id_param OR created_by_id = user_id_param;
END;
$$ LANGUAGE plpgsql STABLE;
