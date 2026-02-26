ALTER TABLE training_assignments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'expired')),
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;;
