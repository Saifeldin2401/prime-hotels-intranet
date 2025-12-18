-- Seed Onboarding Templates

-- 1. General Staff Onboarding (Fallback for everyone)
INSERT INTO public.onboarding_templates (title, role, tasks, is_active)
VALUES (
    'General Hotel Orientation',
    'staff',
    '[
        {
            "title": "Submit Employee ID Documents",
            "description": "Upload a copy of your National ID/Passport and Social Security card to the HR portal.",
            "assignee_role": "self",
            "due_day_offset": 1
        },
        {
            "title": "Read Employee Handbook",
            "description": "Review the company policies, code of conduct, and safety guidelines. Sign the acknowledgement form.",
            "assignee_role": "self",
            "due_day_offset": 2
        },
        {
            "title": "Pick up Uniform & Name Tag",
            "description": "Visit the Uniform Room in the basement (B1) to get measured and receive your uniform.",
            "assignee_role": "self",
            "due_day_offset": 3
        },
        {
            "title": "Assign Mentor / Buddy",
            "description": "Assign a senior staff member to guide the new hire for their first 2 weeks.",
            "assignee_role": "manager",
            "due_day_offset": 5
        },
        {
            "title": "Setup Email & System Access",
            "description": "Create company email and grant access to PRIME Connect and ShiftPlanner.",
            "assignee_role": "it",
            "due_day_offset": 0
        }
    ]'::jsonb,
    true
);

-- 2. Front Office Onboarding (Department Specific - requires department_id lookup, but for seed we use role ''staff'' and handle department logic in real app, 
-- or we can insert if we knew the UUIDs. For this seed, let''s make a Role-based one for Department Heads which is also distinct.)

-- 2. Front Desk Agent (Specific Role-based if we had that granularity, but let''s use ''front_desk'' if it existed. 
-- Since we only have broad roles, let''s make a "Department Head" onboarding.)

INSERT INTO public.onboarding_templates (title, role, tasks, is_active)
VALUES (
    'Department Head Leadership Track',
    'department_head',
    '[
        {
            "title": "Leadership Team Introduction",
            "description": "Schedule a lunch meeting with the General Manager and other Department Heads.",
            "assignee_role": "self",
            "due_day_offset": 7
        },
        {
            "title": "Budget & P&L Training",
            "description": "Complete the Finance module regarding department budget management and reporting.",
            "assignee_role": "self",
            "due_day_offset": 14
        },
        {
            "title": "Review Department KPI Goals",
            "description": "Set quarterly targets for the department with the GM.",
            "assignee_role": "manager",
            "due_day_offset": 10
        }
    ]'::jsonb,
    true
);

-- 3. Housekeeping Safety (Conceptually linked to Housekeeping Department)
-- We''ll insert this without a specific ID for now, but in a real scenario, we''d update this with the real Housekeeping Dept UUID.
-- For now, let''s add a generic "Safety & Hygiene" template that helps everyone.
INSERT INTO public.onboarding_templates (title, role, tasks, is_active)
VALUES (
    'Safety & Hygiene Standards',
    'staff',
    '[
        {
            "title": "Chemical Safety (COSHH) Training",
            "description": "Complete the online module on safe handling of cleaning chemicals.",
            "assignee_role": "self",
            "due_day_offset": 3
        },
        {
            "title": "Fire Evacuation Drill",
            "description": "Participate in a guided walk-through of fire exits and assembly points.",
            "assignee_role": "manager",
            "due_day_offset": 3
        }
    ]'::jsonb,
    true
);
