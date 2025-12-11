-- SOP Database Functions and Procedures

-- Function to get SOP summary statistics for dashboard
CREATE OR REPLACE FUNCTION get_sop_summary_stats()
RETURNS TABLE(
  total_documents BIGINT,
  draft_count BIGINT,
  under_review_count BIGINT,
  approved_count BIGINT,
  obsolete_count BIGINT,
  pending_approvals BIGINT,
  overdue_reviews BIGINT,
  recent_updates BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
    COUNT(*) FILTER (WHERE status = 'under_review') as under_review_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'obsolete') as obsolete_count,
    (
      SELECT COUNT(*)
      FROM sop_document_approvals sda
      JOIN sop_documents sd ON sda.document_id = sd.id
      WHERE sda.status = 'pending' 
        AND sd.status = 'under_review'
    ) as pending_approvals,
    (
      SELECT COUNT(*)
      FROM sop_documents
      WHERE status = 'approved' 
        AND next_review_date IS NOT NULL 
        AND next_review_date < CURRENT_DATE
    ) as overdue_reviews,
    (
      SELECT COUNT(*)
      FROM sop_documents
      WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
    ) as recent_updates
  FROM sop_documents
  WHERE archived_at IS NULL;
END;
$$;

-- Function to create a new SOP document
CREATE OR REPLACE FUNCTION create_sop_document(
  p_title TEXT,
  p_title_ar TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_ar TEXT DEFAULT NULL,
  p_department_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_content JSONB DEFAULT '{}',
  p_status TEXT DEFAULT 'draft',
  p_is_template BOOLEAN DEFAULT FALSE,
  p_template_id UUID DEFAULT NULL,
  p_created_by UUID
)
RETURNS TABLE(
  id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document_id UUID;
  v_version_number INTEGER := 1;
  v_code TEXT;
BEGIN
  -- Generate document code
  SELECT 'SOP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
         LPAD((COALESCE(MAX(CAST(SUBSTRING(code FROM '\d+$') AS INTEGER)), 0) + 1)::TEXT, 4, '0')
  INTO v_code
  FROM sop_documents
  WHERE code LIKE 'SOP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%';
  
  -- Insert document
  INSERT INTO sop_documents (
    title,
    title_ar,
    description,
    description_ar,
    code,
    department_id,
    category_id,
    subcategory_id,
    status,
    is_template,
    template_id,
    created_by,
    version
  ) VALUES (
    p_title,
    p_title_ar,
    p_description,
    p_description_ar,
    v_code,
    p_department_id,
    p_category_id,
    p_subcategory_id,
    p_status,
    p_is_template,
    p_template_id,
    p_created_by,
    v_version_number
  ) RETURNING id INTO v_document_id;
  
  -- Create initial version
  INSERT INTO sop_document_versions (
    document_id,
    version_number,
    content,
    created_by,
    change_summary
  ) VALUES (
    v_document_id,
    v_version_number,
    p_content,
    p_created_by,
    'Initial version'
  );
  
  -- If not a template, create approval workflow
  IF NOT p_is_template THEN
    INSERT INTO sop_document_approvals (
      document_id,
      approver_id,
      approver_role,
      status,
      created_by
    )
    SELECT 
      v_document_id,
      u.id,
      'department_head',
      CASE 
        WHEN p_status = 'under_review' THEN 'pending'
        ELSE 'approved'
      END,
      p_created_by
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role = 'department_head' 
      AND ur.department_id = p_department_id
      LIMIT 1;
  END IF;
  
  RETURN QUERY SELECT v_document_id, TRUE, 'Document created successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$$;

-- Function to update SOP document
CREATE OR REPLACE FUNCTION update_sop_document(
  p_document_id UUID,
  p_title TEXT DEFAULT NULL,
  p_title_ar TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_ar TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_subcategory_id UUID DEFAULT NULL,
  p_content JSONB DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL,
  p_updated_by UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_new_version BOOLEAN := FALSE;
  v_version_number INTEGER;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM sop_documents
  WHERE id = p_document_id;
  
  -- Check if we need a new version
  IF p_content IS NOT NULL THEN
    v_new_version := TRUE;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_version_number
    FROM sop_document_versions
    WHERE document_id = p_document_id;
    
    -- Insert new version
    INSERT INTO sop_document_versions (
      document_id,
      version_number,
      content,
      created_by,
      change_summary
    ) VALUES (
      p_document_id,
      v_version_number,
      p_content,
      p_updated_by,
      COALESCE(p_change_summary, 'Content updated')
    );
  END IF;
  
  -- Update document
  UPDATE sop_documents
  SET 
    title = COALESCE(p_title, title),
    title_ar = COALESCE(p_title_ar, title_ar),
    description = COALESCE(p_description, description),
    description_ar = COALESCE(p_description_ar, description_ar),
    department_id = COALESCE(p_department_id, department_id),
    category_id = COALESCE(p_category_id, category_id),
    subcategory_id = COALESCE(p_subcategory_id, subcategory_id),
    status = COALESCE(p_status, status),
    version = CASE WHEN v_new_version THEN v_version_number ELSE version END,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = p_updated_by
  WHERE id = p_document_id;
  
  -- If status changed to under_review, create approval workflow
  IF p_status = 'under_review' AND v_current_status != 'under_review' THEN
    INSERT INTO sop_document_approvals (
      document_id,
      approver_id,
      approver_role,
      status,
      created_by
    )
    SELECT 
      p_document_id,
      u.id,
      'department_head',
      'pending',
      p_updated_by
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    WHERE ur.role = 'department_head' 
      AND ur.department_id = COALESCE(p_department_id, (SELECT department_id FROM sop_documents WHERE id = p_document_id))
      LIMIT 1
    ON CONFLICT (document_id, approver_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Document updated successfully';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;

-- Function to approve document
CREATE OR REPLACE FUNCTION approve_sop_document(
  p_document_id UUID,
  p_approver_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  next_step TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_document RECORD;
  v_approval_count INTEGER;
  v_total_required INTEGER;
BEGIN
  -- Get document info
  SELECT * INTO v_document
  FROM sop_documents
  WHERE id = p_document_id;
  
  -- Update approval status
  UPDATE sop_document_approvals
  SET 
    status = 'approved',
    approved_at = CURRENT_TIMESTAMP,
    comment = p_comment
  WHERE document_id = p_document_id 
    AND approver_id = p_approver_id 
    AND status = 'pending';
  
  -- Check if all approvals are complete
  SELECT 
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*)
  INTO v_approval_count, v_total_required
  FROM sop_document_approvals
  WHERE document_id = p_document_id;
  
  -- If all approvals are done, update document status
  IF v_approval_count = v_total_required THEN
    UPDATE sop_documents
    SET 
      status = 'approved',
      approved_at = CURRENT_TIMESTAMP,
      next_review_date = CURRENT_DATE + INTERVAL '1 year'
    WHERE id = p_document_id;
    
    RETURN QUERY SELECT TRUE, 'Document approved', 'Document is now approved and published';
  ELSE
    RETURN QUERY SELECT TRUE, 'Approval recorded', 'Waiting for remaining approvals';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM, NULL;
END;
$$;

-- Function to reject document
CREATE OR REPLACE FUNCTION reject_sop_document(
  p_document_id UUID,
  p_approver_id UUID,
  p_comment TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update approval status
  UPDATE sop_document_approvals
  SET 
    status = 'rejected',
    rejected_at = CURRENT_TIMESTAMP,
    comment = p_comment
  WHERE document_id = p_document_id 
    AND approver_id = p_approver_id 
    AND status = 'pending';
  
  -- Update document status back to draft
  UPDATE sop_documents
  SET status = 'draft'
  WHERE id = p_document_id;
  
  RETURN QUERY SELECT TRUE, 'Document rejected and returned to draft';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;

-- Function to search SOP documents
CREATE OR REPLACE FUNCTION search_sop_documents(
  p_query TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_is_template BOOLEAN DEFAULT NULL,
  p_page_size INTEGER DEFAULT 20,
  p_page_number INTEGER DEFAULT 1,
  p_sort_by TEXT DEFAULT 'updated_at',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  code TEXT,
  status TEXT,
  department_id UUID,
  department_name TEXT,
  category_id UUID,
  category_name TEXT,
  subcategory_id UUID,
  subcategory_name TEXT,
  version INTEGER,
  is_template BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  v_offset := (p_page_number - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE 
    sd.archived_at IS NULL
    AND (p_query IS NULL OR 
         (sd.title ILIKE '%' || p_query || '%' OR 
          sd.description ILIKE '%' || p_query || '%' OR
          sd.code ILIKE '%' || p_query || '%'))
    AND (p_department_id IS NULL OR sd.department_id = p_department_id)
    AND (p_category_id IS NULL OR sd.category_id = p_category_id)
    AND (p_status IS NULL OR sd.status = p_status)
    AND (p_is_template IS NULL OR sd.is_template = p_is_template);
  
  -- Return paginated results
  RETURN QUERY
  SELECT 
    sd.id,
    sd.title,
    sd.title_ar,
    sd.description,
    sd.description_ar,
    sd.code,
    sd.status,
    sd.department_id,
    d.name as department_name,
    sd.category_id,
    c.name as category_name,
    sd.subcategory_id,
    sc.name as subcategory_name,
    sd.version,
    sd.is_template,
    sd.created_at,
    sd.updated_at,
    sd.created_by,
    sd.updated_by,
    v_total_count
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE 
    sd.archived_at IS NULL
    AND (p_query IS NULL OR 
         (sd.title ILIKE '%' || p_query || '%' OR 
          sd.description ILIKE '%' || p_query || '%' OR
          sd.code ILIKE '%' || p_query || '%'))
    AND (p_department_id IS NULL OR sd.department_id = p_department_id)
    AND (p_category_id IS NULL OR sd.category_id = p_category_id)
    AND (p_status IS NULL OR sd.status = p_status)
    AND (p_is_template IS NULL OR sd.is_template = p_is_template)
  ORDER BY 
    CASE 
      WHEN p_sort_by = 'title' AND p_sort_order = 'asc' THEN sd.title
      WHEN p_sort_by = 'title' AND p_sort_order = 'desc' THEN sd.title
      WHEN p_sort_by = 'code' AND p_sort_order = 'asc' THEN sd.code
      WHEN p_sort_by = 'code' AND p_sort_order = 'desc' THEN sd.code
      WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN sd.status
      WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN sd.status
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN sd.created_at
      ELSE sd.updated_at
    END
    CASE 
      WHEN p_sort_order = 'desc' THEN NULL
      ELSE sd.updated_at
    END DESC,
    CASE 
      WHEN p_sort_order = 'asc' THEN NULL
      ELSE sd.updated_at
    END ASC
  LIMIT p_page_size OFFSET v_offset;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Function to get document with full details
CREATE OR REPLACE FUNCTION get_sop_document_details(p_document_id UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  code TEXT,
  status TEXT,
  department_id UUID,
  department_name TEXT,
  category_id UUID,
  category_name TEXT,
  subcategory_id UUID,
  subcategory_name TEXT,
  version INTEGER,
  is_template BOOLEAN,
  template_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  next_review_date DATE,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  current_version JSONB,
  approvals JSONB,
  attachments JSONB,
  related_documents JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.id,
    sd.title,
    sd.title_ar,
    sd.description,
    sd.description_ar,
    sd.code,
    sd.status,
    sd.department_id,
    d.name as department_name,
    sd.category_id,
    c.name as category_name,
    sd.subcategory_id,
    sc.name as subcategory_name,
    sd.version,
    sd.is_template,
    sd.template_id,
    sd.created_at,
    sd.updated_at,
    sd.approved_at,
    sd.next_review_date,
    sd.archived_at,
    sd.created_by,
    sd.updated_by,
    (
      SELECT json_build_object(
        'version_number', version_number,
        'content', content,
        'created_at', created_at,
        'created_by', created_by,
        'change_summary', change_summary
      )
      FROM sop_document_versions
      WHERE document_id = p_document_id
      ORDER BY version_number DESC
      LIMIT 1
    ) as current_version,
    (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'approver_id', approver_id,
          'approver_role', approver_role,
          'status', status,
          'created_at', created_at,
          'approved_at', approved_at,
          'rejected_at', rejected_at,
          'comment', comment
        )
      )
      FROM sop_document_approvals
      WHERE document_id = p_document_id
    ) as approvals,
    (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'file_name', file_name,
          'file_type', file_type,
          'file_size', file_size,
          'created_at', created_at
        )
      )
      FROM sop_document_attachments
      WHERE document_id = p_document_id
    ) as attachments,
    (
      SELECT json_agg(
        json_build_object(
          'id', rd.related_document_id,
          'title', rd.title,
          'code', rd.code,
          'relation_type', sdr.relation_type
        )
      )
      FROM sop_document_relations sdr
      JOIN sop_documents rd ON sdr.related_document_id = rd.id
      WHERE sdr.document_id = p_document_id
    ) as related_documents
  FROM sop_documents sd
  LEFT JOIN departments d ON sd.department_id = d.id
  LEFT JOIN sop_categories c ON sd.category_id = c.id
  LEFT JOIN sop_categories sc ON sd.subcategory_id = sc.id
  WHERE sd.id = p_document_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_sop_summary_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION create_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION update_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION approve_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION reject_sop_document TO authenticated;
GRANT EXECUTE ON FUNCTION search_sop_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_sop_document_details(UUID) TO authenticated;
