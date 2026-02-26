ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_temp_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_initialized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_last_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);;
