CREATE OR REPLACE FUNCTION public.get_questions_for_attempt(p_question_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'question_text_ar', q.question_text_ar,
      'question_type', q.question_type,
      'difficulty', q.difficulty,
      'points', q.points,
      'estimated_time_seconds', q.estimated_time_seconds,
      'tags', q.tags,
      'hint', q.hint,
      'hint_ar', q.hint_ar,
      'linked_sop_id', q.linked_sop_id,
      'linked_sop', (
        SELECT jsonb_build_object('id', d.id, 'title', d.title)
        FROM public.documents d
        WHERE d.id = q.linked_sop_id
      ),
      'options', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', o.id,
            'option_text', o.option_text,
            'option_text_ar', o.option_text_ar,
            'display_order', o.display_order
          ) ORDER BY o.display_order
        )
        FROM public.unified_question_options o
        WHERE o.question_id = q.id
      )
    )
  ) INTO v_result
  FROM public.unified_questions q
  WHERE q.id = ANY(p_question_ids) AND q.status = 'published';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
