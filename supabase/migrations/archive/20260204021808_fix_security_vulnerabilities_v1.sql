-- 1. Fix view_staff_directory to be SECURITY INVOKER
DROP VIEW IF EXISTS public.view_staff_directory;
CREATE VIEW public.view_staff_directory WITH (security_invoker = true) AS
SELECT 
    p.full_name,
    p.email,
    p.job_title,
    d.name AS department_name,
    prop.name AS property_name
FROM profiles p
LEFT JOIN job_titles jt ON p.job_title = jt.title
LEFT JOIN departments d ON jt.department_id = d.id
LEFT JOIN properties prop ON d.property_id = prop.id
WHERE p.full_name IS NOT NULL;

-- 2. Fix training_module_resources strict RLS
ALTER TABLE public.training_module_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_module_resources_select" ON public.training_module_resources;
DROP POLICY IF EXISTS "training_module_resources_insert" ON public.training_module_resources;
DROP POLICY IF EXISTS "training_module_resources_update" ON public.training_module_resources;
DROP POLICY IF EXISTS "training_module_resources_delete" ON public.training_module_resources;

-- Allow read access to all authenticated users
CREATE POLICY "training_module_resources_select"
ON public.training_module_resources
FOR SELECT
TO authenticated
USING (true);

-- Allow manage access only to Admins/Managers
CREATE POLICY "training_module_resources_manage"
ON public.training_module_resources
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'regional_admin') OR 
  has_role(auth.uid(), 'regional_hr') OR 
  has_role(auth.uid(), 'property_manager') OR
  has_role(auth.uid(), 'property_hr') OR
  has_role(auth.uid(), 'department_manager')
);;
