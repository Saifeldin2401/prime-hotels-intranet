-- Data integrity: employee_id was nullable on both HR record tables, so a
-- promotion or transfer could be created belonging to nobody. Surfaced while
-- testing process_due_promotions, which then attempted to insert a NULL
-- user_id into user_roles. Both tables are currently empty (0 rows), so
-- enforcing NOT NULL is non-destructive.
ALTER TABLE public.employee_promotions ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE public.employee_transfers  ALTER COLUMN employee_id SET NOT NULL;
