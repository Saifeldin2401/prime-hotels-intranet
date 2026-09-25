-- The lessons write policies call _can_edit_training_module(), which was not
-- executable by `authenticated`, so every lesson write failed with 42501 -
-- including for course editors. The helper only answers "may the current user
-- edit this course?" (org-scoped, auth.uid()-based), so exposing it is safe.
GRANT EXECUTE ON FUNCTION public._can_edit_training_module(uuid) TO authenticated;
