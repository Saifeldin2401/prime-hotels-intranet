-- SEC-08 (continued): get_comment_replies and get_document_comments_thread were SECURITY
-- DEFINER with no document-visibility check of their own, bypassing document_comments' RLS
-- entirely - any authenticated caller could read comment threads (content + author) for any
-- document_id/parent_id regardless of whether they could see the underlying document. Neither
-- has a frontend caller today, but both are directly reachable via PostgREST RPC.
--
-- document_comments already has correct RLS (document_comments_select requires the caller be
-- able to see the parent document). Switching these two functions to SECURITY INVOKER makes
-- them respect that policy automatically instead of duplicating its logic - the clean fix here,
-- not a hand-rolled reimplementation that could drift from the real policy.
CREATE OR REPLACE FUNCTION public.get_comment_replies(p_parent_id uuid)
 RETURNS TABLE(id uuid, document_id uuid, parent_id uuid, user_id uuid, user_name text, user_avatar text, content text, is_resolved boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.created_at,
        c.updated_at
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.parent_id = p_parent_id
    ORDER BY c.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_document_comments_thread(p_document_id uuid)
 RETURNS TABLE(id uuid, document_id uuid, parent_id uuid, user_id uuid, user_name text, user_avatar text, content text, is_resolved boolean, is_pinned boolean, created_at timestamp with time zone, updated_at timestamp with time zone, reply_count bigint)
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.parent_id,
        c.user_id,
        p.full_name AS user_name,
        p.avatar_url AS user_avatar,
        c.content,
        c.is_resolved,
        c.is_pinned,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM document_comments replies WHERE replies.parent_id = c.id) AS reply_count
    FROM document_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.document_id = p_document_id
    AND c.parent_id IS NULL
    ORDER BY
        c.is_pinned DESC,
        c.created_at DESC;
END;
$function$;
