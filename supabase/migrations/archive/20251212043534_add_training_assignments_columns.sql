-- Add missing columns that frontend expects
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS assigned_by_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_to UUID; -- Alias for backward compatibility

-- Add completed_at if it doesn't exist
ALTER TABLE training_assignments
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Copy assigned_by to assigned_by_user_id for consistency
UPDATE training_assignments 
SET assigned_by_user_id = assigned_by 
WHERE assigned_by_user_id IS NULL AND assigned_by IS NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_by_user_id ON training_assignments(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_assigned_to_user_id ON training_assignments(assigned_to_user_id);;
