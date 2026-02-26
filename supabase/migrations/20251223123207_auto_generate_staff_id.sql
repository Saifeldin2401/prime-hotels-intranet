-- Create a sequence for staff IDs
CREATE SEQUENCE IF NOT EXISTS staff_id_seq START 1001;

-- Function to generate staff_id automatically
CREATE OR REPLACE FUNCTION generate_staff_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if staff_id is not already set
  IF NEW.staff_id IS NULL THEN
    NEW.staff_id := 'PH-' || LPAD(nextval('staff_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS auto_staff_id ON profiles;
CREATE TRIGGER auto_staff_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_id();

-- Backfill existing profiles that don't have a staff_id
-- First, set the sequence to start after the count of existing profiles
DO $$
DECLARE
  max_count INT;
BEGIN
  SELECT COUNT(*) INTO max_count FROM profiles WHERE staff_id IS NULL;
  IF max_count > 0 THEN
    -- Reset sequence to account for backfill
    PERFORM setval('staff_id_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(staff_id FROM 4) AS INT)), 1000) FROM profiles WHERE staff_id IS NOT NULL) + 1, false);
  END IF;
END $$;

-- Now backfill
UPDATE profiles 
SET staff_id = 'PH-' || LPAD(nextval('staff_id_seq')::TEXT, 4, '0')
WHERE staff_id IS NULL;;
