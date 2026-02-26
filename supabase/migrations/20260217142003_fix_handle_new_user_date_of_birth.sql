-- Ensure profile bootstrap works with NOT NULL profiles.date_of_birth.
-- Uses metadata date_of_birth when present, otherwise falls back to CURRENT_DATE.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_date_of_birth date;
BEGIN
  IF NEW.raw_user_meta_data ? 'date_of_birth'
     AND COALESCE(NEW.raw_user_meta_data->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::date;
  ELSE
    v_date_of_birth := CURRENT_DATE;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_date_of_birth
  );

  RETURN NEW;
END;
$function$;;
