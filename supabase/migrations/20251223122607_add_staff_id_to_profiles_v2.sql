ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS staff_id TEXT UNIQUE;

COMMENT ON COLUMN public.profiles.staff_id IS 'Human-readable unique employee identifier (e.g. PH-1001)';

CREATE INDEX IF NOT EXISTS profiles_staff_id_idx ON public.profiles(staff_id);;
