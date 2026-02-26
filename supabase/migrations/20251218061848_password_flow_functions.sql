-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Trigger to save password history on change (Try auth trigger)
CREATE OR REPLACE FUNCTION public.save_password_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only if password changed
  IF NEW.encrypted_password <> OLD.encrypted_password THEN
    INSERT INTO public.password_history (user_id, password_hash)
    VALUES (NEW.id, NEW.encrypted_password);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid dupes/errors
DROP TRIGGER IF EXISTS on_password_change ON auth.users;

-- Create Trigger
CREATE TRIGGER on_password_change
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.save_password_history();

-- 2. RPC to check reuse
CREATE OR REPLACE FUNCTION public.check_password_reuse(plain_password text)
RETURNS boolean AS $$
DECLARE
  history_record RECORD;
BEGIN
  -- Iterate last 5 passwords
  FOR history_record IN 
    SELECT password_hash FROM public.password_history 
    WHERE user_id = auth.uid() 
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    -- Compare using pgcrypto
    IF (history_record.password_hash = crypt(plain_password, history_record.password_hash)) THEN
        RETURN TRUE; -- Reused
    END IF;
  END LOOP;

  RETURN FALSE; -- Not reused
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC to finalize reset
CREATE OR REPLACE FUNCTION public.complete_password_reset()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    is_temp_password = FALSE,
    password_initialized = TRUE,
    password_last_changed_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
