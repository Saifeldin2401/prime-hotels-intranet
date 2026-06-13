-- Update existing profiles that have NULL date_of_birth to a safe default
-- This ensures the NOT NULL constraint doesn't fail for existing data
UPDATE public.profiles 
SET date_of_birth = '1990-01-01' 
WHERE date_of_birth IS NULL;

-- Make date_of_birth NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN date_of_birth SET NOT NULL;

-- Add index to date_of_birth if not exists for better performance on birthday queries
CREATE INDEX IF NOT EXISTS idx_profiles_dob ON public.profiles(date_of_birth);
;
