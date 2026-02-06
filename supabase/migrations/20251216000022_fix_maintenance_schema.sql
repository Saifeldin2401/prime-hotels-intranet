-- Fix Maintenance Tickets Schema (2025-12-16)

-- 1. Rename location to room_number (assuming it stores room info)
ALTER TABLE maintenance_tickets 
RENAME COLUMN location TO room_number;

-- 2. Add missing columns required by Frontend/Types
ALTER TABLE maintenance_tickets
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC,
ADD COLUMN IF NOT EXISTS material_cost NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS parts_needed TEXT,
ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMPTZ;

-- 3. Add index for department_id
CREATE INDEX IF NOT EXISTS idx_maintenance_department_id ON public.maintenance_tickets (department_id);

-- 4. Enable RLS on new columns (implicitly covered by table RLS, but policies might need check)
-- Existing policies use 'department_id' for department_head access, so adding this column enables that logic to actually work!
