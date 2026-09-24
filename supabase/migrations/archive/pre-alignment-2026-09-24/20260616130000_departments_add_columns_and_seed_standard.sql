-- The departments table was empty (no rows) so the UI showed nothing, and the
-- useDepartments hook wrote name_ar/manager_id columns that did not exist
-- (the source of the "persistent 400 Bad Request" the hook comment referenced).
-- 1) Align schema with code (bilingual name + department manager).
-- 2) Seed the standard department set for every active property.

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Seed standard departments for each active property (skip any that already exist).
INSERT INTO public.departments (property_id, name, is_active)
SELECT p.id, d.name, true
FROM public.properties p
CROSS JOIN (VALUES
  ('Front Office'),
  ('Housekeeping'),
  ('Food & Beverage'),
  ('Kitchen / Culinary'),
  ('Engineering & Maintenance'),
  ('Security'),
  ('Sales & Marketing'),
  ('Human Resources'),
  ('Finance / Accounting'),
  ('IT'),
  ('Executive Office'),
  ('Spa & Recreation'),
  ('Concierge'),
  ('Reservations')
) AS d(name)
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.departments x
    WHERE x.property_id = p.id AND x.name = d.name
  );
