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
