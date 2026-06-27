-- Settings page persists the user's language preference to profiles.language,
-- but the column did not exist, so the save failed with PGRST204 and the
-- preference was never stored. Add it (EN/AR bilingual app).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
