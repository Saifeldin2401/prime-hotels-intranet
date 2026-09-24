-- Migration: Make date_of_birth optional on profiles
-- Reason: Training platform does not require date of birth at user creation time.
--         The field is kept in the schema for HR records but must not block inserts/updates.
--
-- Previously: NOT NULL (caused create-user and update-profile to fail when field is absent)
-- After:      NULL allowed (default NULL)

ALTER TABLE public.profiles
  ALTER COLUMN date_of_birth DROP NOT NULL;
