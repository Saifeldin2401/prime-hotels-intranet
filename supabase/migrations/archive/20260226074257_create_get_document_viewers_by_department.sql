
-- Create RPC function to aggregate document viewers by department
-- Used by the Document Analytics dashboard
CREATE OR REPLACE FUNCTION public.get_document_viewers_by_department(p_document_id uuid)
RETURNS TABLE (department_name text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(d.name, 'Unknown') AS department_name,
    COUNT(DISTINCT dv.user_id) AS count
  FROM document_views dv
  LEFT JOIN user_departments ud ON ud.user_id = dv.user_id
  LEFT JOIN departments d ON d.id = ud.department_id
  WHERE dv.document_id = p_document_id
  GROUP BY d.name
  ORDER BY count DESC
  LIMIT 20;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_document_viewers_by_department(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_document_viewers_by_department(uuid) IS
  'Aggregates unique document viewers by their department. Used in the document analytics card.';
;
