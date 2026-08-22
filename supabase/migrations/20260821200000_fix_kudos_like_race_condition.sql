-- toggle_kudos_like: the unlike branch unconditionally decremented
-- likes_count after a DELETE with no check that a row was actually removed.
-- The like branch is protected by kudos_likes' UNIQUE(kudos_id, user_id)
-- constraint (a losing concurrent INSERT fails outright), but nothing
-- protected the unlike branch - two concurrent unlike calls from the same
-- user could both pass the initial EXISTS check, both attempt the DELETE,
-- and both decrement, double-subtracting for a single real unlike.
--
-- Fix: derive likes_count from an actual COUNT(*) on kudos_likes after the
-- write, rather than a manual +/-1. This is self-correcting and immune to
-- this whole class of race by construction, matching the audit's suggested
-- fix.
CREATE OR REPLACE FUNCTION public.toggle_kudos_like(kudos_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    already_liked BOOLEAN;
    v_count INTEGER;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM kudos_likes
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid()
    ) INTO already_liked;

    IF already_liked THEN
        DELETE FROM kudos_likes
        WHERE kudos_id = kudos_uuid AND user_id = auth.uid();

        SELECT count(*) INTO v_count FROM kudos_likes WHERE kudos_id = kudos_uuid;
        UPDATE kudos SET likes_count = v_count WHERE id = kudos_uuid;

        RETURN false;
    ELSE
        INSERT INTO kudos_likes (kudos_id, user_id)
        VALUES (kudos_uuid, auth.uid())
        ON CONFLICT (kudos_id, user_id) DO NOTHING;

        SELECT count(*) INTO v_count FROM kudos_likes WHERE kudos_id = kudos_uuid;
        UPDATE kudos SET likes_count = v_count WHERE id = kudos_uuid;

        RETURN true;
    END IF;
END;
$function$;
