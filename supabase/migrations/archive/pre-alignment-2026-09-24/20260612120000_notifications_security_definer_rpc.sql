-- Migration: notifications_security_definer_rpc
-- Replaces direct INSERT into notifications with a SECURITY DEFINER RPC so that
-- authenticated users can create notifications for other users without needing a
-- permissive INSERT policy.

-- Step 1: Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id              uuid,
  p_type                 text,
  p_title                text,
  p_body                 text,
  p_metadata             jsonb    DEFAULT NULL,
  p_action_url           text     DEFAULT NULL,
  p_related_entity_type  text     DEFAULT NULL,
  p_related_entity_id    uuid     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata,
    entity_type,
    entity_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_action_url,
    COALESCE(p_metadata, '{}'::jsonb),
    p_related_entity_type,
    p_related_entity_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Step 2: Restrict EXECUTE to authenticated role only
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, text, uuid) TO authenticated;

-- Step 3: The INSERT RLS policy "Users can insert own notifications" already has
-- WITH CHECK (user_id = auth.uid()), which correctly blocks direct cross-user forgery.
-- No policy change required; the RPC is the blessed insertion path for all call sites.
