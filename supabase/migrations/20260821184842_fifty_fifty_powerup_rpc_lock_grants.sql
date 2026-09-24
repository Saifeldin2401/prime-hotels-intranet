-- New functions default to PUBLIC EXECUTE in Postgres; every sibling quiz RPC
-- in this schema (get_quiz_for_player, grade_question_attempt,
-- submit_quiz_attempt) is authenticated-only with no PUBLIC/anon grant.
-- Match that posture for get_fifty_fifty_eliminations.
REVOKE EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_fifty_fifty_eliminations(uuid) TO authenticated;
