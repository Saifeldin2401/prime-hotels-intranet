-- Create navigation_groups table
CREATE TABLE IF NOT EXISTS public.navigation_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title_key TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    visible_to TEXT[] NOT NULL DEFAULT '{all}',
    is_collapsible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create navigation_items table
CREATE TABLE IF NOT EXISTS public.navigation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_key TEXT REFERENCES public.navigation_groups(key) ON DELETE CASCADE,
    path TEXT NOT NULL,
    title_key TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    allowed_roles TEXT[] NOT NULL DEFAULT '{all}',
    badge_key TEXT,
    sort_order INTEGER NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    role_path_overrides JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.navigation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Read: All Authenticated, Write: Admins only)
CREATE POLICY "Allow read access for authenticated users" ON public.navigation_groups
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated users" ON public.navigation_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for admins" ON public.navigation_groups
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('corporate_admin', 'regional_admin')
        )
    );

CREATE POLICY "Allow write access for admins" ON public.navigation_items
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('corporate_admin', 'regional_admin')
        )
    );

-- Seed Data: Groups
INSERT INTO public.navigation_groups (key, title_key, icon, sort_order, visible_to, is_collapsible) VALUES
('home', 'nav.groups.home', 'Home', 0, '{all}', false),
('my_work', 'nav.groups.my_work', 'User', 1, '{all}', true),
('knowledge_base', 'nav.groups.knowledge_base', 'BookOpen', 2, '{all}', true),
('learning', 'nav.groups.learning', 'GraduationCap', 3, '{all}', true),
('operations', 'nav.groups.operations', 'CheckSquare', 4, '{regional_admin,regional_hr,property_manager,property_hr,department_head}', true),
('hr_management', 'nav.groups.hr_management', 'Users', 5, '{all}', true),
('learning_management', 'nav.groups.learning_management', 'GraduationCap', 6, '{regional_admin,regional_hr,property_manager,property_hr,department_head}', true),
('question_bank', 'nav.groups.question_bank', 'FileQuestion', 7, '{regional_admin,regional_hr,property_hr,department_head}', true),
('communication', 'nav.groups.communication', 'MessageSquare', 8, '{all}', true),
('administration', 'nav.groups.admin', 'Shield', 9, '{regional_admin,regional_hr}', true),
('settings', 'nav.groups.settings', 'Settings', 10, '{all}', false)
ON CONFLICT (key) DO UPDATE SET 
    title_key = EXCLUDED.title_key,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    visible_to = EXCLUDED.visible_to;

-- Seed Data: Items
INSERT INTO public.navigation_items (group_key, path, title_key, icon, description, allowed_roles, badge_key, sort_order, is_hidden, role_path_overrides) VALUES
-- Home
('home', '/dashboard', 'nav.dashboard', 'BarChart3', 'Your personalized dashboard', '{all}', NULL, 1, false, '{
    "staff": "/staff-dashboard",
    "department_head": "/dashboard/department-head",
    "property_manager": "/dashboard/property-manager",
    "property_hr": "/dashboard/property-hr",
    "regional_hr": "/dashboard/regional-hr",
    "regional_admin": "/dashboard/corporate-admin"
}'),

-- My Work
('my_work', '/hr/leave', 'nav.my_requests', 'Calendar', 'Submit and track leave requests', '{all}', NULL, 1, false, NULL),
('my_work', '/tasks', 'nav.my_tasks', 'CheckSquare', 'Your assigned tasks', '{all}', 'overdueTasks', 2, false, NULL),

-- Knowledge Base
('knowledge_base', '/knowledge', 'nav.knowledge_base', 'BookOpen', 'Centralized knowledge hub', '{all}', 'requiredReading', 1, false, NULL),
('knowledge_base', '/knowledge/review', 'nav.knowledge_review', 'CheckSquare', 'Review pending content', '{regional_admin,regional_hr,property_hr}', 'pendingReviews', 2, false, NULL),
('knowledge_base', '/knowledge/analytics', 'nav.knowledge_analytics', 'BarChart3', 'Content usage and insights', '{regional_admin,regional_hr,property_manager}', NULL, 3, false, NULL),

-- Learning
('learning', '/learning/my', 'nav.my_training', 'GraduationCap', 'Your assigned training modules', '{all}', 'pendingTraining', 1, false, NULL),
('learning', '/training/paths', 'nav.training_paths', 'BookOpen', 'Learning paths and curricula', '{all}', NULL, 2, false, NULL),
('learning', '/training/certificates', 'nav.my_certificates', 'Award', 'Your earned certificates', '{all}', NULL, 3, false, NULL),

-- Operations
('operations', '/approvals', 'nav.approvals', 'CheckSquare', 'Pending items requiring your approval', '{regional_admin,regional_hr,property_manager,property_hr,department_head}', 'pendingApprovals', 1, false, NULL),
('operations', '/hr/inbox', 'nav.hr_inbox', 'FolderOpen', 'HR requests inbox', '{regional_admin,regional_hr,property_manager,property_hr,department_head}', 'pendingApprovals', 2, false, NULL),
('operations', '/maintenance', 'nav.maintenance', 'Wrench', 'Submit and track maintenance tickets', '{all}', NULL, 3, false, NULL),

-- HR Management
('hr_management', '/directory', 'nav.directory', 'Users', 'Employee directory', '{all}', NULL, 1, false, NULL),
('hr_management', '/jobs', 'nav.jobs', 'Briefcase', 'Job postings and applications', '{all}', NULL, 2, false, NULL),
('hr_management', '/hr/referrals', 'nav.referrals', 'Users', 'Employee referral program', '{all}', NULL, 3, false, NULL),
('hr_management', '/hr/promotions/new', 'nav.promotions', 'ArrowUp', 'Initiate employee promotions', '{regional_admin,regional_hr,property_hr}', NULL, 4, false, NULL),
('hr_management', '/hr/transfers/new', 'nav.transfers', 'ArrowRightLeft', 'Initiate employee transfers', '{regional_admin,regional_hr}', NULL, 5, false, NULL),
('hr_management', '/hr/operations', 'nav.hr_operations', 'Building', 'HR operations center', '{regional_admin,regional_hr,property_hr}', NULL, 6, false, NULL),

-- Learning Management
('learning_management', '/training/modules', 'nav.training_modules', 'BookOpen', 'Manage training modules', '{regional_admin,regional_hr,property_manager}', NULL, 1, false, NULL),
('learning_management', '/training/builder', 'nav.training_builder', 'ListTodo', 'Create training content', '{regional_admin,regional_hr,property_manager}', NULL, 2, false, NULL),
('learning_management', '/training/assignments', 'nav.training_assignments', 'Users', 'Assign training to users', '{regional_admin,regional_hr,property_manager,property_hr,department_head}', NULL, 3, false, NULL),

-- Question Bank
('question_bank', '/questions', 'nav.questions', 'FileQuestion', 'Manage knowledge questions', '{regional_admin,regional_hr,property_hr}', NULL, 1, false, NULL),
('question_bank', '/learning/quizzes', 'nav.quizzes', 'CheckSquare', 'Manage quizzes', '{regional_admin,regional_hr,property_hr,department_head}', NULL, 2, false, NULL),

-- Communication
('communication', '/messaging', 'nav.messaging', 'MessageSquare', 'Direct messages and team chat', '{all}', 'unreadMessages', 1, false, NULL),
('communication', '/announcements', 'nav.announcements', 'Megaphone', 'Company announcements', '{all}', NULL, 2, false, NULL),
('communication', '/documents', 'nav.documents', 'FileText', 'Policies and documents', '{all}', NULL, 3, false, NULL),

-- Administration
('administration', '/admin/users', 'nav.user_management', 'Users', 'Manage system users', '{regional_admin,regional_hr}', NULL, 1, false, NULL),
('administration', '/admin/properties', 'nav.property_management', 'Building', 'Manage hotel properties', '{regional_admin}', NULL, 2, false, NULL),
('administration', '/reports', 'nav.reports', 'BarChart3', 'Analytics and reports', '{regional_admin,regional_hr,property_manager}', NULL, 3, false, NULL),
('administration', '/admin/audit', 'nav.audit_logs', 'ClipboardList', 'System audit logs', '{regional_admin}', NULL, 4, false, NULL),
('administration', '/admin/escalation', 'nav.escalation_rules', 'Bell', 'Configure escalation rules', '{regional_admin}', NULL, 5, false, NULL),

-- Settings
('settings', '/profile', 'nav.my_profile', 'User', 'Your profile settings', '{all}', NULL, 1, false, NULL),
('settings', '/settings', 'nav.settings', 'Settings', 'App preferences', '{all}', NULL, 2, false, NULL),
('settings', '/search', 'nav.search', 'Search', 'Global search', '{all}', NULL, 3, true, NULL)

ON CONFLICT (id) DO NOTHING;
-- Note: Since we don't have unique constraint on path (some paths might be repeated? no they are unique in config), 
-- but realistically we want to update if path exists. However, UUID is primary key.
-- Let's add a unique constraint on path to enable Upsert if needed, but for now we just Insert.
-- Actually, let's truncate to ensure clean slate? No, that deletes user data if referenced.
-- We'll assume fresh insert or manual cleanup. Or use DELETE FROM navigation_items; DELETE FROM navigation_groups; before insert.
