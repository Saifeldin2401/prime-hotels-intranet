-- Add created_by_id as an alias for created_by for backward compatibility
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES profiles(id);

-- Copy data from created_by to created_by_id if it doesn't already exist
UPDATE announcements 
SET created_by_id = created_by 
WHERE created_by_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_created_by_id ON announcements(created_by_id);;
