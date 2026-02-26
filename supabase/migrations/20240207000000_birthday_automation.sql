-- Migration to make date_of_birth required and add index for birthday feature
DO $$ 
BEGIN
    -- Backfill missing schema for older stacks before enforcing constraints.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE public.profiles
          ADD COLUMN date_of_birth DATE;
    END IF;

    -- Update any NULL values to a default before making NOT NULL
    UPDATE profiles SET date_of_birth = '1990-01-01' WHERE date_of_birth IS NULL;
    
    -- Make NOT NULL
    ALTER TABLE profiles ALTER COLUMN date_of_birth SET NOT NULL;
    
    -- Add index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_dob') THEN
        CREATE INDEX idx_profiles_dob ON profiles(date_of_birth);
    END IF;
END $$;
