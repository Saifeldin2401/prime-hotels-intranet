-- Migration: Create Password Management RPCs
-- Description: Implements RPCs used by the ChangePassword screen to prevent password reuse and update profile status.

-- Ensure pgcrypto for password comparison
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. RPC: check_password_reuse
-- Checks if a new plain-text password matches any of the user's last 5 password hashes.
CREATE OR REPLACE FUNCTION public.check_password_reuse(plain_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    is_reused boolean;
    current_uid uuid;
BEGIN
    current_uid := auth.uid();
    
    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Look through last 5 records in history for the current user
    SELECT EXISTS (
        SELECT 1
        FROM (
            SELECT password_hash
            FROM public.password_history
            WHERE user_id = current_uid
            ORDER BY created_at DESC
            LIMIT 5
        ) AS recent
        WHERE recent.password_hash = crypt(plain_password, recent.password_hash)
    ) INTO is_reused;

    RETURN COALESCE(is_reused, false);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_password_reuse(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_password_reuse(text) TO service_role;

-- 2. RPC: complete_password_reset
-- Finalizes the password reset flow by updating profile flags.
CREATE OR REPLACE FUNCTION public.complete_password_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid uuid;
BEGIN
    current_uid := auth.uid();

    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET 
        is_temp_password = false,
        password_initialized = true,
        force_password_reset = false,
        password_last_changed_at = now(),
        updated_at = now()
    WHERE id = current_uid;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_password_reset() TO service_role;

-- 3. Cleanup: Ensure password_history doesn't grow indefinitely
-- Adding a limit to the history via a trigger or just in the RPC is good.
-- We'll add a simple pruning logic to the existing save_password_history function if it exists,
-- or just do it in complete_password_reset.
-- Let's update complete_password_reset to also prune.

CREATE OR REPLACE FUNCTION public.complete_password_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_uid uuid;
BEGIN
    current_uid := auth.uid();

    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET 
        is_temp_password = false,
        password_initialized = true,
        force_password_reset = false,
        password_last_changed_at = now(),
        updated_at = now()
    WHERE id = current_uid;

    -- Prune history to keep only last 10 records
    DELETE FROM public.password_history
    WHERE id IN (
        SELECT id
        FROM public.password_history
        WHERE user_id = current_uid
        ORDER BY created_at DESC
        OFFSET 10
    );
END;
$$;
