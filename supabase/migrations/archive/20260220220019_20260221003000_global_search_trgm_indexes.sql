-- Performance hardening for global search surfaces used in app-level ILIKE queries.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- training_modules search
CREATE INDEX IF NOT EXISTS idx_training_modules_title_trgm
  ON public.training_modules USING gin (title extensions.gin_trgm_ops)
  WHERE COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_training_modules_description_trgm
  ON public.training_modules USING gin (description extensions.gin_trgm_ops)
  WHERE COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_training_modules_category_trgm
  ON public.training_modules USING gin (category extensions.gin_trgm_ops)
  WHERE COALESCE(is_deleted, false) = false;

-- announcements search
CREATE INDEX IF NOT EXISTS idx_announcements_title_trgm
  ON public.announcements USING gin (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_announcements_content_trgm
  ON public.announcements USING gin (content extensions.gin_trgm_ops);

-- staff/user search
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING gin (full_name extensions.gin_trgm_ops)
  WHERE COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON public.profiles USING gin (email extensions.gin_trgm_ops)
  WHERE COALESCE(is_deleted, false) = false;

COMMIT;

NOTIFY pgrst, 'reload schema';;
