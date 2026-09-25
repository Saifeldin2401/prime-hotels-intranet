-- Post-login landing = the workspace that answers the member's first question.
-- Previously training managers landed on /training (a redirect into the Learn
-- catalog) and knowledge managers on /knowledge (reader, not their Studio).
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.resolve_account_context'::regproc);
  d := replace(d, $x$v_dest := '/admin';$x$, $x$v_dest := '/admin/organization';$x$);
  d := replace(d, $x$ELSIF v_top_role IN ('training_manager','instructor') THEN
    v_dest := '/training';
  ELSIF v_top_role IN ('knowledge_manager','author') THEN
    v_dest := '/knowledge';$x$, $x$ELSIF v_top_role IN ('training_manager','department_manager') THEN
    v_dest := '/manage';
  ELSIF v_top_role IN ('knowledge_manager','author','instructor') THEN
    v_dest := '/studio';$x$);
  d := replace(d, $x$v_dest := '/home/learner';$x$, $x$v_dest := '/learn';$x$);
  IF position('/manage' in d) = 0 OR position($x$'/learn'$x$ in d) = 0 THEN
    RAISE EXCEPTION 'resolve_account_context rewrite did not apply';
  END IF;
  EXECUTE d;
END $$;
