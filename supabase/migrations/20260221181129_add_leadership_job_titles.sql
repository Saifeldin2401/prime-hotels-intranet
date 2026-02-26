-- Add leadership job titles used by admin bulk creation list
-- Avoid fuzzy-matching to unrelated titles by ensuring exact titles exist

insert into public.job_titles (title, category, default_role, department_id)
values
  ('CEO & Chairman', 'Corporate Management', 'regional_admin', null),
  ('Chairmember', 'Corporate Management', 'regional_admin', null),
  ('Group Director Of Finance', 'Finance', 'regional_admin', null),
  ('Director Of F&B', 'Food & Beverage', 'regional_admin', null),
  ('Jeddah Operation Leader', 'Management', 'property_manager', null),
  ('Riyadh Front Office Leader', 'Front Office', 'department_head', null),
  ('Jeddah Sales Manager', 'Sales & Marketing', 'department_head', null),
  ('Riyadh Sales Manager', 'Sales & Marketing', 'department_head', null)
on conflict (title) do nothing;
;
