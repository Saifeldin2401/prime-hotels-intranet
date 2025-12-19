-- Migration: Organizational Hierarchy Validation & Query Functions
-- Purpose: Prevent circular reporting chains and provide hierarchy query capabilities
-- Date: 2025-12-19

-- ============================================================================
-- 1. CIRCULAR REPORTING PREVENTION
-- ============================================================================

-- Function to check for circular reporting chains
CREATE OR REPLACE FUNCTION check_circular_reporting()
RETURNS TRIGGER AS $$
DECLARE
  current_manager UUID;
  depth INT := 0;
  max_depth INT := 20; -- Prevent infinite loops
BEGIN
  -- Allow NULL reporting_to (top-level employees)
  IF NEW.reporting_to IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  -- Prevent self-reporting
  IF NEW.reporting_to = NEW.id THEN
    RAISE EXCEPTION 'Employee cannot report to themselves';
  END IF;
  
  -- Walk up the chain to detect cycles
  current_manager := NEW.reporting_to;
  WHILE current_manager IS NOT NULL AND depth < max_depth LOOP
    -- If we find the employee in their own reporting chain, it's circular
    IF current_manager = NEW.id THEN
      RAISE EXCEPTION 'Circular reporting chain detected: This change would create a loop in the reporting hierarchy';
    END IF;
    
    -- Move up to next manager
    SELECT reporting_to INTO current_manager 
    FROM profiles 
    WHERE id = current_manager;
    
    depth := depth + 1;
  END LOOP;
  
  -- If we exceeded max depth, warn but allow
  IF depth >= max_depth THEN
    RAISE WARNING 'Reporting chain exceeds % levels - please review hierarchy', max_depth;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate reporting changes
DROP TRIGGER IF EXISTS validate_reporting_chain ON profiles;
CREATE TRIGGER validate_reporting_chain
  BEFORE INSERT OR UPDATE OF reporting_to ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_reporting();

-- ============================================================================
-- 2. HIERARCHY QUERY FUNCTION (Recursive CTE)
-- ============================================================================

-- Function to get organizational hierarchy as a flat tree
CREATE OR REPLACE FUNCTION get_org_hierarchy(
  p_root_user_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  job_title TEXT,
  email TEXT,
  reporting_to UUID,
  manager_name TEXT,
  depth INT,
  path UUID[],
  path_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    -- Base case: top-level employees (no manager) or specific root
    SELECT 
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      NULL::TEXT as manager_name,
      0 as depth,
      ARRAY[p.id] as path,
      ARRAY[p.full_name] as path_names
    FROM profiles p
    LEFT JOIN user_properties up ON up.user_id = p.id
    WHERE p.is_active = true
      AND (
        CASE 
          WHEN p_root_user_id IS NOT NULL THEN p.id = p_root_user_id
          ELSE p.reporting_to IS NULL
        END
      )
      AND (p_property_id IS NULL OR up.property_id = p_property_id)
    
    UNION ALL
    
    -- Recursive case: employees who report to someone in the hierarchy
    SELECT 
      p.id,
      p.full_name,
      p.job_title,
      p.email,
      p.reporting_to,
      h.full_name as manager_name,
      h.depth + 1,
      h.path || p.id,
      h.path_names || p.full_name
    FROM profiles p
    JOIN hierarchy h ON p.reporting_to = h.id
    WHERE p.is_active = true
      AND NOT p.id = ANY(h.path)  -- Prevent cycles
      AND h.depth < 20  -- Max depth safety
  )
  SELECT * FROM hierarchy
  ORDER BY path;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. HELPER FUNCTION: Get direct reports
-- ============================================================================

CREATE OR REPLACE FUNCTION get_direct_reports(p_manager_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  job_title TEXT,
  email TEXT
) AS $$
  SELECT p.id, p.full_name, p.job_title, p.email
  FROM profiles p
  WHERE p.reporting_to = p_manager_id
    AND p.is_active = true
  ORDER BY p.full_name;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 4. HELPER FUNCTION: Get reporting chain (path to top)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_reporting_chain(p_employee_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  job_title TEXT,
  level INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain AS (
    SELECT p.id, p.full_name, p.job_title, p.reporting_to, 0 as level
    FROM profiles p
    WHERE p.id = p_employee_id
    
    UNION ALL
    
    SELECT p.id, p.full_name, p.job_title, p.reporting_to, c.level + 1
    FROM profiles p
    JOIN chain c ON p.id = c.reporting_to
    WHERE c.level < 20
  )
  SELECT chain.id, chain.full_name, chain.job_title, chain.level
  FROM chain
  ORDER BY chain.level;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_org_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION get_direct_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_reporting_chain TO authenticated;

-- ============================================================================
-- 6. ADD AUDIT TRIGGER FOR REPORTING_TO CHANGES
-- ============================================================================

-- Ensure reporting_to changes are logged to audit_logs
-- (This leverages the existing log_audit_event trigger if already on profiles)

-- Check if audit trigger exists, if not, add it for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_profiles_changes' 
    AND tgrelid = 'profiles'::regclass
  ) THEN
    CREATE TRIGGER audit_profiles_changes
      AFTER INSERT OR UPDATE OR DELETE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_event();
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
