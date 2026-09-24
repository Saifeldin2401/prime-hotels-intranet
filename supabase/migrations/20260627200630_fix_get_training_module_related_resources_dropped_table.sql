-- get_training_module_related_resources still queried the dropped
-- training_content_blocks table (consolidated into documents with
-- content_type='training_block', source_document_id -> linked_training_id),
-- so the RPC errored and the training player's "related resources" panel broke.
CREATE OR REPLACE FUNCTION public.get_training_module_related_resources(p_module_id uuid)
 RETURNS TABLE(resource_type text, resource_id uuid, title text, description text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 'document', d.id, d.title, d.description
      FROM documents d
      WHERE d.id IN (
        SELECT DISTINCT tb.linked_training_id
        FROM documents tb
        WHERE tb.content_type = 'training_block'
          AND tb.training_module_id = p_module_id
          AND tb.linked_training_id IS NOT NULL
      )
    UNION ALL
    SELECT 'quiz', lq.id, lq.title, lq.description
      FROM learning_quizzes lq WHERE lq.training_module_id = p_module_id
    UNION ALL
    SELECT 'question', kq.id, kq.question_text, kq.explanation
      FROM knowledge_questions kq WHERE kq.training_module_id = p_module_id;
END;
$function$;
