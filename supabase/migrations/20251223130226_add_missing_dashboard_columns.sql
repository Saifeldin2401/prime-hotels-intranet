-- Add status column to learning_assignments if missing
ALTER TABLE public.learning_assignments
ADD COLUMN IF NOT EXISTS status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue'));

-- Add date_of_birth column to profiles if missing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Create index for birthday queries
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON public.profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;;
