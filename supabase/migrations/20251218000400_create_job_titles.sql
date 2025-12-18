-- Create job_titles table
CREATE TABLE IF NOT EXISTS public.job_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    default_role public.app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" 
ON public.job_titles FOR SELECT 
TO authenticated 
USING (true);

-- Allow manage access to admins (if needed later, ensuring no lock-out)
CREATE POLICY "Allow manage access for admins" 
ON public.job_titles FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
    )
);

-- Seed data from existing list
INSERT INTO public.job_titles (title, role, category) VALUES
('Front Desk Agent', 'staff', 'Front Office'),
('Guest Service Agent', 'staff', 'Front Office'),
('Night Auditor', 'staff', 'Front Office'),
('Bellman', 'staff', 'Front Office'),
('Concierge', 'staff', 'Front Office'),
('Door Attendant', 'staff', 'Front Office'),
('Valet Attendant', 'staff', 'Front Office'),
('Room Attendant', 'staff', 'Housekeeping'),
('Housekeeping Attendant', 'staff', 'Housekeeping'),
('Laundry Attendant', 'staff', 'Housekeeping'),
('Public Area Attendant', 'staff', 'Housekeeping'),
('Linen Attendant', 'staff', 'Housekeeping'),
('Server', 'staff', 'Food & Beverage'),
('Waiter', 'staff', 'Food & Beverage'),
('Waitress', 'staff', 'Food & Beverage'),
('Bartender', 'staff', 'Food & Beverage'),
('Barista', 'staff', 'Food & Beverage'),
('Kitchen Steward', 'staff', 'Food & Beverage'),
('Commis Chef', 'staff', 'Food & Beverage'),
('Demi Chef', 'staff', 'Food & Beverage'),
('Room Service Attendant', 'staff', 'Food & Beverage'),
('Maintenance Technician', 'staff', 'Engineering'),
('Engineering Attendant', 'staff', 'Engineering'),
('HVAC Technician', 'staff', 'Engineering'),
('Electrician', 'staff', 'Engineering'),
('Plumber', 'staff', 'Engineering'),
('Sales Coordinator', 'staff', 'Sales & Marketing'),
('Reservations Agent', 'staff', 'Sales & Marketing'),
('Marketing Coordinator', 'staff', 'Sales & Marketing'),
('Front Office Supervisor', 'department_head', 'Front Office'),
('Assistant Front Office Manager', 'department_head', 'Front Office'),
('Front Office Manager', 'department_head', 'Front Office'),
('Guest Relations Manager', 'department_head', 'Front Office'),
('Front Desk Manager', 'department_head', 'Front Office'),
('Housekeeping Supervisor', 'department_head', 'Housekeeping'),
('Assistant Executive Housekeeper', 'department_head', 'Housekeeping'),
('Executive Housekeeper', 'department_head', 'Housekeeping'),
('Laundry Manager', 'department_head', 'Housekeeping'),
('Restaurant Supervisor', 'department_head', 'Food & Beverage'),
('Restaurant Manager', 'department_head', 'Food & Beverage'),
('Food & Beverage Manager', 'department_head', 'Food & Beverage'),
('F&B Manager', 'department_head', 'Food & Beverage'),
('Executive Chef', 'department_head', 'Food & Beverage'),
('Sous Chef', 'department_head', 'Food & Beverage'),
('Chef de Partie', 'department_head', 'Food & Beverage'),
('Banquet Manager', 'department_head', 'Food & Beverage'),
('Bar Manager', 'department_head', 'Food & Beverage'),
('Pastry Chef', 'department_head', 'Food & Beverage'),
('Chief Engineer', 'department_head', 'Engineering'),
('Maintenance Manager', 'department_head', 'Engineering'),
('Assistant Chief Engineer', 'department_head', 'Engineering'),
('Engineering Manager', 'department_head', 'Engineering'),
('Sales Manager', 'department_head', 'Sales & Marketing'),
('Revenue Manager', 'department_head', 'Sales & Marketing'),
('Director of Sales', 'department_head', 'Sales & Marketing'),
('Marketing Manager', 'department_head', 'Sales & Marketing'),
('Security Manager', 'department_head', 'Security'),
('Recreation Manager', 'department_head', 'Recreation'),
('Spa Manager', 'department_head', 'Spa'),
('Fitness Manager', 'department_head', 'Recreation'),
('Conference Manager', 'department_head', 'Conference'),
('Purchasing Manager', 'department_head', 'Purchasing'),
('IT Manager', 'department_head', 'Information Technology'),
('HR Coordinator', 'property_hr', 'Human Resources'),
('HR Officer', 'property_hr', 'Human Resources'),
('Property HR Manager', 'property_hr', 'Human Resources'),
('Cluster HR Manager', 'property_hr', 'Human Resources'),
('Learning & Development Coordinator', 'property_hr', 'Human Resources'),
('HR Manager', 'property_hr', 'Human Resources'),
('Talent Acquisition Manager', 'property_hr', 'Human Resources'),
('General Manager', 'property_manager', 'Management'),
('Hotel Manager', 'property_manager', 'Management'),
('Resident Manager', 'property_manager', 'Management'),
('Assistant General Manager', 'property_manager', 'Management'),
('Operations Manager', 'property_manager', 'Management'),
('Corporate HR Manager', 'regional_hr', 'Corporate HR'),
('Regional HR Manager', 'regional_hr', 'Corporate HR'),
('HR Director', 'regional_hr', 'Corporate HR'),
('Corporate Learning & Development Manager', 'regional_hr', 'Corporate HR'),
('Corporate Talent Acquisition Manager', 'regional_hr', 'Corporate HR'),
('VP of Human Resources', 'regional_hr', 'Corporate HR'),
('Director of Human Resources', 'regional_hr', 'Corporate HR'),
('Area General Manager', 'regional_admin', 'Corporate Management'),
('Regional Director', 'regional_admin', 'Corporate Management'),
('Vice President of Operations', 'regional_admin', 'Corporate Management'),
('Director of Operations', 'regional_admin', 'Corporate Management'),
('Corporate Operations Manager', 'regional_admin', 'Corporate Management'),
('Chief Operating Officer', 'regional_admin', 'Corporate Management'),
('VP Operations', 'regional_admin', 'Corporate Management'),
('Regional VP', 'regional_admin', 'Corporate Management')
ON CONFLICT (title) DO NOTHING;
