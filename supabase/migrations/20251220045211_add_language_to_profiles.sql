-- Add language column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar'));;
