BEGIN;

-- Ensure ready training content templates exist and are active (idempotent).

UPDATE training_content_templates
SET is_active = true
WHERE name IN (
    'Front Office: Check-in & Checkout',
    'Housekeeping: Room Turnover SOP',
    'Food & Beverage: Food Safety & Hygiene',
    'Engineering: Preventive Maintenance Walkthrough',
    'Security: Incident Response & Reporting',
    'Guest Relations: Complaint Recovery',
    'HR: New Hire Onboarding Essentials',
    'Finance: Cash Handling & Night Audit',
    'IT: Cybersecurity Awareness',
    'Emergency: Fire & Evacuation Procedures'
) AND is_active IS DISTINCT FROM true;

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Front Office: Check-in & Checkout',
    'Complete workflow for arrivals and departures with exceptions and service recovery.',
    'skill',
    '{
        "sections": [
            {
                "title": "Overview & Objectives",
                "description": "Set expectations and outcomes.",
                "items": [
                    { "type": "text", "title": "Learning objectives", "content": "List 3-5 outcomes for this module.", "duration": 5 }
                ]
            },
            {
                "title": "Pre-Arrival Preparation",
                "description": "Confirm reservations and readiness.",
                "items": [
                    { "type": "text", "title": "Reservation checks", "content": "Outline verification steps, VIP flags, and special requests.", "duration": 6 },
                    { "type": "document_link", "title": "Pre-arrival checklist", "content": "Attach the checklist or SOP PDF.", "duration": 4 }
                ]
            },
            {
                "title": "Check-in Procedure",
                "description": "Standard guest arrival flow.",
                "items": [
                    { "type": "text", "title": "Step-by-step process", "content": "Provide the standard greeting, ID, payment, and key issuance steps.", "duration": 8 },
                    { "type": "video", "title": "System walkthrough", "content": "Add a PMS walkthrough video link.", "duration": 6 }
                ]
            },
            {
                "title": "Checkout & Exceptions",
                "description": "Payments, late checkout, disputes.",
                "items": [
                    { "type": "text", "title": "Checkout process", "content": "Describe express checkout, folio review, and feedback capture.", "duration": 6 },
                    { "type": "text", "title": "Exceptions handling", "content": "List policies for late checkout, disputes, and refunds.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate understanding.",
                "items": [
                    { "type": "quiz", "title": "Check-in/Checkout Quiz", "content": "Link or create a quiz for this module.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Front Office: Check-in & Checkout'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Housekeeping: Room Turnover SOP',
    'Standard room cleaning and inspection flow with quality checkpoints.',
    'skill',
    '{
        "sections": [
            {
                "title": "Standards Overview",
                "description": "Room readiness criteria.",
                "items": [
                    { "type": "text", "title": "Quality standards", "content": "Define clean-room criteria and presentation standards.", "duration": 5 }
                ]
            },
            {
                "title": "Turnover Workflow",
                "description": "Step-by-step cleaning sequence.",
                "items": [
                    { "type": "text", "title": "Cleaning steps", "content": "List tasks in order: strip, sanitize, restock, reset.", "duration": 10 },
                    { "type": "image", "title": "Amenity setup guide", "content": "Add visual guide images for setup standards.", "duration": 5 }
                ]
            },
            {
                "title": "Safety & Chemicals",
                "description": "Handling and PPE.",
                "items": [
                    { "type": "text", "title": "Chemical safety", "content": "Describe PPE, dilution, and storage rules.", "duration": 6 },
                    { "type": "sop_reference", "title": "MSDS/chemical SOP", "content": "Link to MSDS or policy reference.", "duration": 4 }
                ]
            },
            {
                "title": "Inspection & Handover",
                "description": "Final checks and reporting.",
                "items": [
                    { "type": "text", "title": "Inspection checklist", "content": "Document final inspection steps and defect reporting.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm SOP comprehension.",
                "items": [
                    { "type": "quiz", "title": "Housekeeping SOP Quiz", "content": "Select a quiz from the question bank.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Housekeeping: Room Turnover SOP'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Food & Beverage: Food Safety & Hygiene',
    'Food handling, hygiene, storage, and HACCP controls.',
    'safety',
    '{
        "sections": [
            {
                "title": "Overview & Regulations",
                "description": "Local compliance and standards.",
                "items": [
                    { "type": "text", "title": "Regulatory overview", "content": "Summarize HACCP and local health authority rules.", "duration": 6 }
                ]
            },
            {
                "title": "Personal Hygiene",
                "description": "Handwashing, PPE, illness policy.",
                "items": [
                    { "type": "text", "title": "Hygiene standards", "content": "Define handwashing, glove use, and illness reporting.", "duration": 7 },
                    { "type": "video", "title": "Handwashing demo", "content": "Add a short training video.", "duration": 4 }
                ]
            },
            {
                "title": "Storage & Temperature",
                "description": "Receiving, labeling, and monitoring.",
                "items": [
                    { "type": "text", "title": "Storage rules", "content": "Explain FIFO, labeling, and temperature logs.", "duration": 7 },
                    { "type": "document_link", "title": "Temperature log sheet", "content": "Attach the official log sheet.", "duration": 4 }
                ]
            },
            {
                "title": "Cross-Contamination Control",
                "description": "Prevent risks.",
                "items": [
                    { "type": "text", "title": "Separation practices", "content": "Describe prep area separation and cleaning schedules.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate understanding.",
                "items": [
                    { "type": "quiz", "title": "Food Safety Quiz", "content": "Select or generate a quiz for staff.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Food & Beverage: Food Safety & Hygiene'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Engineering: Preventive Maintenance Walkthrough',
    'Routine checks, escalation, and documentation standards for engineering teams.',
    'skill',
    '{
        "sections": [
            {
                "title": "Scope & Objectives",
                "description": "What this maintenance covers.",
                "items": [
                    { "type": "text", "title": "Overview", "content": "Define assets, frequency, and service levels.", "duration": 5 }
                ]
            },
            {
                "title": "Pre-Check Requirements",
                "description": "Safety and tools.",
                "items": [
                    { "type": "text", "title": "Safety prep", "content": "List lockout/tagout, PPE, and tool checks.", "duration": 6 }
                ]
            },
            {
                "title": "Maintenance Steps",
                "description": "Step-by-step inspection.",
                "items": [
                    { "type": "text", "title": "Inspection workflow", "content": "Detail inspection points and acceptance criteria.", "duration": 10 },
                    { "type": "image", "title": "Inspection photos", "content": "Add sample photos or diagrams.", "duration": 5 }
                ]
            },
            {
                "title": "Reporting & Escalation",
                "description": "Logging and follow-up.",
                "items": [
                    { "type": "text", "title": "Documentation", "content": "Explain how to log work orders and escalate risks.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm comprehension.",
                "items": [
                    { "type": "quiz", "title": "Maintenance SOP Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Engineering: Preventive Maintenance Walkthrough'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Security: Incident Response & Reporting',
    'Incident classification, response steps, and reporting templates for security staff.',
    'safety',
    '{
        "sections": [
            {
                "title": "Incident Types",
                "description": "Recognize and classify incidents.",
                "items": [
                    { "type": "text", "title": "Classification", "content": "List common incident types and severity levels.", "duration": 6 }
                ]
            },
            {
                "title": "Immediate Response",
                "description": "Safety first actions.",
                "items": [
                    { "type": "text", "title": "Response checklist", "content": "Outline response steps, communication, and escalation.", "duration": 8 }
                ]
            },
            {
                "title": "Reporting",
                "description": "Documentation standards.",
                "items": [
                    { "type": "document_link", "title": "Incident report form", "content": "Attach or link the standard report form.", "duration": 4 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate readiness.",
                "items": [
                    { "type": "quiz", "title": "Security Response Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Security: Incident Response & Reporting'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Guest Relations: Complaint Recovery',
    'Service recovery steps and communication framework for guest complaints.',
    'skill',
    '{
        "sections": [
            {
                "title": "Service Recovery Overview",
                "description": "Principles and tone.",
                "items": [
                    { "type": "text", "title": "Recovery pillars", "content": "Define listen, empathize, resolve, follow-up.", "duration": 6 }
                ]
            },
            {
                "title": "On-the-Spot Resolution",
                "description": "Immediate actions.",
                "items": [
                    { "type": "text", "title": "Resolution playbook", "content": "List common issues and approved resolutions.", "duration": 8 }
                ]
            },
            {
                "title": "Escalations",
                "description": "When to escalate.",
                "items": [
                    { "type": "text", "title": "Escalation thresholds", "content": "Define handoff criteria and reporting.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm understanding.",
                "items": [
                    { "type": "quiz", "title": "Complaint Recovery Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Guest Relations: Complaint Recovery'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'HR: New Hire Onboarding Essentials',
    'Mandatory onboarding topics, policies, and compliance tasks for new hires.',
    'onboarding',
    '{
        "sections": [
            {
                "title": "Welcome & Orientation",
                "description": "Company overview and culture.",
                "items": [
                    { "type": "text", "title": "Company overview", "content": "Summarize mission, values, and expectations.", "duration": 6 }
                ]
            },
            {
                "title": "Policies & Compliance",
                "description": "Key policies.",
                "items": [
                    { "type": "text", "title": "Core policies", "content": "Outline attendance, conduct, and safety policies.", "duration": 8 },
                    { "type": "document_link", "title": "Employee handbook", "content": "Attach the handbook PDF.", "duration": 4 }
                ]
            },
            {
                "title": "Role Readiness",
                "description": "Department-specific setup.",
                "items": [
                    { "type": "text", "title": "Role overview", "content": "Define primary responsibilities and success metrics.", "duration": 6 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm onboarding completion.",
                "items": [
                    { "type": "quiz", "title": "Onboarding Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'HR: New Hire Onboarding Essentials'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Finance: Cash Handling & Night Audit',
    'Cash handling, deposit procedures, and night audit reconciliation steps.',
    'policy',
    '{
        "sections": [
            {
                "title": "Cash Handling Standards",
                "description": "Rules and controls.",
                "items": [
                    { "type": "text", "title": "Cash control", "content": "Outline drawer setup, limits, and approvals.", "duration": 6 }
                ]
            },
            {
                "title": "Daily Deposits",
                "description": "Deposit process.",
                "items": [
                    { "type": "text", "title": "Deposit workflow", "content": "Describe deposit counting, slips, and secure storage.", "duration": 7 }
                ]
            },
            {
                "title": "Night Audit",
                "description": "Reconciliation steps.",
                "items": [
                    { "type": "text", "title": "Audit checklist", "content": "List reconciliation steps and reporting timelines.", "duration": 8 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Validate comprehension.",
                "items": [
                    { "type": "quiz", "title": "Finance SOP Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Finance: Cash Handling & Night Audit'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'IT: Cybersecurity Awareness',
    'Password hygiene, phishing detection, and data handling basics for staff.',
    'policy',
    '{
        "sections": [
            {
                "title": "Threat Overview",
                "description": "Common hotel attack vectors.",
                "items": [
                    { "type": "text", "title": "Threat types", "content": "Summarize phishing, malware, and credential theft.", "duration": 6 }
                ]
            },
            {
                "title": "Password & Access",
                "description": "Safe access practices.",
                "items": [
                    { "type": "text", "title": "Password rules", "content": "Define strong password and MFA requirements.", "duration": 6 }
                ]
            },
            {
                "title": "Phishing Response",
                "description": "Spot and report.",
                "items": [
                    { "type": "text", "title": "Phishing checklist", "content": "List indicators and reporting steps.", "duration": 7 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm awareness.",
                "items": [
                    { "type": "quiz", "title": "Cybersecurity Quiz", "content": "Select or create a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'IT: Cybersecurity Awareness'
);

INSERT INTO training_content_templates (name, description, category, template_structure, is_active)
SELECT
    'Emergency: Fire & Evacuation Procedures',
    'Emergency response roles, evacuation routes, and guest safety steps.',
    'safety',
    '{
        "sections": [
            {
                "title": "Emergency Response Basics",
                "description": "Roles and responsibilities.",
                "items": [
                    { "type": "text", "title": "Safety overview", "content": "Summarize emergency responsibilities and roles.", "duration": 6 }
                ]
            },
            {
                "title": "Alarm Response",
                "description": "Immediate actions.",
                "items": [
                    { "type": "text", "title": "Initial response", "content": "Define alarm response and communication steps.", "duration": 6 }
                ]
            },
            {
                "title": "Evacuation",
                "description": "Route and assembly procedures.",
                "items": [
                    { "type": "text", "title": "Evacuation routes", "content": "Provide route maps and assembly point guidance.", "duration": 8 },
                    { "type": "image", "title": "Evacuation map", "content": "Attach evacuation map images.", "duration": 4 }
                ]
            },
            {
                "title": "Post-Incident",
                "description": "Headcount and reporting.",
                "items": [
                    { "type": "text", "title": "Post-incident steps", "content": "Explain headcount, reporting, and debrief.", "duration": 5 }
                ]
            },
            {
                "title": "Knowledge Check",
                "description": "Confirm readiness.",
                "items": [
                    { "type": "quiz", "title": "Fire Safety Quiz", "content": "Select a quiz.", "duration": 5 }
                ]
            }
        ]
    }'::jsonb,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM training_content_templates WHERE name = 'Emergency: Fire & Evacuation Procedures'
);

COMMIT;
