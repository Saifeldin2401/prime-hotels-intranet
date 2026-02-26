-- Add department_id to announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Add department_id to training_modules table
ALTER TABLE training_modules 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Add department_id to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Add department_id to tasks table  
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_department_id ON announcements(department_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_department_id ON training_modules(department_id);
CREATE INDEX IF NOT EXISTS idx_shifts_department_id ON shifts(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON tasks(department_id);

-- Add comments for documentation
COMMENT ON COLUMN announcements.department_id IS 'Optional: Target announcement to specific department (null = all departments)';
COMMENT ON COLUMN training_modules.department_id IS 'Optional: Training module for specific department (null = all departments)';
COMMENT ON COLUMN shifts.department_id IS 'Department this shift belongs to';
COMMENT ON COLUMN tasks.department_id IS 'Department this task is assigned to';;
